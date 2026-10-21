"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { bagianSchema, BagianFormInput } from "@/lib/validations/bagian";
import { revalidatePath } from "next/cache";

export interface BagianRecord {
  id: string;
  kode: string | null;
  nama: string;
  kelompok: string | null;
  lokasi_antar: string | null;
  alias: string | null;
  keterangan: string | null;
  urutan: number;
  aktif: boolean;
  created_at: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  canDeactivate?: boolean;
  data?: T;
}

// Fetch paginated and searched department list directly from database
export async function getBagianList(
  search = "",
  page = 1,
  pageSize = 50
): Promise<{ data: BagianRecord[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("bagian")
    .select("*", { count: "exact" });

  const trimmed = search.trim();
  if (trimmed) {
    query = query.or(
      `nama.ilike.%${trimmed}%,kode.ilike.%${trimmed}%,kelompok.ilike.%${trimmed}%,lokasi_antar.ilike.%${trimmed}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("urutan", { ascending: true })
    .order("nama", { ascending: true })
    .range(from, to);

  if (error) {
    return { data: [], total: 0 };
  }

  return {
    data: (data as BagianRecord[]) ?? [],
    total: count ?? 0,
  };
}

// Create or update Bagian with Admin GA role authorization
export async function saveBagianAction(
  input: BagianFormInput,
  id?: string
): Promise<ActionResult<BagianRecord>> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak mengelola data bagian" };
  }

  const parsed = bagianSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validasi data bagian gagal",
    };
  }

  const supabase = await createClient();
  const val = parsed.data;

  // Check unique name case-insensitively
  const { data: existingName } = await supabase
    .from("bagian")
    .select("id, nama")
    .ilike("nama", val.nama)
    .maybeSingle();

  if (existingName && (!id || existingName.id !== id)) {
    return { success: false, error: "Nama bagian sudah digunakan oleh bagian lain" };
  }

  const aliasFormatted = Array.isArray(val.alias)
    ? val.alias.filter(Boolean).join(", ")
    : val.alias ?? null;

  const combinedKeterangan = val.catatan_antar
    ? val.keterangan
      ? `Catatan Antar: ${val.catatan_antar} | ${val.keterangan}`
      : `Catatan Antar: ${val.catatan_antar}`
    : val.keterangan ?? null;

  const payload = {
    nama: val.nama,
    kode: val.kode || null,
    kelompok: val.kelompok || null,
    lokasi_antar: val.lokasi_antar || null,
    alias: aliasFormatted,
    keterangan: combinedKeterangan,
    urutan: val.urutan,
    aktif: val.aktif,
  };

  if (id) {
    const { data: updated, error } = await supabase
      .from("bagian")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, error: "Gagal memperbarui data bagian" };
    }

    revalidatePath("/admin/master/bagian");
    revalidatePath("/admin/data-bagian");
    return { success: true, message: "Data bagian berhasil diperbarui", data: updated as BagianRecord };
  } else {
    const { data: inserted, error } = await supabase
      .from("bagian")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: "Gagal menambahkan data bagian baru" };
    }

    revalidatePath("/admin/master/bagian");
    revalidatePath("/admin/data-bagian");
    return { success: true, message: "Data bagian berhasil ditambahkan", data: inserted as BagianRecord };
  }
}

// Delete Bagian with foreign key guard and friendly deactivation option
export async function deleteBagianAction(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak menghapus data bagian" };
  }

  const supabase = await createClient();

  // Check if transactions reference this bagian
  const { count: itemsCount } = await supabase
    .from("catering_items")
    .select("*", { count: "exact", head: true })
    .eq("bagian_id", id);

  if (itemsCount && itemsCount > 0) {
    return {
      success: false,
      canDeactivate: true,
      error: "Data bagian tidak dapat dihapus karena sudah memiliki riwayat pesanan catering. Silakan nonaktifkan bagian ini.",
    };
  }

  const { error } = await supabase.from("bagian").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        success: false,
        canDeactivate: true,
        error: "Data bagian masih terhubung dengan data lain di sistem. Silakan nonaktifkan bagian ini.",
      };
    }
    return { success: false, error: "Gagal menghapus data bagian" };
  }

  revalidatePath("/admin/master/bagian");
  revalidatePath("/admin/data-bagian");
  return { success: true, message: "Data bagian berhasil dihapus" };
}

// Toggle Bagian active status
export async function toggleBagianStatusAction(id: string, aktif: boolean): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak mengubah status bagian" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bagian")
    .update({ aktif })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Gagal mengubah status bagian" };
  }

  revalidatePath("/admin/master/bagian");
  revalidatePath("/admin/data-bagian");
  return {
    success: true,
    message: `Bagian berhasil diubah statusnya menjadi ${aktif ? "Aktif" : "Nonaktif"}`,
  };
}
