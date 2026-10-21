"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { validateRekapRange } from "@/lib/rekap";

export interface RekapColumn {
  id: string;
  kode: string;
  nama: string;
  kelompok: string;
  urutan: number;
}

export interface RekapHarianRow {
  period_id: string;
  tanggal: string;
  shift_id: string;
  shift_nama: string;
  shift_label: string;
  shift_urutan_laporan: number;
  vendor_id: string;
  vendor_kode: string;
  vendor_nama: string;
  total_porsi: number;
  items: Record<string, number>;
}

export interface RekapHarianData {
  columns: RekapColumn[];
  rows: RekapHarianRow[];
  summary_totals: Record<string, number>;
  grand_total: number;
  total_rows: number;
  page: number;
  page_size: number;
}

export interface RekapRingkasanData {
  metrics: {
    total_porsi: number;
    rata_rata_porsi_per_hari: number;
    total_hari_operasional: number;
    total_periode: number;
  };
  per_bagian: Array<{
    bagian_id: string;
    bagian_nama: string;
    bagian_kelompok: string;
    total_porsi: number;
    persentase: number;
  }>;
  per_shift: Array<{
    shift_id: string;
    shift_nama: string;
    shift_label: string;
    urutan_laporan: number;
    total_porsi: number;
    persentase: number;
  }>;
  per_vendor: Array<{
    vendor_id: string;
    vendor_nama: string;
    vendor_kode: string;
    total_porsi: number;
    persentase: number;
  }>;
  per_bulan: Array<{
    bulan_key: string;
    total_porsi: number;
    hari_count: number;
    persentase: number;
  }>;
}

export interface RekapFilterOptions {
  vendors: Array<{ id: string; kode: string; nama: string }>;
  bagian: Array<{ id: string; kode: string; nama: string; kelompok: string }>;
  shifts: Array<{ id: string; nama: string; label: string; urutan_laporan: number }>;
}

export interface RekapFilterParams {
  dari: string;
  sampai: string;
  vendorId?: string;
  bagianId?: string;
  shiftId?: string;
  page?: number;
  pageSize?: number;
}

// Retrieve master options for filter dropdowns (vendors, active departments, and shifts)
export async function getRekapFilterOptionsAction(): Promise<{
  success: boolean;
  data?: RekapFilterOptions;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const [vendorsRes, bagianRes, shiftsRes] = await Promise.all([
      supabase.from("vendors").select("id, kode, nama").eq("aktif", true).order("kode"),
      supabase.from("bagian").select("id, kode, nama, kelompok").eq("aktif", true).order("urutan"),
      supabase.from("shifts").select("id, nama, label, urutan_laporan").order("urutan_laporan"),
    ]);

    return {
      success: true,
      data: {
        vendors: vendorsRes.data ?? [],
        bagian: bagianRes.data ?? [],
        shifts: shiftsRes.data ?? [],
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat opsi filter",
    };
  }
}

// Fetch paginated daily matrix recapitulation from v_rekap
export async function getRekapHarianAction(
  params: RekapFilterParams
): Promise<{ success: boolean; data?: RekapHarianData; error?: string }> {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "admin_ga") {
      return { success: false, error: "Akses ditolak: Hanya Admin GA yang diizinkan." };
    }

    const val = validateRekapRange(params.dari, params.sampai);
    if (!val.isValid) {
      return { success: false, error: val.error };
    }

    const supabase = await createClient();
    const rpcRes = await supabase.rpc("get_rekap_harian", {
      p_dari: params.dari,
      p_sampai: params.sampai,
      p_vendor_id: params.vendorId || null,
      p_bagian_id: params.bagianId || null,
      p_shift_id: params.shiftId || null,
      p_page: params.page ?? 1,
      p_page_size: params.pageSize ?? 20,
    });

    if (!rpcRes.error && rpcRes.data) {
      return { success: true, data: rpcRes.data as RekapHarianData };
    }

    // Fallback: Query directly from v_rekap if RPC is not yet registered
    return await queryRekapHarianFallback(supabase, params);
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat data rekap harian",
    };
  }
}

// Fetch aggregated multi-dimensional summary analytics from v_rekap
export async function getRekapRingkasanAction(
  params: RekapFilterParams
): Promise<{ success: boolean; data?: RekapRingkasanData; error?: string }> {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "admin_ga") {
      return { success: false, error: "Akses ditolak: Hanya Admin GA yang diizinkan." };
    }

    const val = validateRekapRange(params.dari, params.sampai);
    if (!val.isValid) {
      return { success: false, error: val.error };
    }

    const supabase = await createClient();
    const rpcRes = await supabase.rpc("get_rekap_ringkasan", {
      p_dari: params.dari,
      p_sampai: params.sampai,
      p_vendor_id: params.vendorId || null,
      p_bagian_id: params.bagianId || null,
      p_shift_id: params.shiftId || null,
    });

    if (!rpcRes.error && rpcRes.data) {
      return { success: true, data: rpcRes.data as RekapRingkasanData };
    }

    // Fallback: Aggregate directly from v_rekap
    return await queryRekapRingkasanFallback(supabase, params);
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat ringkasan rekapitulasi",
    };
  }
}

// TypeScript Supabase query fallback for rekap harian matrix
async function queryRekapHarianFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: RekapFilterParams
): Promise<{ success: boolean; data?: RekapHarianData; error?: string }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  // 1. Get active columns
  let bagianQuery = supabase
    .from("bagian")
    .select("id, kode, nama, kelompok, urutan")
    .eq("aktif", true)
    .order("urutan", { ascending: true });

  if (params.bagianId) {
    bagianQuery = bagianQuery.eq("id", params.bagianId);
  }
  const bagianRes = await bagianQuery;
  const columns: RekapColumn[] = (bagianRes.data ?? []).map((b: { id: string; kode: string; nama: string; kelompok: string; urutan: number }) => ({
    id: b.id,
    kode: b.kode,
    nama: b.nama,
    kelompok: b.kelompok,
    urutan: b.urutan,
  }));

  // 2. Query v_rekap
  let query = supabase
    .from("v_rekap")
    .select(
      "period_id, tanggal, shift_id, shift_nama, shift_label, shift_urutan_laporan, vendor_id, vendor_kode, vendor_nama, bagian_id, jumlah_porsi"
    )
    .gte("tanggal", params.dari)
    .lte("tanggal", params.sampai);

  if (params.vendorId) query = query.eq("vendor_id", params.vendorId);
  if (params.bagianId) query = query.eq("bagian_id", params.bagianId);
  if (params.shiftId) query = query.eq("shift_id", params.shiftId);

  const { data, error } = await query;
  if (error) throw error;

  // 3. Group by period
  const periodMap = new Map<string, RekapHarianRow>();
  const summaryTotals: Record<string, number> = {};
  let grandTotal = 0;

  for (const item of data ?? []) {
    const key = item.period_id;
    if (!periodMap.has(key)) {
      periodMap.set(key, {
        period_id: item.period_id,
        tanggal: item.tanggal,
        shift_id: item.shift_id,
        shift_nama: item.shift_nama,
        shift_label: item.shift_label,
        shift_urutan_laporan: item.shift_urutan_laporan ?? 0,
        vendor_id: item.vendor_id,
        vendor_kode: item.vendor_kode,
        vendor_nama: item.vendor_nama,
        total_porsi: 0,
        items: {},
      });
    }

    const row = periodMap.get(key)!;
    const porsi = Number(item.jumlah_porsi) || 0;
    row.items[item.bagian_id] = (row.items[item.bagian_id] || 0) + porsi;
    row.total_porsi += porsi;

    summaryTotals[item.bagian_id] = (summaryTotals[item.bagian_id] || 0) + porsi;
    grandTotal += porsi;
  }

  // Sort periods by date descending and shift urutan ascending
  const allRows = Array.from(periodMap.values()).sort((a, b) => {
    if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
    return a.shift_urutan_laporan - b.shift_urutan_laporan;
  });

  const totalRows = allRows.length;
  const offset = (page - 1) * pageSize;
  const pagedRows = allRows.slice(offset, offset + pageSize);

  return {
    success: true,
    data: {
      columns,
      rows: pagedRows,
      summary_totals: summaryTotals,
      grand_total: grandTotal,
      total_rows: totalRows,
      page,
      page_size: pageSize,
    },
  };
}

// TypeScript Supabase query fallback for rekap ringkasan analytics
async function queryRekapRingkasanFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: RekapFilterParams
): Promise<{ success: boolean; data?: RekapRingkasanData; error?: string }> {
  let query = supabase
    .from("v_rekap")
    .select(
      "period_id, tanggal, shift_id, shift_nama, shift_label, shift_urutan_laporan, vendor_id, vendor_kode, vendor_nama, bagian_id, bagian_nama, bagian_kelompok, jumlah_porsi"
    )
    .gte("tanggal", params.dari)
    .lte("tanggal", params.sampai);

  if (params.vendorId) query = query.eq("vendor_id", params.vendorId);
  if (params.bagianId) query = query.eq("bagian_id", params.bagianId);
  if (params.shiftId) query = query.eq("shift_id", params.shiftId);

  const { data, error } = await query;
  if (error) throw error;

  let totalPorsi = 0;
  const uniqueDates = new Set<string>();
  const uniquePeriods = new Set<string>();

  const bagianMap = new Map<string, { nama: string; kelompok: string; total: number }>();
  const shiftMap = new Map<string, { nama: string; label: string; urutan: number; total: number }>();
  const vendorMap = new Map<string, { nama: string; kode: string; total: number }>();
  const monthMap = new Map<string, { total: number; dates: Set<string> }>();

  for (const item of data ?? []) {
    const porsi = Number(item.jumlah_porsi) || 0;
    totalPorsi += porsi;
    uniqueDates.add(item.tanggal);
    uniquePeriods.add(item.period_id);

    // Bagian
    if (!bagianMap.has(item.bagian_id)) {
      bagianMap.set(item.bagian_id, {
        nama: item.bagian_nama,
        kelompok: item.bagian_kelompok,
        total: 0,
      });
    }
    bagianMap.get(item.bagian_id)!.total += porsi;

    // Shift
    if (!shiftMap.has(item.shift_id)) {
      shiftMap.set(item.shift_id, {
        nama: item.shift_nama,
        label: item.shift_label,
        urutan: item.shift_urutan_laporan ?? 0,
        total: 0,
      });
    }
    shiftMap.get(item.shift_id)!.total += porsi;

    // Vendor
    if (!vendorMap.has(item.vendor_id)) {
      vendorMap.set(item.vendor_id, {
        nama: item.vendor_nama,
        kode: item.vendor_kode,
        total: 0,
      });
    }
    vendorMap.get(item.vendor_id)!.total += porsi;

    // Month
    const mKey = item.tanggal.slice(0, 7);
    if (!monthMap.has(mKey)) {
      monthMap.set(mKey, { total: 0, dates: new Set() });
    }
    const mEntry = monthMap.get(mKey)!;
    mEntry.total += porsi;
    mEntry.dates.add(item.tanggal);
  }

  const val = validateRekapRange(params.dari, params.sampai);
  const totalDays = val.days > 0 ? val.days : 1;
  const avgPorsi = Math.round((totalPorsi / totalDays) * 10) / 10;

  const perBagian = Array.from(bagianMap.entries())
    .map(([id, b]) => ({
      bagian_id: id,
      bagian_nama: b.nama,
      bagian_kelompok: b.kelompok,
      total_porsi: b.total,
      persentase: totalPorsi > 0 ? Math.round((b.total / totalPorsi) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total_porsi - a.total_porsi);

  const perShift = Array.from(shiftMap.entries())
    .map(([id, s]) => ({
      shift_id: id,
      shift_nama: s.nama,
      shift_label: s.label,
      urutan_laporan: s.urutan,
      total_porsi: s.total,
      persentase: totalPorsi > 0 ? Math.round((s.total / totalPorsi) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.urutan_laporan - b.urutan_laporan);

  const perVendor = Array.from(vendorMap.entries())
    .map(([id, v]) => ({
      vendor_id: id,
      vendor_nama: v.nama,
      vendor_kode: v.kode,
      total_porsi: v.total,
      persentase: totalPorsi > 0 ? Math.round((v.total / totalPorsi) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.vendor_kode.localeCompare(b.vendor_kode));

  const perBulan = Array.from(monthMap.entries())
    .map(([mKey, m]) => ({
      bulan_key: mKey,
      total_porsi: m.total,
      hari_count: m.dates.size,
      persentase: totalPorsi > 0 ? Math.round((m.total / totalPorsi) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.bulan_key.localeCompare(b.bulan_key));

  return {
    success: true,
    data: {
      metrics: {
        total_porsi: totalPorsi,
        rata_rata_porsi_per_hari: avgPorsi,
        total_hari_operasional: uniqueDates.size,
        total_periode: uniquePeriods.size,
      },
      per_bagian: perBagian,
      per_shift: perShift,
      per_vendor: perVendor,
      per_bulan: perBulan,
    },
  };
}
