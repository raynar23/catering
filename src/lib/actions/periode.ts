"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  periodSchema,
  gantiVendorSchema,
  PeriodFormInput,
  GantiVendorInput,
} from "@/lib/validations/periode";
import { parseVendorContact } from "@/lib/actions/vendor";
import { getMonthRange } from "@/lib/date";
import { revalidatePath } from "next/cache";

export interface PeriodListItem {
  id: string;
  tanggal: string;
  shift_id: string;
  shift_nama: string;
  shift_label: string;
  shift_jam_mulai: string;
  shift_jam_selesai: string;
  shift_urutan: number;
  vendor_id: string;
  vendor_kode: string;
  vendor_nama: string;
  vendor_kontak: string;
  total_porsi: number;
  diupdate_oleh: string | null;
  status: string;
  respon_vendor: string;
  progres_vendor: string;
  keterangan: string | null;
}

export interface PeriodFilter {
  year?: number;
  month?: number;
  shift_id?: string;
  vendor_id?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// Fetch period list with relations, order status, and total portions
export async function getPeriodList(
  filter: PeriodFilter = {}
): Promise<{ data: PeriodListItem[]; total: number }> {
  const supabase = await createClient();

  const now = new Date();
  const year = filter.year ?? now.getFullYear();
  const month = filter.month ?? now.getMonth() + 1;
  const { start, end } = getMonthRange(year, month);

  // Attempt using v_periode_ringkas view
  const { data: viewData, count: viewCount, error: viewError } = await supabase
    .from("v_periode_ringkas")
    .select("*", { count: "exact" })
    .gte("tanggal", start)
    .lte("tanggal", end)
    .order("tanggal", { ascending: false })
    .order("shift_urutan", { ascending: true });

  if (!viewError && viewData) {
    let filtered = viewData;

    if (filter.shift_id) {
      filtered = filtered.filter((p) => p.shift_id === filter.shift_id);
    }
    if (filter.vendor_id) {
      filtered = filtered.filter((p) => p.vendor_id === filter.vendor_id);
    }
    if (filter.status && filter.status !== "all") {
      filtered = filtered.filter((p) => p.status === filter.status);
    }
    if (filter.search && filter.search.trim()) {
      const s = filter.search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.shift_nama.toLowerCase().includes(s) ||
          p.vendor_nama.toLowerCase().includes(s) ||
          p.vendor_kode.toLowerCase().includes(s)
      );
    }

    const records: PeriodListItem[] = await Promise.all(
      filtered.map(async (row) => {
        const contact = await parseVendorContact(row.vendor_kontak);
        return {
          id: row.period_id,
          tanggal: row.tanggal,
          shift_id: row.shift_id,
          shift_nama: row.shift_nama,
          shift_label: row.shift_label,
          shift_jam_mulai: row.shift_jam_mulai,
          shift_jam_selesai: row.shift_jam_selesai,
          shift_urutan: row.shift_urutan,
          vendor_id: row.vendor_id,
          vendor_kode: row.vendor_kode,
          vendor_nama: row.vendor_nama,
          vendor_kontak: contact.no_wa || contact.no_telp || "",
          total_porsi: row.total_porsi,
          diupdate_oleh: row.diupdate_oleh,
          status: row.status,
          respon_vendor: row.respon_vendor,
          progres_vendor: row.progres_vendor,
          keterangan: row.period_keterangan,
        };
      })
    );

    return { data: records, total: viewCount ?? records.length };
  }

  // Fallback to table joins if view is pending execution on remote DB
  const { data: rawPeriods, count: rawCount, error: rawError } = await supabase
    .from("periods")
    .select(
      `
      id,
      tanggal,
      shift_id,
      vendor_id,
      keterangan,
      shifts (id, nama, label, jam_mulai, jam_selesai, urutan),
      vendors (id, kode, nama, kontak),
      catering_orders (
        id,
        status,
        respon_vendor,
        progres_vendor,
        submitted_by,
        profiles:submitted_by (nama),
        catering_items (porsi)
      )
    `,
      { count: "exact" }
    )
    .gte("tanggal", start)
    .lte("tanggal", end)
    .order("tanggal", { ascending: false });

  if (rawError || !rawPeriods) {
    return { data: [], total: 0 };
  }

interface RawPeriodRow {
  id: string;
  tanggal: string;
  shift_id: string;
  vendor_id: string;
  keterangan: string | null;
  shifts: {
    id: string;
    nama: string;
    label: string;
    jam_mulai: string;
    jam_selesai: string;
    urutan: number;
  } | null;
  vendors: {
    id: string;
    kode: string;
    nama: string;
    kontak: string | null;
  } | null;
  catering_orders: {
    id: string;
    status: string;
    respon_vendor: string;
    progres_vendor: string;
    submitted_by: string | null;
    profiles: { nama: string } | null;
    catering_items: { porsi: number }[];
  }[] | null;
}

  const mapped: PeriodListItem[] = await Promise.all(
    (rawPeriods as unknown as RawPeriodRow[]).map(async (p) => {
      const shift = p.shifts;
      const vendor = p.vendors;
      const order = Array.isArray(p.catering_orders) ? p.catering_orders[0] : p.catering_orders;
      const contact = await parseVendorContact(vendor?.kontak ?? null);

      let totalPorsi = 0;
      if (order && order.catering_items) {
        for (const item of order.catering_items) {
          totalPorsi += item.porsi || 0;
        }
      }

      return {
        id: p.id,
        tanggal: p.tanggal,
        shift_id: p.shift_id,
        shift_nama: shift?.nama ?? "-",
        shift_label: shift?.label ?? "-",
        shift_jam_mulai: shift?.jam_mulai ?? "00:00:00",
        shift_jam_selesai: shift?.jam_selesai ?? "00:00:00",
        shift_urutan: shift?.urutan ?? 0,
        vendor_id: p.vendor_id,
        vendor_kode: vendor?.kode ?? "-",
        vendor_nama: vendor?.nama ?? "-",
        vendor_kontak: contact.no_wa || contact.no_telp || "",
        total_porsi: totalPorsi,
        diupdate_oleh: order?.profiles?.nama ?? null,
        status: order?.status ?? "belum_input",
        respon_vendor: order?.respon_vendor ?? "menunggu",
        progres_vendor: order?.progres_vendor ?? "menunggu",
        keterangan: p.keterangan,
      };
    })
  );

  mapped.sort((a, b) => {
    if (a.tanggal !== b.tanggal) {
      return b.tanggal.localeCompare(a.tanggal);
    }
    return a.shift_urutan - b.shift_urutan;
  });

  return { data: mapped, total: rawCount ?? mapped.length };
}

// Create or update a catering period record
export async function savePeriodAction(
  input: PeriodFormInput,
  id?: string
): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak mengelola jadwal periode" };
  }

  const parsed = periodSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validasi data periode gagal",
    };
  }

  const supabase = await createClient();
  const val = parsed.data;

  // Check unique date and shift combination
  const { data: existing } = await supabase
    .from("periods")
    .select("id")
    .eq("tanggal", val.tanggal)
    .eq("shift_id", val.shift_id)
    .maybeSingle();

  if (existing && (!id || existing.id !== id)) {
    return {
      success: false,
      error: "Jadwal untuk tanggal dan shift tersebut sudah terdaftar di sistem",
    };
  }

  const payload = {
    tanggal: val.tanggal,
    shift_id: val.shift_id,
    vendor_id: val.vendor_id,
    keterangan: val.keterangan || null,
  };

  if (id) {
    const { error } = await supabase.from("periods").update(payload).eq("id", id);
    if (error) {
      return { success: false, error: "Gagal memperbarui jadwal periode" };
    }
    revalidatePath("/admin/periode");
    revalidatePath("/admin/master/periode");
    return { success: true, message: "Jadwal periode berhasil diperbarui" };
  } else {
    const { error } = await supabase.from("periods").insert(payload);
    if (error) {
      return { success: false, error: "Gagal menambahkan jadwal periode baru" };
    }
    revalidatePath("/admin/periode");
    revalidatePath("/admin/master/periode");
    return { success: true, message: "Jadwal periode baru berhasil ditambahkan" };
  }
}

// Delete period record (only if no catering order has been placed)
export async function deletePeriodAction(id: string): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak menghapus periode" };
  }

  const supabase = await createClient();

  const { data: order } = await supabase
    .from("catering_orders")
    .select("id, status")
    .eq("period_id", id)
    .maybeSingle();

  if (order) {
    return {
      success: false,
      error: "Periode ini sudah memiliki data pesanan catering dan tidak dapat dihapus.",
    };
  }

  const { error } = await supabase.from("periods").delete().eq("id", id);
  if (error) {
    return { success: false, error: "Gagal menghapus periode jadwal" };
  }

  revalidatePath("/admin/periode");
  revalidatePath("/admin/master/periode");
  return { success: true, message: "Jadwal periode berhasil dihapus" };
}

// Replace assigned vendor for a period via atomic RPC
export async function gantiVendorAction(input: GantiVendorInput): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak mengganti vendor periode" };
  }

  const parsed = gantiVendorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validasi data ganti vendor gagal",
    };
  }

  const supabase = await createClient();
  const val = parsed.data;

  const { error } = await supabase.rpc("ganti_vendor_periode", {
    p_period_id: val.period_id,
    p_vendor_baru_id: val.vendor_baru_id,
    p_alasan: val.alasan,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Gagal mengganti vendor periode",
    };
  }

  revalidatePath("/admin/periode");
  revalidatePath("/admin/master/periode");
  return { success: true, message: "Vendor periode berhasil diganti dan dicatat di riwayat" };
}

// Delete multiple selected periods and their dependent transactions via atomic RPC
export async function deleteSelectedPeriodsAction(ids: string[]): Promise<ActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Hanya Admin GA yang berhak menghapus data periode" };
  }

  if (!ids || ids.length === 0) {
    return { success: false, error: "Tidak ada jadwal periode yang dipilih" };
  }

  const supabase = await createClient();

  const { data: rpcRes, error: rpcErr } = await supabase.rpc("delete_selected_periods", {
    p_period_ids: ids,
  });

  if (!rpcErr && rpcRes) {
    revalidatePath("/admin/periode");
    revalidatePath("/admin/master/periode");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/rekapitulasi");
    return {
      success: true,
      message: (rpcRes as { message?: string })?.message ?? `${ids.length} jadwal periode berhasil dihapus`,
    };
  }

  const { error: delErr } = await supabase.from("periods").delete().in("id", ids);
  if (delErr) {
    return {
      success: false,
      error: delErr.message.includes("foreign key") || delErr.message.includes("restrict")
        ? "Sebagian periode memiliki pesanan terkait. Jalankan dummy_data_dashboard.sql di Supabase SQL Editor untuk mengaktifkan penghapusan menyeluruh."
        : "Gagal menghapus data periode terpilih",
    };
  }

  revalidatePath("/admin/periode");
  revalidatePath("/admin/master/periode");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/rekapitulasi");
  return { success: true, message: `${ids.length} jadwal periode berhasil dihapus` };
}

