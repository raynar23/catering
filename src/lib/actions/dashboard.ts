"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import {
  DashboardSummaryData,
  getPreviousPeriodRange,
  DailyPoint,
  ShiftPoint,
  BagianPoint,
  VendorPoint,
} from "@/lib/dashboard";
import { parseISO, format, differenceInCalendarDays, addDays } from "date-fns";

export interface DashboardActionResult {
  success: boolean;
  data?: DashboardSummaryData;
  error?: string;
}

// Retrieve unified dashboard KPI and analytical series in a single roundtrip
export async function getDashboardSummaryAction(
  dari: string,
  sampai: string
): Promise<DashboardActionResult> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return {
      success: false,
      error: "Akses ditolak: Hanya Admin GA yang berhak mengakses dashboard",
    };
  }

  // Basic date validation
  if (sampai < dari) {
    return {
      success: false,
      error: "Tanggal akhir tidak boleh lebih awal dari tanggal mulai",
    };
  }

  const dayCount = differenceInCalendarDays(parseISO(sampai), parseISO(dari)) + 1;
  if (dayCount > 366) {
    return {
      success: false,
      error: "Rentang waktu maksimal adalah 366 hari",
    };
  }

  const supabase = await createClient();

  // 1. Attempt primary fast execution via atomic PostgreSQL RPC
  const { data: rpcData, error: rpcErr } = await supabase.rpc("dashboard_ringkasan", {
    p_dari: dari,
    p_sampai: sampai,
  });

  if (!rpcErr && rpcData) {
    return {
      success: true,
      data: rpcData as DashboardSummaryData,
    };
  }

  // 2. High-resilience fallback if migration 013 is not yet deployed on remote DB
  try {
    const prevRange = getPreviousPeriodRange(dari, sampai);

    // Fetch current and previous periods from v_rekap
    const [currentRes, prevRes, revRes, pendingRevRes, uninputRes, shiftsRes, bagiansRes, vendorsRes] =
      await Promise.all([
        supabase
          .from("v_rekap")
          .select("tanggal, shift_id, shift_nama, shift_label, shift_urutan, bagian_id, bagian_nama, bagian_kelompok, bagian_urutan, vendor_id, vendor_nama, vendor_kode, jumlah_porsi")
          .gte("tanggal", dari)
          .lte("tanggal", sampai),
        supabase
          .from("v_rekap")
          .select("tanggal, jumlah_porsi")
          .gte("tanggal", prevRange.dari)
          .lte("tanggal", prevRange.sampai),
        supabase
          .from("revisions")
          .select("id, status, item:catering_items!inner(order:catering_orders!inner(period:periods!inner(tanggal)))")
          .gte("item.order.period.tanggal", dari)
          .lte("item.order.period.tanggal", sampai),
        supabase
          .from("revisions")
          .select("id, status, item:catering_items!inner(order:catering_orders!inner(period:periods!inner(tanggal)))")
          .eq("status", "menunggu")
          .gte("item.order.period.tanggal", dari)
          .lte("item.order.period.tanggal", sampai),
        supabase
          .from("periods")
          .select("id, tanggal, catering_orders(id)")
          .gte("tanggal", format(new Date(), "yyyy-MM-dd"))
          .lte("tanggal", format(addDays(new Date(), 1), "yyyy-MM-dd")),
        supabase
          .from("shifts")
          .select("id, nama, label, urutan")
          .eq("aktif", true)
          .order("urutan"),
        supabase
          .from("bagian")
          .select("id, nama, kelompok, urutan")
          .eq("aktif", true)
          .order("urutan"),
        supabase
          .from("vendors")
          .select("id, nama, kode, urutan_rotasi")
          .eq("aktif", true)
          .order("urutan_rotasi"),
      ]);

    const currentRecords = currentRes.data ?? [];
    const prevRecords = prevRes.data ?? [];

    const totalPorsi = currentRecords.reduce((acc, curr) => acc + (curr.jumlah_porsi ?? 0), 0);
    const avgPorsiPerHari = Math.round((totalPorsi / dayCount) * 10) / 10;
    const jumlahRevisi = revRes.data?.length ?? 0;
    const revisiMenunggu = pendingRevRes.data?.length ?? 0;

    // Uninput periods for today and tomorrow without catering_orders
    const belumInput =
      uninputRes.data?.filter(
        (p) => !p.catering_orders || (Array.isArray(p.catering_orders) && p.catering_orders.length === 0)
      ).length ?? 0;

    // Generate daily points for current range
    const seriHarian: DailyPoint[] = [];
    const currentDayMap = new Map<string, number>();
    currentRecords.forEach((r) => {
      currentDayMap.set(r.tanggal, (currentDayMap.get(r.tanggal) ?? 0) + (r.jumlah_porsi ?? 0));
    });

    const startObj = parseISO(dari);
    for (let i = 0; i < dayCount; i++) {
      const dStr = format(addDays(startObj, i), "yyyy-MM-dd");
      seriHarian.push({
        tanggal: dStr,
        total_porsi: currentDayMap.get(dStr) ?? 0,
      });
    }

    // Generate daily points for previous window
    const seriPrev: DailyPoint[] = [];
    const prevDayMap = new Map<string, number>();
    prevRecords.forEach((r) => {
      prevDayMap.set(r.tanggal, (prevDayMap.get(r.tanggal) ?? 0) + (r.jumlah_porsi ?? 0));
    });

    const prevStartObj = parseISO(prevRange.dari);
    for (let i = 0; i < dayCount; i++) {
      const dStr = format(addDays(prevStartObj, i), "yyyy-MM-dd");
      seriPrev.push({
        tanggal: dStr,
        total_porsi: prevDayMap.get(dStr) ?? 0,
      });
    }

    // Shift breakdown
    const shiftMap = new Map<string, number>();
    currentRecords.forEach((r) => {
      shiftMap.set(r.shift_id, (shiftMap.get(r.shift_id) ?? 0) + (r.jumlah_porsi ?? 0));
    });
    const seriShift: ShiftPoint[] = (shiftsRes.data ?? []).map((s) => {
      const porsi = shiftMap.get(s.id) ?? 0;
      const persentase = totalPorsi > 0 ? Math.round((porsi / totalPorsi) * 1000) / 10 : 0;
      return {
        shift_id: s.id,
        shift_nama: s.nama,
        shift_label: s.label,
        urutan: s.urutan,
        total_porsi: porsi,
        persentase,
      };
    });

    // Bagian breakdown
    const bagianMap = new Map<string, number>();
    currentRecords.forEach((r) => {
      bagianMap.set(r.bagian_id, (bagianMap.get(r.bagian_id) ?? 0) + (r.jumlah_porsi ?? 0));
    });
    const seriBagian: BagianPoint[] = (bagiansRes.data ?? []).map((b) => ({
      bagian_id: b.id,
      bagian_nama: b.nama,
      kelompok: b.kelompok ?? "Umum",
      urutan: b.urutan,
      total_porsi: bagianMap.get(b.id) ?? 0,
    })).sort((a, b) => b.total_porsi - a.total_porsi || a.urutan - b.urutan);

    // Vendor breakdown
    const vendorMap = new Map<string, number>();
    currentRecords.forEach((r) => {
      vendorMap.set(r.vendor_id, (vendorMap.get(r.vendor_id) ?? 0) + (r.jumlah_porsi ?? 0));
    });
    const seriVendor: VendorPoint[] = (vendorsRes.data ?? []).map((v) => {
      const porsi = vendorMap.get(v.id) ?? 0;
      const persentase = totalPorsi > 0 ? Math.round((porsi / totalPorsi) * 1000) / 10 : 0;
      return {
        vendor_id: v.id,
        vendor_nama: v.nama,
        vendor_kode: v.kode,
        urutan_rotasi: v.urutan_rotasi,
        total_porsi: porsi,
        persentase,
      };
    });

    return {
      success: true,
      data: {
        dari,
        sampai,
        total_porsi: totalPorsi,
        rata_rata_porsi_per_hari: avgPorsiPerHari,
        jumlah_revisi: jumlahRevisi,
        revisi_menunggu: revisiMenunggu,
        belum_input_hari_ini_besok: belumInput,
        seri_harian: seriHarian,
        seri_periode_sebelumnya: seriPrev,
        seri_shift: seriShift,
        seri_bagian: seriBagian,
        seri_vendor: seriVendor,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat ringkasan data dashboard";
    return {
      success: false,
      error: msg,
    };
  }
}
