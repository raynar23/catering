"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { vendorSchema, VendorFormInput } from "@/lib/validations/vendor";
import { revalidatePath } from "next/cache";

export interface VendorRecord {
  id: string;
  kode: string;
  nama: string;
  nama_kontak: string;
  no_wa: string;
  no_telp: string;
  alamat: string | null;
  urutan_rotasi: number;
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

// Extract contact person, WhatsApp, and phone numbers from dedicated columns or legacy JSON/string
export async function parseVendorContact(
  kontakRaw: string | null,
  vendorRecord?: { nama_kontak?: string | null; no_wa?: string | null; no_telp?: string | null }
) {
  if (vendorRecord && (vendorRecord.nama_kontak || vendorRecord.no_wa || vendorRecord.no_telp)) {
    return {
      nama_kontak: vendorRecord.nama_kontak ?? "",
      no_wa: vendorRecord.no_wa ?? "",
      no_telp: vendorRecord.no_telp ?? "",
    };
  }
  if (!kontakRaw) return { nama_kontak: "", no_wa: "", no_telp: "" };
  try {
    if (kontakRaw.trim().startsWith("{")) {
      const parsed = JSON.parse(kontakRaw);
      return {
        nama_kontak: parsed.nama_kontak ?? "",
        no_wa: parsed.no_wa ?? "",
        no_telp: parsed.no_telp ?? "",
      };
    }
  } catch {
    // Non-JSON format fallback
  }
  return { nama_kontak: "", no_wa: kontakRaw, no_telp: kontakRaw };
}

// Generate next sequential vendor code (e.g. V006)
export async function getNextVendorCode(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("vendors").select("kode");

  let maxNum = 0;
  if (data) {
    for (const v of data) {
      const match = v.kode.match(/^V(\d+)$/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `V${String(nextNum).padStart(3, "0")}`;
}

// Fetch paginated and searched vendor list with parsed contact attributes
export async function getVendorList(
  search = "",
  page = 1,
  pageSize = 50
): Promise<{ data: VendorRecord[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("vendors")
    .select("*", { count: "exact" });

  const trimmed = search.trim();
  if (trimmed) {
    query = query.or(
      `nama.ilike.%${trimmed}%,kode.ilike.%${trimmed}%,alamat.ilike.%${trimmed}%,kontak.ilike.%${trimmed}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await query
    .order("urutan_rotasi", { ascending: true })
    .order("kode", { ascending: true })
    .range(from, to);

  if (error || !data) {
    return { data: [], total: 0 };
  }

  const records: VendorRecord[] = await Promise.all(
    data.map(async (row) => {
      const contact = await parseVendorContact(row.kontak);
      return {
        id: row.id,
        kode: row.kode,
        nama: row.nama,
        nama_kontak: contact.nama_kontak,
        no_wa: contact.no_wa,
        no_telp: contact.no_telp,
        alamat: row.alamat,
        urutan_rotasi: row.urutan_rotasi,
        aktif: row.aktif,
        created_at: row.created_at,
      };
    })
  );

  return {
    data: records,
    total: count ?? 0,
  };
}

// Create or update Vendor with unique stripped name and auto code validation
export async function saveVendorAction(
  input: VendorFormInput,
  id?: string
): Promise<ActionResult<VendorRecord>> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak mengelola data vendor" };
  }

  const parsed = vendorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validasi data vendor gagal",
    };
  }

  const supabase = await createClient();
  const val = parsed.data;

  // Check unique code
  const { data: existingCode } = await supabase
    .from("vendors")
    .select("id, kode")
    .eq("kode", val.kode)
    .maybeSingle();

  if (existingCode && (!id || existingCode.id !== id)) {
    return { success: false, error: `Kode vendor ${val.kode} sudah digunakan` };
  }

  // Check unique name without case or spaces
  const targetNormalized = val.nama.toLowerCase().replace(/\s+/g, "");
  const { data: allVendors } = await supabase.from("vendors").select("id, nama");

  if (allVendors) {
    const isDuplicate = allVendors.some(
      (v) =>
        (!id || v.id !== id) &&
        v.nama.toLowerCase().replace(/\s+/g, "") === targetNormalized
    );

    if (isDuplicate) {
      return {
        success: false,
        error: "Nama vendor sudah terdaftar (nama harus unik)",
      };
    }
  }

  const contactJson = JSON.stringify({
    nama_kontak: val.nama_kontak || "",
    no_wa: val.no_wa || "",
    no_telp: val.no_telp || "",
  });

  const payload = {
    kode: val.kode,
    nama: val.nama,
    kontak: contactJson,
    alamat: val.alamat || null,
    urutan_rotasi: val.urutan_rotasi,
    aktif: val.aktif,
  };

  if (id) {
    const { data: updated, error } = await supabase
      .from("vendors")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, error: "Gagal memperbarui data vendor" };
    }

    revalidatePath("/admin/master/vendor");
    revalidatePath("/admin/data-vendor");
    const contact = await parseVendorContact(updated.kontak);
    return {
      success: true,
      message: "Data vendor berhasil diperbarui",
      data: { ...updated, ...contact },
    };
  } else {
    const { data: inserted, error } = await supabase
      .from("vendors")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: "Gagal menambahkan vendor baru" };
    }

    revalidatePath("/admin/master/vendor");
    revalidatePath("/admin/data-vendor");
    const contact = await parseVendorContact(inserted.kontak);
    return {
      success: true,
      message: "Data vendor berhasil ditambahkan",
      data: { ...inserted, ...contact },
    };
  }
}

// Delete Vendor with transaction existence validation
export async function deleteVendorAction(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak menghapus data vendor" };
  }

  const supabase = await createClient();

  // Check if orders or periods reference this vendor
  const { count: orderCount } = await supabase
    .from("catering_orders")
    .select("*", { count: "exact", head: true })
    .eq("vendor_id", id);

  if (orderCount && orderCount > 0) {
    return {
      success: false,
      canDeactivate: true,
      error: "Data vendor tidak dapat dihapus karena sudah memiliki riwayat pesanan catering. Silakan nonaktifkan vendor ini.",
    };
  }

  const { count: periodCount } = await supabase
    .from("periods")
    .select("*", { count: "exact", head: true })
    .eq("vendor_id", id);

  if (periodCount && periodCount > 0) {
    return {
      success: false,
      canDeactivate: true,
      error: "Data vendor sudah terdaftar pada jadwal periode catering. Silakan nonaktifkan vendor ini.",
    };
  }

  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        success: false,
        canDeactivate: true,
        error: "Data vendor masih terkait dengan transaksi lain di sistem. Silakan nonaktifkan vendor ini.",
      };
    }
    return { success: false, error: "Gagal menghapus data vendor" };
  }

  revalidatePath("/admin/master/vendor");
  revalidatePath("/admin/data-vendor");
  return { success: true, message: "Data vendor berhasil dihapus" };
}

// Toggle Vendor active status
export async function toggleVendorStatusAction(id: string, aktif: boolean): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak mengubah status vendor" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update({ aktif })
    .eq("id", id);

  if (error) {
    return { success: false, error: "Gagal mengubah status vendor" };
  }

  revalidatePath("/admin/master/vendor");
  revalidatePath("/admin/data-vendor");
  return {
    success: true,
    message: `Vendor berhasil diubah statusnya menjadi ${aktif ? "Aktif" : "Nonaktif"}`,
  };
}
