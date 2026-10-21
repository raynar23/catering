"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { shiftSchema, ShiftFormInput } from "@/lib/validations/shift";
import { Shift } from "@/lib/types";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// Fetch all work shifts ordered by rotation sequence
export async function getShiftList(): Promise<Shift[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .order("urutan", { ascending: true });

  if (error || !data) {
    return [];
  }
  return data as Shift[];
}

// Create or update Shift master record
export async function saveShiftAction(
  input: ShiftFormInput,
  id?: string
): Promise<ActionResult<Shift>> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak mengelola data shift" };
  }

  const parsed = shiftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validasi data shift gagal",
    };
  }

  const supabase = await createClient();
  const val = parsed.data;

  // Check unique shift name
  const { data: existingName } = await supabase
    .from("shifts")
    .select("id, nama")
    .ilike("nama", val.nama)
    .maybeSingle();

  if (existingName && (!id || existingName.id !== id)) {
    return { success: false, error: "Nama shift sudah digunakan" };
  }

  const payload = {
    nama: val.nama,
    label: val.label,
    alias: val.alias,
    jam_mulai: val.jam_mulai.replace(".", ":"),
    jam_selesai: val.jam_selesai.replace(".", ":"),
    batas_tiba: val.batas_tiba.replace(".", ":"),
    urutan: val.urutan,
    urutan_laporan: val.urutan_laporan,
    keterangan: val.keterangan || null,
    aktif: val.aktif,
  };

  if (id) {
    const { data: updated, error } = await supabase
      .from("shifts")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, error: "Gagal memperbarui shift" };
    }

    revalidatePath("/admin/periode");
    revalidatePath("/admin/master/periode");
    return { success: true, message: "Shift berhasil diperbarui", data: updated as Shift };
  } else {
    const { data: inserted, error } = await supabase
      .from("shifts")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: "Gagal menambahkan shift baru" };
    }

    revalidatePath("/admin/periode");
    revalidatePath("/admin/master/periode");
    return { success: true, message: "Shift baru berhasil ditambahkan", data: inserted as Shift };
  }
}

// Toggle Shift active status
export async function toggleShiftStatusAction(id: string, aktif: boolean): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak mengubah status shift" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({ aktif })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Gagal mengubah status shift" };
  }

  revalidatePath("/admin/periode");
  revalidatePath("/admin/master/periode");
  return {
    success: true,
    message: `Shift berhasil ${aktif ? "diaktifkan" : "dinonaktifkan"}`,
  };
}
