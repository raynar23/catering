"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface VerificationRevisionItem {
  id: string;
  itemId: string;
  orderId: string;
  periodId: string;
  tanggal: string;
  shiftNama: string;
  shiftLabel: string;
  vendorId: string;
  vendorKode: string;
  vendorNama: string;
  vendorTelp: string;
  bagianId: string;
  bagianNama: string;
  bagianKode: string;
  karyawanAwal: number;
  karyawanBaru: number;
  porsiAwal: number;
  porsiBaru: number;
  selisihPorsi: number;
  alasan: string;
  status: string;
  responVendor: string;
  catatanVendor: string | null;
  diajukanOlehNama: string;
  diajukanAt: string;
  diverifikasiOlehNama: string | null;
  diverifikasiAt: string | null;
  catatanVerifikator: string | null;
}

export interface VendorResponseItem {
  periodId: string;
  orderId: string;
  tanggal: string;
  shiftNama: string;
  shiftLabel: string;
  shiftJam: string;
  vendorId: string;
  vendorKode: string;
  vendorNama: string;
  vendorTelp: string;
  vendorKontak: string;
  totalPorsi: number;
  responVendor: string;
  catatanVendor: string | null;
  responVendorAt: string | null;
  status: string;
}

export interface ChronologyLogItem {
  id: string;
  aksi: string;
  jumlahAwal: number | null;
  selisih: number | null;
  jumlahBaru: number | null;
  keterangan: string | null;
  bagianNama: string | null;
  olehNama: string;
  olehRole: string;
  createdAt: string;
}

export interface OrderChronologyResult {
  orderId: string;
  periodId: string;
  tanggal: string;
  shiftNama: string;
  shiftLabel: string;
  shiftJam: string;
  vendorKode: string;
  vendorNama: string;
  vendorTelp: string;
  vendorKontak: string;
  status: string;
  responVendor: string;
  progresVendor: string;
  totalPorsi: number;
  logs: ChronologyLogItem[];
}

// Submit revision for a specific catering item
export async function ajukanRevisiAction(params: {
  itemId: string;
  karyawanBaru: number;
  porsiBaru: number;
  alasan: string;
}): Promise<ActionResult<{ revisionId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return {
      success: false,
      error: "Akses ditolak: Hanya Admin GA yang berhak mengajukan revisi.",
    };
  }

  const { itemId, karyawanBaru, porsiBaru, alasan } = params;

  if (!alasan || !alasan.trim()) {
    return {
      success: false,
      error: "Alasan revisi wajib diisi.",
    };
  }

  if (karyawanBaru < 0 || porsiBaru < 0) {
    return {
      success: false,
      error: "Jumlah karyawan dan porsi tidak boleh bernilai negatif.",
    };
  }

  const supabase = await createClient();

  const { data: revId, error: rpcErr } = await supabase.rpc("ajukan_revisi", {
    p_item_id: itemId,
    p_karyawan_baru: Math.floor(karyawanBaru),
    p_porsi_baru: Math.floor(porsiBaru),
    p_alasan: alasan.trim(),
  });

  if (rpcErr) {
    console.error("ajukan_revisi error:", rpcErr);
    return {
      success: false,
      error: rpcErr.message || "Gagal mengajukan revisi porsi.",
    };
  }

  revalidatePath("/admin/input");
  revalidatePath("/admin/input-catering");
  revalidatePath("/admin/verifikasi");
  revalidatePath("/admin/riwayat");
  revalidatePath("/admin/rekapitulasi");

  return {
    success: true,
    message: "Pengajuan revisi porsi berhasil dikirim.",
    data: { revisionId: revId as string },
  };
}

// Verify (approve or reject) a pending revision
export async function verifikasiRevisiAction(params: {
  revisionId: string;
  setuju: boolean;
  catatan?: string;
}): Promise<ActionResult<{ revisionId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return {
      success: false,
      error: "Akses ditolak: Hanya Admin GA yang berhak memverifikasi revisi.",
    };
  }

  const { revisionId, setuju, catatan } = params;

  if (!setuju && (!catatan || !catatan.trim())) {
    return {
      success: false,
      error: "Catatan penolakan wajib diisi saat membatalkan revisi.",
    };
  }

  const supabase = await createClient();

  const { data: resId, error: rpcErr } = await supabase.rpc(
    "verifikasi_revisi",
    {
      p_revision_id: revisionId,
      p_setuju: setuju,
      p_catatan: catatan?.trim() || null,
    }
  );

  if (rpcErr) {
    console.error("verifikasi_revisi error:", rpcErr);
    return {
      success: false,
      error: rpcErr.message || "Gagal memproses verifikasi revisi.",
    };
  }

  revalidatePath("/admin/input");
  revalidatePath("/admin/input-catering");
  revalidatePath("/admin/verifikasi");
  revalidatePath("/admin/riwayat");
  revalidatePath("/admin/rekapitulasi");

  return {
    success: true,
    message: setuju
      ? "Revisi kuota berhasil disetujui."
      : "Pengajuan revisi telah dibatalkan.",
    data: { revisionId: resId as string },
  };
}

// Get count of pending revisions for sidebar badge
export async function getPendingRevisionsCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("revisions")
    .select("*", { count: "exact", head: true })
    .eq("status", "menunggu");

  if (error) {
    console.error("Failed to fetch pending revisions count:", error);
    return 0;
  }

  return count || 0;
}

interface RawRevisionQueryResult {
  id: string;
  item_id: string;
  karyawan_awal: number;
  karyawan_baru: number;
  porsi_awal: number;
  porsi_baru: number;
  selisih_porsi: number;
  alasan: string;
  status: string;
  respon_vendor: string;
  catatan_vendor: string | null;
  diajukan_at: string;
  diverifikasi_at: string | null;
  catatan_verifikator: string | null;
  diajukan_profile?: { nama: string } | null;
  diverifikasi_profile?: { nama: string } | null;
  item?: {
    id: string;
    order_id: string;
    bagian?: { id: string; kode: string; nama: string } | null;
    order?: {
      id: string;
      period_id: string;
      period?: {
        id: string;
        tanggal: string;
        shift?: { id: string; nama: string; label: string } | null;
        vendor?: { id: string; kode: string; nama: string; telp: string; kontak: string } | null;
      } | null;
    } | null;
  } | null;
}

interface RawVendorResponseQueryResult {
  id: string;
  period_id: string;
  status: string;
  respon_vendor: string;
  catatan_vendor: string | null;
  respon_vendor_at: string | null;
  updated_at: string;
  period?: {
    id: string;
    tanggal: string;
    shift?: { id: string; nama: string; label: string; jam_mulai: string; jam_selesai: string } | null;
    vendor?: { id: string; kode: string; nama: string; telp: string; kontak: string } | null;
  } | null;
  items?: { jumlah_porsi: number }[] | null;
}

interface RawOrderChronologyQueryResult {
  id: string;
  period_id: string;
  status: string;
  respon_vendor: string;
  progres_vendor: string;
  period?: {
    id: string;
    tanggal: string;
    shift?: { nama: string; label: string; jam_mulai: string; jam_selesai: string } | null;
    vendor?: { kode: string; nama: string; telp: string; kontak: string } | null;
  } | null;
  items?: { jumlah_porsi: number }[] | null;
}

interface RawOrderLogQueryResult {
  id: string;
  aksi: string;
  jumlah_awal: number | null;
  selisih: number | null;
  jumlah_baru: number | null;
  keterangan: string | null;
  created_at: string;
  profile?: { nama: string; role: string } | null;
  item?: {
    bagian?: { nama: string } | null;
  } | null;
}

// Get all revisions list for verification table
export async function getVerificationRevisionsList(): Promise<
  VerificationRevisionItem[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("revisions")
    .select(
      `
      id,
      item_id,
      karyawan_awal,
      karyawan_baru,
      porsi_awal,
      porsi_baru,
      selisih_porsi,
      alasan,
      status,
      respon_vendor,
      catatan_vendor,
      diajukan_at,
      diverifikasi_at,
      catatan_verifikator,
      diajukan_profile:profiles!revisions_diajukan_oleh_fkey (nama),
      diverifikasi_profile:profiles!revisions_diverifikasi_oleh_fkey (nama),
      item:catering_items!revisions_item_id_fkey (
        id,
        order_id,
        bagian:bagian (id, kode, nama),
        order:catering_orders (
          id,
          period_id,
          period:periods (
            id,
            tanggal,
            shift:shifts (id, nama, label),
            vendor:vendors (id, kode, nama, telp, kontak)
          )
        )
      )
    `
    )
    .order("diajukan_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch verification revisions:", error);
    return [];
  }

  return ((data as unknown as RawRevisionQueryResult[]) || []).map((r) => {
    const item = r.item;
    const bagian = item?.bagian;
    const order = item?.order;
    const period = order?.period;
    const shift = period?.shift;
    const vendor = period?.vendor;

    return {
      id: r.id,
      itemId: r.item_id,
      orderId: order?.id || "",
      periodId: period?.id || "",
      tanggal: period?.tanggal || "",
      shiftNama: shift?.nama || "",
      shiftLabel: shift?.label || "",
      vendorId: vendor?.id || "",
      vendorKode: vendor?.kode || "",
      vendorNama: vendor?.nama || "",
      vendorTelp: vendor?.telp || "",
      bagianId: bagian?.id || "",
      bagianNama: bagian?.nama || "",
      bagianKode: bagian?.kode || "",
      karyawanAwal: r.karyawan_awal,
      karyawanBaru: r.karyawan_baru,
      porsiAwal: r.porsi_awal,
      porsiBaru: r.porsi_baru,
      selisihPorsi: r.selisih_porsi,
      alasan: r.alasan,
      status: r.status,
      responVendor: r.respon_vendor,
      catatanVendor: r.catatan_vendor,
      diajukanOlehNama: r.diajukan_profile?.nama || "Admin",
      diajukanAt: r.diajukan_at,
      diverifikasiOlehNama: r.diverifikasi_profile?.nama || null,
      diverifikasiAt: r.diverifikasi_at || null,
      catatanVerifikator: r.catatan_verifikator || null,
    };
  });
}

// Get vendor rejection follow-up list
export async function getVendorResponseFollowUpList(): Promise<
  VendorResponseItem[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("catering_orders")
    .select(
      `
      id,
      period_id,
      status,
      respon_vendor,
      catatan_vendor,
      respon_vendor_at,
      updated_at,
      period:periods (
        id,
        tanggal,
        shift:shifts (id, nama, label, jam_mulai, jam_selesai),
        vendor:vendors (id, kode, nama, telp, kontak)
      ),
      items:catering_items (
        jumlah_porsi
      )
    `
    )
    .eq("respon_vendor", "tidak_sanggup")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch vendor responses:", error);
    return [];
  }

  return ((data as unknown as RawVendorResponseQueryResult[]) || []).map((o) => {
    const p = o.period;
    const s = p?.shift;
    const v = p?.vendor;
    const totalPorsi = (o.items || []).reduce(
      (sum: number, it: { jumlah_porsi: number }) => sum + (it.jumlah_porsi || 0),
      0
    );

    return {
      periodId: o.period_id,
      orderId: o.id,
      tanggal: p?.tanggal || "",
      shiftNama: s?.nama || "",
      shiftLabel: s?.label || "",
      shiftJam: s ? `${s.jam_mulai?.slice(0, 5)} - ${s.jam_selesai?.slice(0, 5)}` : "",
      vendorId: v?.id || "",
      vendorKode: v?.kode || "",
      vendorNama: v?.nama || "",
      vendorTelp: v?.telp || "",
      vendorKontak: v?.kontak || "",
      totalPorsi,
      responVendor: o.respon_vendor,
      catatanVendor: o.catatan_vendor,
      responVendorAt: o.respon_vendor_at || o.updated_at,
      status: o.status,
    };
  });
}

// Get full chronology for an order by orderId or periodId
export async function getOrderChronology(
  orderIdOrPeriodId: string
): Promise<OrderChronologyResult | null> {
  const supabase = await createClient();

  // Try to find order by id or period_id
  const { data: order, error: orderErr } = await supabase
    .from("catering_orders")
    .select(
      `
      id,
      period_id,
      status,
      respon_vendor,
      progres_vendor,
      period:periods (
        id,
        tanggal,
        shift:shifts (nama, label, jam_mulai, jam_selesai),
        vendor:vendors (kode, nama, telp, kontak)
      ),
      items:catering_items (
        jumlah_porsi
      )
    `
    )
    .or(`id.eq.${orderIdOrPeriodId},period_id.eq.${orderIdOrPeriodId}`)
    .maybeSingle();

  if (orderErr || !order) {
    console.error("Order chronology query error:", orderErr);
    return null;
  }

  const typedOrder = order as unknown as RawOrderChronologyQueryResult;
  const p = typedOrder.period;
  const s = p?.shift;
  const v = p?.vendor;
  const totalPorsi = (typedOrder.items || []).reduce(
    (acc: number, it: { jumlah_porsi: number }) => acc + (it.jumlah_porsi || 0),
    0
  );

  // Fetch chronological logs
  const { data: logsData, error: logsErr } = await supabase
    .from("order_logs")
    .select(
      `
      id,
      aksi,
      jumlah_awal,
      selisih,
      jumlah_baru,
      keterangan,
      created_at,
      profile:profiles!order_logs_oleh_fkey (nama, role),
      item:catering_items (
        bagian:bagian (nama)
      )
    `
    )
    .eq("order_id", typedOrder.id)
    .order("created_at", { ascending: false });

  if (logsErr) {
    console.error("Failed to fetch order logs:", logsErr);
  }

  const logs: ChronologyLogItem[] = ((logsData as unknown as RawOrderLogQueryResult[]) || []).map((l) => ({
    id: l.id,
    aksi: l.aksi,
    jumlahAwal: l.jumlah_awal,
    selisih: l.selisih,
    jumlahBaru: l.jumlah_baru,
    keterangan: l.keterangan,
    bagianNama: l.item?.bagian?.nama || null,
    olehNama: l.profile?.nama || "Admin",
    olehRole: l.profile?.role || "admin_ga",
    createdAt: l.created_at,
  }));


  return {
    orderId: order.id,
    periodId: order.period_id,
    tanggal: p?.tanggal || "",
    shiftNama: s?.nama || "",
    shiftLabel: s?.label || "",
    shiftJam: s ? `${s.jam_mulai?.slice(0, 5)} - ${s.jam_selesai?.slice(0, 5)}` : "",
    vendorKode: v?.kode || "",
    vendorNama: v?.nama || "",
    vendorTelp: v?.telp || "",
    vendorKontak: v?.kontak || "",
    status: order.status,
    responVendor: order.respon_vendor,
    progresVendor: order.progres_vendor,
    totalPorsi,
    logs,
  };
}
