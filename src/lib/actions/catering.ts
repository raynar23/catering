"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { revalidatePath } from "next/cache";
import {
  BagianRowItem,
  ShiftColumnState,
  CellValue,
} from "@/lib/catering/grid-reducer";

export interface DateCateringData {
  tanggal: string;
  hasPeriods: boolean;
  bagianList: BagianRowItem[];
  shifts: Record<string, ShiftColumnState>;
  shiftOrder: string[];
}

export interface DirtyItemInput {
  bagian_id: string;
  jumlah_karyawan: number;
  jumlah_porsi: number;
  keterangan: string;
}

export interface CateringActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// Fetch all catering data for a given date formatted for the 3-shift grid
export async function getDateCateringData(
  tanggal: string
): Promise<DateCateringData> {
  const supabase = await createClient();

  // 1. Fetch active departments ordered by urutan and nama
  const { data: bagianData, error: bagianErr } = await supabase
    .from("bagian")
    .select("id, kode, nama, lokasi_antar, urutan")
    .eq("aktif", true)
    .order("urutan", { ascending: true })
    .order("nama", { ascending: true });

  if (bagianErr) {
    console.error("Failed to fetch bagian:", bagianErr);
    throw new Error("Gagal memuat data bagian");
  }

  const bagianList: BagianRowItem[] = (bagianData || []).map((b) => ({
    id: b.id,
    kode: b.kode,
    nama: b.nama,
    lokasi_antar: b.lokasi_antar,
    urutan: b.urutan,
  }));

  // 2. Fetch active shifts ordered by urutan_laporan (Shift 3, Shift 1, Shift 2)
  const { data: shiftsData, error: shiftsErr } = await supabase
    .from("shifts")
    .select("id, nama, label, jam_mulai, jam_selesai, urutan_laporan")
    .eq("aktif", true)
    .order("urutan_laporan", { ascending: true });

  if (shiftsErr) {
    console.error("Failed to fetch shifts:", shiftsErr);
    throw new Error("Gagal memuat master shift");
  }

  // 3. Fetch periods for the date with vendor details
  const { data: periodsData, error: periodsErr } = await supabase
    .from("periods")
    .select(
      `
      id,
      tanggal,
      shift_id,
      vendor_id,
      vendor:vendors (id, kode, nama)
    `
    )
    .eq("tanggal", tanggal);

  if (periodsErr) {
    console.error("Failed to fetch periods:", periodsErr);
    throw new Error("Gagal memuat jadwal periode");
  }

interface PeriodQueryResult {
  id: string;
  tanggal: string;
  shift_id: string;
  vendor_id: string;
  vendor?: { id: string; kode: string; nama: string } | null;
}

interface OrderLogQueryResult {
  id: string;
  aksi: string;
  keterangan: string;
  created_at: string;
  profile?: { nama: string } | null;
}

interface OrderQueryResult {
  id: string;
  period_id: string;
  status: string;
  respon_vendor: string;
  progres_vendor: string;
  catatan: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  submitted_by: string | null;
  created_profile?: { nama: string } | null;
  submitted_profile?: { nama: string } | null;
  logs?: OrderLogQueryResult[];
}

interface CateringItemQueryResult {
  id: string;
  order_id: string;
  bagian_id: string;
  jumlah_karyawan: number;
  jumlah_porsi: number;
  keterangan: string | null;
}

  const hasPeriods = Boolean(periodsData && periodsData.length > 0);
  const periodMap = new Map<string, PeriodQueryResult>();
  const periodIds: string[] = [];

  for (const p of (periodsData as unknown as PeriodQueryResult[]) || []) {
    periodMap.set(p.shift_id, p);
    periodIds.push(p.id);
  }

  // 4. Fetch orders for periods on this date
  const ordersMap = new Map<string, OrderQueryResult>();
  const orderIds: string[] = [];

  if (periodIds.length > 0) {
    const { data: ordersData, error: ordersErr } = await supabase
      .from("catering_orders")
      .select(
        `
        id,
        period_id,
        status,
        respon_vendor,
        progres_vendor,
        catatan,
        created_at,
        updated_at,
        created_by,
        submitted_by,
        created_profile:profiles!catering_orders_created_by_fkey (nama),
        submitted_profile:profiles!catering_orders_submitted_by_fkey (nama),
        logs:order_logs (
          id,
          aksi,
          keterangan,
          created_at,
          profile:profiles!order_logs_oleh_fkey (nama)
        )
      `
      )
      .in("period_id", periodIds);

    if (ordersErr) {
      console.error("Failed to fetch orders:", ordersErr);
    } else {
      for (const ord of (ordersData as unknown as OrderQueryResult[]) || []) {
        ordersMap.set(ord.period_id, ord);
        orderIds.push(ord.id);
      }
    }
  }

  // 5. Fetch catering items for existing orders
  const itemsMap = new Map<string, Map<string, CateringItemQueryResult>>();
  const allItemIds: string[] = [];
  if (orderIds.length > 0) {
    const { data: itemsData, error: itemsErr } = await supabase
      .from("catering_items")
      .select("id, order_id, bagian_id, jumlah_karyawan, jumlah_porsi, keterangan")
      .in("order_id", orderIds);

    if (itemsErr) {
      console.error("Failed to fetch catering items:", itemsErr);
    } else {
      for (const item of (itemsData as unknown as CateringItemQueryResult[]) || []) {
        allItemIds.push(item.id);
        if (!itemsMap.has(item.order_id)) {
          itemsMap.set(item.order_id, new Map());
        }
        itemsMap.get(item.order_id)!.set(item.bagian_id, item);
      }
    }
  }

  // 5b. Fetch pending revisions for these items to mark cells with revisions pending
  const pendingRevisionItemIds = new Set<string>();
  if (allItemIds.length > 0) {
    const { data: pendingRevs, error: revErr } = await supabase
      .from("revisions")
      .select("item_id")
      .eq("status", "menunggu")
      .in("item_id", allItemIds);

    if (!revErr && pendingRevs) {
      for (const r of pendingRevs) {
        pendingRevisionItemIds.add(r.item_id);
      }
    }
  }

  // 6. Build ShiftColumnState for each shift in urutan_laporan order
  const shifts: Record<string, ShiftColumnState> = {};
  const shiftOrder: string[] = [];

  for (const s of shiftsData || []) {
    shiftOrder.push(s.id);
    const period = periodMap.get(s.id);
    const order = period ? ordersMap.get(period.id) : null;
    const vendor = period?.vendor;

    // Determine last updated user name and timestamp
    let lastUpdatedBy: string | null = null;
    let lastUpdatedAt: string | null = null;

    if (order) {
      const logs = (order.logs || []).sort(
        (a: OrderLogQueryResult, b: OrderLogQueryResult) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      if (logs.length > 0 && logs[0].profile?.nama) {
        lastUpdatedBy = logs[0].profile.nama;
        lastUpdatedAt = logs[0].created_at;
      } else if (order.submitted_profile?.nama) {
        lastUpdatedBy = order.submitted_profile.nama;
        lastUpdatedAt = order.updated_at;
      } else if (order.created_profile?.nama) {
        lastUpdatedBy = order.created_profile.nama;
        lastUpdatedAt = order.created_at;
      }
    }

    // Build department cells
    const cells: Record<string, CellValue> = {};
    const orderItems = order ? itemsMap.get(order.id) : null;

    for (const b of bagianList) {
      const item = orderItems?.get(b.id);
      if (item) {
        const isCustom = item.jumlah_karyawan !== item.jumlah_porsi;
        cells[b.id] = {
          itemId: item.id,
          karyawan: item.jumlah_karyawan,
          porsi: item.jumlah_porsi,
          keterangan: item.keterangan || "",
          isCustomPorsi: isCustom,
          isDirty: false,
          hasPendingRevision: pendingRevisionItemIds.has(item.id),
        };
      } else {
        cells[b.id] = {
          itemId: null,
          karyawan: null,
          porsi: null,
          keterangan: "",
          isCustomPorsi: false,
          isDirty: false,
          hasPendingRevision: false,
        };
      }
    }

    shifts[s.id] = {
      periodId: period?.id ?? null,
      orderId: order?.id ?? null,
      shiftId: s.id,
      shiftNama: s.nama,
      shiftLabel: s.label,
      jamMulai: s.jam_mulai,
      jamSelesai: s.jam_selesai,
      vendorId: vendor?.id ?? null,
      vendorNama: vendor?.nama ?? null,
      vendorKode: vendor?.kode ?? null,
      status: order?.status ?? (period ? "belum_input" : "tidak_ada_periode"),
      responVendor: order?.respon_vendor ?? "menunggu",
      progresVendor: order?.progres_vendor ?? "menunggu",
      lastUpdatedBy,
      lastUpdatedAt,
      cells,
    };
  }

  return {
    tanggal,
    hasPeriods,
    bagianList,
    shifts,
    shiftOrder,
  };
}

// Save draft catering order (sends only dirty items)
export async function simpanCateringDraftAction(params: {
  periodId: string;
  shiftId: string;
  items: DirtyItemInput[];
  catatan?: string;
}): Promise<CateringActionResult<{ orderId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return {
      success: false,
      error: "Akses ditolak: Hanya Admin GA yang dapat menyimpan data catering.",
    };
  }

  if (!params.periodId) {
    return {
      success: false,
      error: "ID Periode tidak valid atau jadwal belum dibuat.",
    };
  }

  const supabase = await createClient();

  // Call simpan_catering RPC
  const { data: orderId, error: rpcErr } = await supabase.rpc(
    "simpan_catering",
    {
      p_period_id: params.periodId,
      p_items: params.items,
      p_catatan: params.catatan || null,
    }
  );

  if (rpcErr) {
    console.error("simpan_catering RPC error:", rpcErr);
    return {
      success: false,
      error: rpcErr.message || "Gagal menyimpan draft catering.",
    };
  }

  revalidatePath("/admin/input-catering");
  revalidatePath("/admin/input");
  revalidatePath("/admin/periode");

  return {
    success: true,
    message: "Draft berhasil disimpan.",
    data: { orderId: orderId as string },
  };
}

// Finalize and send catering order to vendor
export async function kirimCateringAction(params: {
  periodId: string;
  orderId?: string | null;
  items?: DirtyItemInput[];
  catatan?: string;
}): Promise<CateringActionResult<{ orderId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return {
      success: false,
      error: "Akses ditolak: Hanya Admin GA yang dapat mengirim pesanan ke vendor.",
    };
  }

  const supabase = await createClient();
  let effectiveOrderId = params.orderId;

  // If order does not exist or has unsaved items, save draft first
  if (!effectiveOrderId || (params.items && params.items.length > 0)) {
    const { data: savedOrderId, error: saveErr } = await supabase.rpc(
      "simpan_catering",
      {
        p_period_id: params.periodId,
        p_items: params.items || [],
        p_catatan: params.catatan || null,
      }
    );

    if (saveErr) {
      console.error("simpan_catering prior to kirim error:", saveErr);
      return {
        success: false,
        error: saveErr.message || "Gagal menyimpan data sebelum pengiriman.",
      };
    }
    effectiveOrderId = savedOrderId as string;
  }

  // Call kirim_catering RPC
  const { data: finalOrderId, error: kirimErr } = await supabase.rpc(
    "kirim_catering",
    {
      p_order_id: effectiveOrderId,
      p_catatan: params.catatan || null,
    }
  );

  if (kirimErr) {
    console.error("kirim_catering RPC error:", kirimErr);
    return {
      success: false,
      error: kirimErr.message || "Gagal mengirim pesanan ke vendor.",
    };
  }

  revalidatePath("/admin/input-catering");
  revalidatePath("/admin/input");
  revalidatePath("/admin/periode");

  return {
    success: true,
    message: "Pesanan berhasil difinalisasi dan dikirim ke vendor.",
    data: { orderId: finalOrderId as string },
  };
}
