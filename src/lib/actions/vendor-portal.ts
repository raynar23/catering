"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { revalidatePath } from "next/cache";
import { VendorProgress, VendorResponseStatus } from "@/lib/types";
import { getNextProgressStep, isProgressAdvanceAllowed } from "@/lib/vendor/progress";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface VendorKPIs {
  permintaanHariIniPorsi: number;
  menungguResponsCount: number;
  sedangDiprosesCount: number;
  selesaiBulanIniCount: number;
}

export interface VendorOrderItemDetail {
  id: string;
  bagianId: string;
  bagianNama: string;
  bagianKode: string;
  lokasiAntar: string;
  catatanAntar: string;
  jumlahPorsi: number;
  jumlahKaryawan: number;
  keterangan: string;
  pendingRevision?: {
    id: string;
    porsiAwal: number;
    porsiBaru: number;
    selisihPorsi: number;
    alasan: string;
    responVendor: VendorResponseStatus;
  } | null;
}

export interface VendorShiftOrder {
  shiftId: string;
  shiftNama: string;
  shiftLabel: string;
  shiftJam: string;
  batasTiba: string;
  urutanLaporan: number;
  hasOrder: boolean;
  orderId?: string;
  periodId?: string;
  tanggal?: string;
  totalPorsi: number;
  status?: string;
  responVendor?: VendorResponseStatus;
  responVendorAt?: string | null;
  catatanVendor?: string | null;
  progresVendor?: VendorProgress;
  progresVendorAt?: string | null;
  catatanGa?: string | null;
  items: VendorOrderItemDetail[];
}

export interface VendorDashboardData {
  todayStr: string;
  vendorNama: string;
  vendorKode: string;
  kpis: VendorKPIs;
  shiftsToday: VendorShiftOrder[];
}

export interface VendorPermintaanRow {
  orderId: string;
  periodId: string;
  tanggal: string;
  shiftNama: string;
  shiftLabel: string;
  shiftJam: string;
  batasTiba: string;
  totalPorsi: number;
  status: string;
  responVendor: VendorResponseStatus;
  responVendorAt: string | null;
  catatanVendor: string | null;
  progresVendor: VendorProgress;
  catatanGa: string | null;
  diupdateOleh: string;
  updatedAt: string;
  pendingRevisionsCount: number;
  items: VendorOrderItemDetail[];
}

export interface VendorPendingOrderConfirmation {
  orderId: string;
  periodId: string;
  tanggal: string;
  shiftNama: string;
  shiftLabel: string;
  shiftJam: string;
  batasTiba: string;
  totalPorsi: number;
  status: string;
  catatanGa: string | null;
  submittedAt: string | null;
  diupdateOleh: string;
  items: VendorOrderItemDetail[];
}

export interface VendorPendingRevisionConfirmation {
  revisionId: string;
  itemId: string;
  orderId: string;
  tanggal: string;
  shiftNama: string;
  shiftLabel: string;
  shiftJam: string;
  batasTiba: string;
  bagianNama: string;
  lokasiAntar: string;
  porsiAwal: number;
  porsiBaru: number;
  selisihPorsi: number;
  karyawanAwal: number;
  karyawanBaru: number;
  alasan: string;
  diajukanAt: string;
  diupdateOleh: string;
}

export interface VendorKetersediaanQueueData {
  orders: VendorPendingOrderConfirmation[];
  revisions: VendorPendingRevisionConfirmation[];
  totalUnresponded: number;
}

export interface VendorProgresItem {
  orderId: string;
  periodId: string;
  tanggal: string;
  shiftNama: string;
  shiftLabel: string;
  shiftJam: string;
  batasTiba: string;
  totalPorsi: number;
  status: string;
  responVendor: VendorResponseStatus;
  responVendorAt: string | null;
  progresVendor: VendorProgress;
  progresVendorAt: string | null;
  catatanVendor: string | null;
  catatanGa: string | null;
  diupdateOleh: string;
  nextStep: ReturnType<typeof getNextProgressStep>;
  items: VendorOrderItemDetail[];
}

export interface VendorRiwayatFilter {
  startDate?: string;
  endDate?: string;
  statusRespon?: string;
  progres?: string;
  search?: string;
}

// Helper to authenticate vendor and retrieve vendor context
async function getAuthenticatedVendor() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.aktif) {
    throw new Error("Sesi pengguna tidak valid.");
  }
  if (profile.role !== "vendor" || !profile.vendor_id) {
    throw new Error("Akses ditolak: Hanya akun vendor resmi yang dapat mengakses portal ini.");
  }

  const supabase = await createClient();
  const { data: vendorData, error: vendorErr } = await supabase
    .from("vendors")
    .select("id, kode, nama")
    .eq("id", profile.vendor_id)
    .single();

  if (vendorErr || !vendorData) {
    throw new Error("Data vendor tidak ditemukan.");
  }

  return { supabase, profile, vendor: vendorData };
}

// Get vendor dashboard summary KPIs and today's 3-shift orders
export async function getVendorDashboardData(): Promise<VendorDashboardData> {
  const { supabase, vendor } = await getAuthenticatedVendor();
  const vendorId = vendor.id;

  // Compute today's date in Asia/Jakarta timezone (YYYY-MM-DD)
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(now);

  const startOfMonthStr = `${todayStr.slice(0, 7)}-01`;
  const nextMonthYear = Number(todayStr.slice(0, 4)) + (todayStr.slice(5, 7) === "12" ? 1 : 0);
  const nextMonthVal = todayStr.slice(5, 7) === "12" ? "01" : String(Number(todayStr.slice(5, 7)) + 1).padStart(2, "0");
  const endOfMonthStr = `${nextMonthYear}-${nextMonthVal}-01`;

  // 1. Fetch active shifts ordered by urutan_laporan (Shift 3, 1, 2)
  const { data: shiftsData } = await supabase
    .from("shifts")
    .select("id, nama, label, jam_mulai, jam_selesai, batas_tiba, urutan_laporan")
    .eq("aktif", true)
    .order("urutan_laporan", { ascending: true });

  const shifts = shiftsData || [];

  // 2. Fetch today's orders for this vendor
  const { data: todayOrdersData } = await supabase
    .from("catering_orders")
    .select(`
      id,
      period_id,
      status,
      respon_vendor,
      respon_vendor_at,
      catatan_vendor,
      progres_vendor,
      progres_vendor_at,
      catatan,
      period:periods!catering_orders_period_id_fkey (
        id,
        tanggal,
        shift_id
      ),
      items:catering_items (
        id,
        bagian_id,
        jumlah_karyawan,
        jumlah_porsi,
        keterangan,
        bagian:bagian (
          id,
          kode,
          nama,
          lokasi_antar,
          keterangan
        ),
        revisions:revisions (
          id,
          porsi_awal,
          porsi_baru,
          selisih_porsi,
          alasan,
          status,
          respon_vendor
        )
      )
    `)
    .eq("vendor_id", vendorId)
    .in("status", ["final", "revisi"]);

  const todayOrders = (todayOrdersData || []).filter((o) => {
    const p = o.period as { tanggal?: string } | null;
    return p?.tanggal === todayStr;
  });

  // Calculate KPI 1: Permintaan Hari Ini (dalam porsi)
  let permintaanHariIniPorsi = 0;
  for (const order of todayOrders) {
    const items = (order.items as unknown as Array<{ jumlah_porsi: number }>) || [];
    for (const item of items) {
      permintaanHariIniPorsi += item.jumlah_porsi || 0;
    }
  }

  // Calculate KPI 2: Menunggu Respons (unresponded orders + unresponded revisions)
  const { count: unrespondedOrdersCount } = await supabase
    .from("catering_orders")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId)
    .in("status", ["final", "revisi"])
    .eq("respon_vendor", "menunggu");

  const { data: unrespondedRevsData } = await supabase
    .from("revisions")
    .select(`
      id,
      item:catering_items!revisions_item_id_fkey (
        order:catering_orders!catering_items_order_id_fkey (
          vendor_id,
          status
        )
      )
    `)
    .eq("status", "menunggu")
    .eq("respon_vendor", "menunggu");

  const unrespondedRevsCount = (unrespondedRevsData || []).filter((r) => {
    const item = r.item as { order?: { vendor_id?: string; status?: string } } | null;
    return Boolean(
      item?.order &&
      item.order.vendor_id === vendorId &&
      (item.order.status === "final" || item.order.status === "revisi")
    );
  }).length;

  const menungguResponsCount = (unrespondedOrdersCount || 0) + unrespondedRevsCount;

  // Calculate KPI 3: Sedang Diproses (disanggupi and not selesai)
  const { count: sedangDiprosesCount } = await supabase
    .from("catering_orders")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId)
    .in("status", ["final", "revisi"])
    .eq("respon_vendor", "disanggupi")
    .neq("progres_vendor", "selesai");

  // Calculate KPI 4: Selesai Bulan Ini
  const { data: monthFinishedOrders } = await supabase
    .from("catering_orders")
    .select(`
      id,
      period:periods!catering_orders_period_id_fkey (
        tanggal
      )
    `)
    .eq("vendor_id", vendorId)
    .eq("progres_vendor", "selesai");

  const selesaiBulanIniCount = (monthFinishedOrders || []).filter((o) => {
    const p = o.period as { tanggal?: string } | null;
    if (!p?.tanggal) return false;
    return p.tanggal >= startOfMonthStr && p.tanggal < endOfMonthStr;
  }).length;

  // Construct today's 3-shift orders panel
  const shiftsToday: VendorShiftOrder[] = shifts.map((shift) => {
    const matchedOrder = todayOrders.find((o) => {
      const p = o.period as { shift_id?: string } | null;
      return p?.shift_id === shift.id;
    });

    const shiftJam = `${shift.jam_mulai.slice(0, 5)} - ${shift.jam_selesai.slice(0, 5)}`;
    const batasTiba = shift.batas_tiba.slice(0, 5);

    if (!matchedOrder) {
      return {
        shiftId: shift.id,
        shiftNama: shift.nama,
        shiftLabel: shift.label,
        shiftJam,
        batasTiba,
        urutanLaporan: shift.urutan_laporan,
        hasOrder: false,
        totalPorsi: 0,
        items: [],
      };
    }

    const rawItems = (matchedOrder.items as unknown as Array<{
      id: string;
      bagian_id: string;
      jumlah_karyawan: number;
      jumlah_porsi: number;
      keterangan: string | null;
      bagian?: { id: string; kode: string | null; nama: string; lokasi_antar: string | null; keterangan: string | null };
      revisions?: Array<{ id: string; porsi_awal: number; porsi_baru: number; selisih_porsi: number; alasan: string; status: string; respon_vendor: string }>;
    }>) || [];

    let totalPorsi = 0;
    const items: VendorOrderItemDetail[] = rawItems.map((it) => {
      totalPorsi += it.jumlah_porsi || 0;
      const pendingRev = it.revisions?.find((r) => r.status === "menunggu");

      return {
        id: it.id,
        bagianId: it.bagian_id,
        bagianNama: it.bagian?.nama || "Bagian",
        bagianKode: it.bagian?.kode || "",
        lokasiAntar: it.bagian?.lokasi_antar || "-",
        catatanAntar: it.bagian?.keterangan || "-",
        jumlahPorsi: it.jumlah_porsi || 0,
        jumlahKaryawan: it.jumlah_karyawan || 0,
        keterangan: it.keterangan || "",
        pendingRevision: pendingRev
          ? {
              id: pendingRev.id,
              porsiAwal: pendingRev.porsi_awal,
              porsiBaru: pendingRev.porsi_baru,
              selisihPorsi: pendingRev.selisih_porsi,
              alasan: pendingRev.alasan,
              responVendor: pendingRev.respon_vendor as VendorResponseStatus,
            }
          : null,
      };
    });

    return {
      shiftId: shift.id,
      shiftNama: shift.nama,
      shiftLabel: shift.label,
      shiftJam,
      batasTiba,
      urutanLaporan: shift.urutan_laporan,
      hasOrder: true,
      orderId: matchedOrder.id,
      periodId: (matchedOrder.period as { id?: string } | null)?.id,
      tanggal: todayStr,
      totalPorsi,
      status: matchedOrder.status,
      responVendor: matchedOrder.respon_vendor as VendorResponseStatus,
      responVendorAt: matchedOrder.respon_vendor_at,
      catatanVendor: matchedOrder.catatan_vendor,
      progresVendor: matchedOrder.progres_vendor as VendorProgress,
      progresVendorAt: matchedOrder.progres_vendor_at,
      catatanGa: matchedOrder.catatan,
      items,
    };
  });

  return {
    todayStr,
    vendorNama: vendor.nama,
    vendorKode: vendor.kode,
    kpis: {
      permintaanHariIniPorsi,
      menungguResponsCount,
      sedangDiprosesCount: sedangDiprosesCount || 0,
      selesaiBulanIniCount,
    },
    shiftsToday,
  };
}

// Fetch vendor incoming requests with inspector details and filter options
export async function getVendorPermintaanList(params?: {
  tanggal?: string;
  statusRespon?: string;
  search?: string;
}): Promise<VendorPermintaanRow[]> {
  const { supabase, vendor } = await getAuthenticatedVendor();
  const vendorId = vendor.id;

  let query = supabase
    .from("catering_orders")
    .select(`
      id,
      period_id,
      status,
      respon_vendor,
      respon_vendor_at,
      catatan_vendor,
      progres_vendor,
      catatan,
      updated_at,
      period:periods!catering_orders_period_id_fkey (
        id,
        tanggal,
        shift:shifts!periods_shift_id_fkey (
          id,
          nama,
          label,
          jam_mulai,
          jam_selesai,
          batas_tiba,
          urutan_laporan
        )
      ),
      items:catering_items (
        id,
        bagian_id,
        jumlah_karyawan,
        jumlah_porsi,
        keterangan,
        bagian:bagian (
          id,
          kode,
          nama,
          lokasi_antar,
          keterangan
        ),
        revisions:revisions (
          id,
          porsi_awal,
          porsi_baru,
          selisih_porsi,
          alasan,
          status,
          respon_vendor
        )
      )
    `)
    .eq("vendor_id", vendorId)
    .in("status", ["final", "revisi"])
    .order("updated_at", { ascending: false });

  if (params?.statusRespon && params.statusRespon !== "all") {
    query = query.eq("respon_vendor", params.statusRespon);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to query vendor permintaan:", error);
    throw new Error("Gagal memuat daftar permintaan vendor.");
  }

  const rows: VendorPermintaanRow[] = [];

  for (const o of data || []) {
    const period = o.period as {
      id?: string;
      tanggal?: string;
      shift?: {
        nama?: string;
        label?: string;
        jam_mulai?: string;
        jam_selesai?: string;
        batas_tiba?: string;
        urutan_laporan?: number;
      } | null;
    } | null;

    if (!period || !period.tanggal) continue;

    // Filter by specific date if provided
    if (params?.tanggal && period.tanggal !== params.tanggal) {
      continue;
    }

    const shift = period.shift;
    const shiftJam = shift ? `${shift.jam_mulai?.slice(0, 5)} - ${shift.jam_selesai?.slice(0, 5)}` : "-";
    const batasTiba = shift?.batas_tiba ? shift.batas_tiba.slice(0, 5) : "-";

    const rawItems = (o.items as unknown as Array<{
      id: string;
      bagian_id: string;
      jumlah_karyawan: number;
      jumlah_porsi: number;
      keterangan: string | null;
      bagian?: { id: string; kode: string | null; nama: string; lokasi_antar: string | null; keterangan: string | null };
      revisions?: Array<{ id: string; porsi_awal: number; porsi_baru: number; selisih_porsi: number; alasan: string; status: string; respon_vendor: string }>;
    }>) || [];

    let totalPorsi = 0;
    let pendingRevisionsCount = 0;

    const items: VendorOrderItemDetail[] = rawItems.map((it) => {
      totalPorsi += it.jumlah_porsi || 0;
      const pendingRev = it.revisions?.find((r) => r.status === "menunggu");
      if (pendingRev) pendingRevisionsCount++;

      return {
        id: it.id,
        bagianId: it.bagian_id,
        bagianNama: it.bagian?.nama || "Bagian",
        bagianKode: it.bagian?.kode || "",
        lokasiAntar: it.bagian?.lokasi_antar || "-",
        catatanAntar: it.bagian?.keterangan || "-",
        jumlahPorsi: it.jumlah_porsi || 0,
        jumlahKaryawan: it.jumlah_karyawan || 0,
        keterangan: it.keterangan || "",
        pendingRevision: pendingRev
          ? {
              id: pendingRev.id,
              porsiAwal: pendingRev.porsi_awal,
              porsiBaru: pendingRev.porsi_baru,
              selisihPorsi: pendingRev.selisih_porsi,
              alasan: pendingRev.alasan,
              responVendor: pendingRev.respon_vendor as VendorResponseStatus,
            }
          : null,
      };
    });

    // Check search term filter (shift name, date, notes)
    if (params?.search) {
      const q = params.search.toLowerCase();
      const match =
        period.tanggal.toLowerCase().includes(q) ||
        (shift?.nama || "").toLowerCase().includes(q) ||
        (shift?.label || "").toLowerCase().includes(q) ||
        (o.catatan || "").toLowerCase().includes(q) ||
        items.some((it) => it.bagianNama.toLowerCase().includes(q) || it.lokasiAntar.toLowerCase().includes(q));
      if (!match) continue;
    }

    rows.push({
      orderId: o.id,
      periodId: period.id || o.period_id,
      tanggal: period.tanggal,
      shiftNama: shift?.nama || "Shift",
      shiftLabel: shift?.label || "-",
      shiftJam,
      batasTiba,
      totalPorsi,
      status: o.status,
      responVendor: o.respon_vendor as VendorResponseStatus,
      responVendorAt: o.respon_vendor_at,
      catatanVendor: o.catatan_vendor,
      progresVendor: o.progres_vendor as VendorProgress,
      catatanGa: o.catatan,
      diupdateOleh: "Admin GA",
      updatedAt: o.updated_at,
      pendingRevisionsCount,
      items,
    });
  }

  // Sort by date descending and shift sequence
  rows.sort((a, b) => {
    if (a.tanggal !== b.tanggal) {
      return b.tanggal.localeCompare(a.tanggal);
    }
    return a.shiftNama.localeCompare(b.shiftNama);
  });

  return rows;
}

// Fetch unresponded orders and revisions for vendor confirmation queue
export async function getVendorKetersediaanQueue(): Promise<VendorKetersediaanQueueData> {
  const { supabase, vendor } = await getAuthenticatedVendor();
  const vendorId = vendor.id;

  // 1. Fetch unresponded orders
  const { data: unrespondedOrders, error: orderErr } = await supabase
    .from("catering_orders")
    .select(`
      id,
      period_id,
      status,
      catatan,
      submitted_at,
      period:periods!catering_orders_period_id_fkey (
        id,
        tanggal,
        shift:shifts!periods_shift_id_fkey (
          id,
          nama,
          label,
          jam_mulai,
          jam_selesai,
          batas_tiba
        )
      ),
      items:catering_items (
        id,
        bagian_id,
        jumlah_karyawan,
        jumlah_porsi,
        keterangan,
        bagian:bagian (
          id,
          kode,
          nama,
          lokasi_antar,
          keterangan
        )
      )
    `)
    .eq("vendor_id", vendorId)
    .in("status", ["final", "revisi"])
    .eq("respon_vendor", "menunggu")
    .order("created_at", { ascending: false });

  if (orderErr) {
    console.error("Failed to query unresponded orders:", orderErr);
    throw new Error("Gagal memuat antrean ketersediaan pesanan.");
  }

  const orders: VendorPendingOrderConfirmation[] = (unrespondedOrders || []).map((o) => {
    const period = o.period as {
      id?: string;
      tanggal?: string;
      shift?: {
        nama?: string;
        label?: string;
        jam_mulai?: string;
        jam_selesai?: string;
        batas_tiba?: string;
      } | null;
    } | null;

    const shift = period?.shift;
    const shiftJam = shift ? `${shift.jam_mulai?.slice(0, 5)} - ${shift.jam_selesai?.slice(0, 5)}` : "-";
    const batasTiba = shift?.batas_tiba ? shift.batas_tiba.slice(0, 5) : "-";

    const rawItems = (o.items as unknown as Array<{
      id: string;
      bagian_id: string;
      jumlah_karyawan: number;
      jumlah_porsi: number;
      keterangan: string | null;
      bagian?: { id: string; kode: string | null; nama: string; lokasi_antar: string | null; keterangan: string | null };
    }>) || [];

    let totalPorsi = 0;
    const items: VendorOrderItemDetail[] = rawItems.map((it) => {
      totalPorsi += it.jumlah_porsi || 0;
      return {
        id: it.id,
        bagianId: it.bagian_id,
        bagianNama: it.bagian?.nama || "Bagian",
        bagianKode: it.bagian?.kode || "",
        lokasiAntar: it.bagian?.lokasi_antar || "-",
        catatanAntar: it.bagian?.keterangan || "-",
        jumlahPorsi: it.jumlah_porsi || 0,
        jumlahKaryawan: it.jumlah_karyawan || 0,
        keterangan: it.keterangan || "",
      };
    });

    return {
      orderId: o.id,
      periodId: period?.id || o.period_id,
      tanggal: period?.tanggal || "-",
      shiftNama: shift?.nama || "Shift",
      shiftLabel: shift?.label || "-",
      shiftJam,
      batasTiba,
      totalPorsi,
      status: o.status,
      catatanGa: o.catatan,
      submittedAt: o.submitted_at,
      diupdateOleh: "Admin GA",
      items,
    };
  });

  // 2. Fetch unresponded revisions
  const { data: rawRevs, error: revErr } = await supabase
    .from("revisions")
    .select(`
      id,
      item_id,
      karyawan_awal,
      karyawan_baru,
      porsi_awal,
      porsi_baru,
      selisih_porsi,
      alasan,
      status,
      diajukan_at,
      item:catering_items!revisions_item_id_fkey (
        id,
        order_id,
        bagian:bagian!catering_items_bagian_id_fkey (
          id,
          nama,
          lokasi_antar
        ),
        order:catering_orders!catering_items_order_id_fkey (
          id,
          vendor_id,
          status,
          period:periods!catering_orders_period_id_fkey (
            id,
            tanggal,
            shift:shifts!periods_shift_id_fkey (
              nama,
              label,
              jam_mulai,
              jam_selesai,
              batas_tiba
            )
          )
        )
      )
    `)
    .eq("status", "menunggu")
    .eq("respon_vendor", "menunggu")
    .order("diajukan_at", { ascending: false });

  if (revErr) {
    console.error("Failed to query unresponded revisions:", revErr);
    throw new Error("Gagal memuat antrean ketersediaan revisi.");
  }

  const revisions: VendorPendingRevisionConfirmation[] = [];
  for (const r of rawRevs || []) {
    const item = r.item as {
      id?: string;
      order_id?: string;
      bagian?: { nama?: string; lokasi_antar?: string } | null;
      order?: {
        vendor_id?: string;
        status?: string;
        period?: {
          tanggal?: string;
          shift?: {
            nama?: string;
            label?: string;
            jam_mulai?: string;
            jam_selesai?: string;
            batas_tiba?: string;
          } | null;
        } | null;
      } | null;
    } | null;

    if (!item || !item.order) continue;
    if (item.order.vendor_id !== vendorId) continue;
    if (item.order.status !== "final" && item.order.status !== "revisi") continue;

    const shift = item.order.period?.shift;
    const shiftJam = shift ? `${shift.jam_mulai?.slice(0, 5)} - ${shift.jam_selesai?.slice(0, 5)}` : "-";
    const batasTiba = shift?.batas_tiba ? shift.batas_tiba.slice(0, 5) : "-";

    revisions.push({
      revisionId: r.id,
      itemId: r.item_id,
      orderId: item.order_id || "",
      tanggal: item.order.period?.tanggal || "-",
      shiftNama: shift?.nama || "Shift",
      shiftLabel: shift?.label || "-",
      shiftJam,
      batasTiba,
      bagianNama: item.bagian?.nama || "Bagian",
      lokasiAntar: item.bagian?.lokasi_antar || "-",
      porsiAwal: r.porsi_awal,
      porsiBaru: r.porsi_baru,
      selisihPorsi: r.selisih_porsi,
      karyawanAwal: r.karyawan_awal,
      karyawanBaru: r.karyawan_baru,
      alasan: r.alasan,
      diajukanAt: r.diajukan_at,
      diupdateOleh: "Admin GA",
    });
  }

  return {
    orders,
    revisions,
    totalUnresponded: orders.length + revisions.length,
  };
}

// Action: Vendor responds to period order (Sanggup / Tidak Sanggup)
export async function responPeriodeVendorAction(params: {
  orderId: string;
  sanggup: boolean;
  catatan?: string;
}): Promise<ActionResult<{ orderId: string }>> {
  try {
    const { supabase } = await getAuthenticatedVendor();
    const { orderId, sanggup, catatan } = params;

    if (!orderId) {
      return { success: false, error: "ID pesanan catering tidak valid." };
    }

    if (!sanggup && (!catatan || catatan.trim().length === 0)) {
      return {
        success: false,
        error: "Catatan alasan wajib diisi bila tidak dapat menyanggupi pesanan.",
      };
    }

    const { data: resOrderId, error } = await supabase.rpc("respon_periode_vendor", {
      p_order_id: orderId,
      p_sanggup: sanggup,
      p_catatan: catatan?.trim() || null,
    });

    if (error) {
      console.error("RPC respon_periode_vendor failed:", error);
      return {
        success: false,
        error: error.message || "Gagal menyimpan respon kesanggupan pesanan.",
      };
    }

    revalidatePath("/vendor");
    revalidatePath("/vendor/dashboard");
    revalidatePath("/vendor/ketersediaan");
    revalidatePath("/vendor/permintaan");
    revalidatePath("/vendor/progres");
    revalidatePath("/vendor/riwayat");
    revalidatePath("/admin/verifikasi");
    revalidatePath("/admin/periode");

    return {
      success: true,
      message: sanggup
        ? "Konfirmasi kesanggupan berhasil disimpan. Pesanan masuk ke antrean progres."
        : "Pernyataan tidak menyanggupi berhasil disimpan dan diteruskan ke Admin GA.",
      data: { orderId: resOrderId as string },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    return { success: false, error: errorMsg };
  }
}

// Action: Vendor responds to revision change (Sanggup / Tidak Sanggup)
export async function responRevisiVendorAction(params: {
  revisionId: string;
  sanggup: boolean;
  catatan?: string;
}): Promise<ActionResult<{ revisionId: string }>> {
  try {
    const { supabase } = await getAuthenticatedVendor();
    const { revisionId, sanggup, catatan } = params;

    if (!revisionId) {
      return { success: false, error: "ID revisi tidak valid." };
    }

    if (!sanggup && (!catatan || catatan.trim().length === 0)) {
      return {
        success: false,
        error: "Catatan alasan wajib diisi bila tidak dapat menyanggupi perubahan revisi.",
      };
    }

    const { data: resRevId, error } = await supabase.rpc("respon_revisi_vendor", {
      p_revision_id: revisionId,
      p_sanggup: sanggup,
      p_catatan: catatan?.trim() || null,
    });

    if (error) {
      console.error("RPC respon_revisi_vendor failed:", error);
      return {
        success: false,
        error: error.message || "Gagal menyimpan respon revisi.",
      };
    }

    revalidatePath("/vendor");
    revalidatePath("/vendor/dashboard");
    revalidatePath("/vendor/ketersediaan");
    revalidatePath("/vendor/permintaan");
    revalidatePath("/vendor/progres");
    revalidatePath("/vendor/riwayat");
    revalidatePath("/admin/verifikasi");

    return {
      success: true,
      message: sanggup
        ? "Konfirmasi persetujuan revisi berhasil dikirim."
        : "Pernyataan tidak menyanggupi revisi berhasil dikirim ke Admin GA.",
      data: { revisionId: resRevId as string },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    return { success: false, error: errorMsg };
  }
}

// Fetch orders accepted by vendor that are currently being prepared / delivered
export async function getVendorProgresList(): Promise<VendorProgresItem[]> {
  const { supabase, vendor } = await getAuthenticatedVendor();
  const vendorId = vendor.id;

  const { data, error } = await supabase
    .from("catering_orders")
    .select(`
      id,
      period_id,
      status,
      respon_vendor,
      respon_vendor_at,
      progres_vendor,
      progres_vendor_at,
      catatan_vendor,
      catatan,
      updated_at,
      period:periods!catering_orders_period_id_fkey (
        id,
        tanggal,
        shift:shifts!periods_shift_id_fkey (
          id,
          nama,
          label,
          jam_mulai,
          jam_selesai,
          batas_tiba,
          urutan_laporan
        )
      ),
      items:catering_items (
        id,
        bagian_id,
        jumlah_karyawan,
        jumlah_porsi,
        keterangan,
        bagian:bagian (
          id,
          kode,
          nama,
          lokasi_antar,
          keterangan
        )
      )
    `)
    .eq("vendor_id", vendorId)
    .in("status", ["final", "revisi"])
    .eq("respon_vendor", "disanggupi")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to query vendor progress list:", error);
    throw new Error("Gagal memuat daftar progres pesanan.");
  }

  const itemsList: VendorProgresItem[] = [];

  for (const o of data || []) {
    const period = o.period as {
      id?: string;
      tanggal?: string;
      shift?: {
        nama?: string;
        label?: string;
        jam_mulai?: string;
        jam_selesai?: string;
        batas_tiba?: string;
        urutan_laporan?: number;
      } | null;
    } | null;

    if (!period || !period.tanggal) continue;

    const shift = period.shift;
    const shiftJam = shift ? `${shift.jam_mulai?.slice(0, 5)} - ${shift.jam_selesai?.slice(0, 5)}` : "-";
    const batasTiba = shift?.batas_tiba ? shift.batas_tiba.slice(0, 5) : "-";

    const rawItems = (o.items as unknown as Array<{
      id: string;
      bagian_id: string;
      jumlah_karyawan: number;
      jumlah_porsi: number;
      keterangan: string | null;
      bagian?: { id: string; kode: string | null; nama: string; lokasi_antar: string | null; keterangan: string | null };
    }>) || [];

    let totalPorsi = 0;
    const items: VendorOrderItemDetail[] = rawItems.map((it) => {
      totalPorsi += it.jumlah_porsi || 0;
      return {
        id: it.id,
        bagianId: it.bagian_id,
        bagianNama: it.bagian?.nama || "Bagian",
        bagianKode: it.bagian?.kode || "",
        lokasiAntar: it.bagian?.lokasi_antar || "-",
        catatanAntar: it.bagian?.keterangan || "-",
        jumlahPorsi: it.jumlah_porsi || 0,
        jumlahKaryawan: it.jumlah_karyawan || 0,
        keterangan: it.keterangan || "",
      };
    });

    const progres = (o.progres_vendor as VendorProgress) || "menunggu";
    const nextStep = getNextProgressStep(progres);

    itemsList.push({
      orderId: o.id,
      periodId: period.id || o.period_id,
      tanggal: period.tanggal,
      shiftNama: shift?.nama || "Shift",
      shiftLabel: shift?.label || "-",
      shiftJam,
      batasTiba,
      totalPorsi,
      status: o.status,
      responVendor: o.respon_vendor as VendorResponseStatus,
      responVendorAt: o.respon_vendor_at,
      progresVendor: progres,
      progresVendorAt: o.progres_vendor_at,
      catatanVendor: o.catatan_vendor,
      catatanGa: o.catatan,
      diupdateOleh: "Admin GA",
      nextStep,
      items,
    });
  }

  // Sort: active (not selesai) first, then date desc
  itemsList.sort((a, b) => {
    const aFinished = a.progresVendor === "selesai";
    const bFinished = b.progresVendor === "selesai";
    if (aFinished !== bFinished) {
      return aFinished ? 1 : -1;
    }
    return b.tanggal.localeCompare(a.tanggal);
  });

  return itemsList;
}

// Action: Update vendor delivery progress to next step
export async function updateProgresVendorAction(params: {
  orderId: string;
  targetProgres: VendorProgress;
  catatan?: string;
}): Promise<ActionResult<{ orderId: string }>> {
  try {
    const { supabase } = await getAuthenticatedVendor();
    const { orderId, targetProgres, catatan } = params;

    if (!orderId || !targetProgres) {
      return { success: false, error: "Parameter pembaruan progres tidak lengkap." };
    }

    // Check current progress to ensure strictly forward advancement
    const { data: currentOrder, error: fetchErr } = await supabase
      .from("catering_orders")
      .select("progres_vendor, respon_vendor")
      .eq("id", orderId)
      .single();

    if (fetchErr || !currentOrder) {
      return { success: false, error: "Pesanan tidak ditemukan." };
    }

    if (currentOrder.respon_vendor !== "disanggupi") {
      return {
        success: false,
        error: "Pesanan harus disanggupi terlebih dahulu sebelum memperbarui progres.",
      };
    }

    const currentProg = currentOrder.progres_vendor as VendorProgress;
    if (!isProgressAdvanceAllowed(currentProg, targetProgres)) {
      return {
        success: false,
        error: `Tahapan progres hanya dapat bergerak maju (status saat ini: ${currentProg}).`,
      };
    }

    const { data: resOrderId, error } = await supabase.rpc("update_progres_vendor", {
      p_order_id: orderId,
      p_progres: targetProgres,
      p_catatan: catatan?.trim() || null,
    });

    if (error) {
      console.error("RPC update_progres_vendor failed:", error);
      return {
        success: false,
        error: error.message || "Gagal memperbarui progres pengiriman.",
      };
    }

    revalidatePath("/vendor");
    revalidatePath("/vendor/dashboard");
    revalidatePath("/vendor/progres");
    revalidatePath("/vendor/permintaan");
    revalidatePath("/vendor/riwayat");
    revalidatePath("/admin/periode");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      message: `Progres pengiriman berhasil dimajukan ke tahap ${targetProgres}.`,
      data: { orderId: resOrderId as string },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    return { success: false, error: errorMsg };
  }
}

// Fetch vendor order history with date range, status, and search filters
export async function getVendorRiwayatList(filters?: VendorRiwayatFilter): Promise<VendorPermintaanRow[]> {
  const { supabase, vendor } = await getAuthenticatedVendor();
  const vendorId = vendor.id;

  let query = supabase
    .from("catering_orders")
    .select(`
      id,
      period_id,
      status,
      respon_vendor,
      respon_vendor_at,
      catatan_vendor,
      progres_vendor,
      catatan,
      updated_at,
      period:periods!catering_orders_period_id_fkey (
        id,
        tanggal,
        shift:shifts!periods_shift_id_fkey (
          id,
          nama,
          label,
          jam_mulai,
          jam_selesai,
          batas_tiba,
          urutan_laporan
        )
      ),
      items:catering_items (
        id,
        bagian_id,
        jumlah_karyawan,
        jumlah_porsi,
        keterangan,
        bagian:bagian (
          id,
          kode,
          nama,
          lokasi_antar,
          keterangan
        ),
        revisions:revisions (
          id,
          porsi_awal,
          porsi_baru,
          selisih_porsi,
          alasan,
          status,
          respon_vendor
        )
      )
    `)
    .eq("vendor_id", vendorId)
    .in("status", ["final", "revisi"])
    .order("updated_at", { ascending: false });

  if (filters?.statusRespon && filters.statusRespon !== "all") {
    query = query.eq("respon_vendor", filters.statusRespon);
  }

  if (filters?.progres && filters.progres !== "all") {
    query = query.eq("progres_vendor", filters.progres);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to query vendor riwayat:", error);
    throw new Error("Gagal memuat riwayat pesanan vendor.");
  }

  const rows: VendorPermintaanRow[] = [];

  for (const o of data || []) {
    const period = o.period as {
      id?: string;
      tanggal?: string;
      shift?: {
        nama?: string;
        label?: string;
        jam_mulai?: string;
        jam_selesai?: string;
        batas_tiba?: string;
        urutan_laporan?: number;
      } | null;
    } | null;

    if (!period || !period.tanggal) continue;

    // Apply date range filters
    if (filters?.startDate && period.tanggal < filters.startDate) {
      continue;
    }
    if (filters?.endDate && period.tanggal > filters.endDate) {
      continue;
    }

    const shift = period.shift;
    const shiftJam = shift ? `${shift.jam_mulai?.slice(0, 5)} - ${shift.jam_selesai?.slice(0, 5)}` : "-";
    const batasTiba = shift?.batas_tiba ? shift.batas_tiba.slice(0, 5) : "-";

    const rawItems = (o.items as unknown as Array<{
      id: string;
      bagian_id: string;
      jumlah_karyawan: number;
      jumlah_porsi: number;
      keterangan: string | null;
      bagian?: { id: string; kode: string | null; nama: string; lokasi_antar: string | null; keterangan: string | null };
      revisions?: Array<{ id: string; porsi_awal: number; porsi_baru: number; selisih_porsi: number; alasan: string; status: string; respon_vendor: string }>;
    }>) || [];

    let totalPorsi = 0;
    let pendingRevisionsCount = 0;

    const items: VendorOrderItemDetail[] = rawItems.map((it) => {
      totalPorsi += it.jumlah_porsi || 0;
      const pendingRev = it.revisions?.find((r) => r.status === "menunggu");
      if (pendingRev) pendingRevisionsCount++;

      return {
        id: it.id,
        bagianId: it.bagian_id,
        bagianNama: it.bagian?.nama || "Bagian",
        bagianKode: it.bagian?.kode || "",
        lokasiAntar: it.bagian?.lokasi_antar || "-",
        catatanAntar: it.bagian?.keterangan || "-",
        jumlahPorsi: it.jumlah_porsi || 0,
        jumlahKaryawan: it.jumlah_karyawan || 0,
        keterangan: it.keterangan || "",
        pendingRevision: pendingRev
          ? {
              id: pendingRev.id,
              porsiAwal: pendingRev.porsi_awal,
              porsiBaru: pendingRev.porsi_baru,
              selisihPorsi: pendingRev.selisih_porsi,
              alasan: pendingRev.alasan,
              responVendor: pendingRev.respon_vendor as VendorResponseStatus,
            }
          : null,
      };
    });

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      const match =
        period.tanggal.toLowerCase().includes(q) ||
        (shift?.nama || "").toLowerCase().includes(q) ||
        (shift?.label || "").toLowerCase().includes(q) ||
        (o.catatan || "").toLowerCase().includes(q) ||
        items.some((it) => it.bagianNama.toLowerCase().includes(q) || it.lokasiAntar.toLowerCase().includes(q));
      if (!match) continue;
    }

    rows.push({
      orderId: o.id,
      periodId: period.id || o.period_id,
      tanggal: period.tanggal,
      shiftNama: shift?.nama || "Shift",
      shiftLabel: shift?.label || "-",
      shiftJam,
      batasTiba,
      totalPorsi,
      status: o.status,
      responVendor: o.respon_vendor as VendorResponseStatus,
      responVendorAt: o.respon_vendor_at,
      catatanVendor: o.catatan_vendor,
      progresVendor: o.progres_vendor as VendorProgress,
      catatanGa: o.catatan,
      diupdateOleh: "Admin GA",
      updatedAt: o.updated_at,
      pendingRevisionsCount,
      items,
    });
  }

  // Sort by date descending
  rows.sort((a, b) => {
    if (a.tanggal !== b.tanggal) {
      return b.tanggal.localeCompare(a.tanggal);
    }
    return a.shiftNama.localeCompare(b.shiftNama);
  });

  return rows;
}

// Get vendor pending notification count for badges
export async function getVendorNotificationCounts(): Promise<number> {
  try {
    const queue = await getVendorKetersediaanQueue();
    return queue.totalUnresponded;
  } catch {
    return 0;
  }
}
