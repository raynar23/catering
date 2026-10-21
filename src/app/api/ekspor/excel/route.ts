import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import {
  validateRekapRange,
  partitionRangeByMonth,
  generateExportFilename,
} from "@/lib/rekap";
import {
  buildExcelWorkbookModel,
  ExportBagianItem,
  ExportShiftItem,
  ExportVendorItem,
  ExportOrderItem,
} from "@/lib/export/excel-model";
import { writeExcelWorkbook } from "@/lib/export/excel-writer";

// Route handler generating structured Excel spreadsheet reports for Admin GA
export async function GET(request: NextRequest) {
  try {
    // 1. Role verification: Strictly restricted to active admin_ga
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "admin_ga") {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Admin GA yang memiliki wewenang mengunduh data rekapitulasi." },
        { status: 403 }
      );
    }

    // 2. Query parameter extraction
    const { searchParams } = new URL(request.url);
    const dari = searchParams.get("dari");
    const sampai = searchParams.get("sampai");
    const catatan = searchParams.get("catatan") || undefined;
    const vendorId = searchParams.get("vendorId") || undefined;
    const bagianId = searchParams.get("bagianId") || undefined;
    const shiftId = searchParams.get("shiftId") || undefined;

    if (!dari || !sampai) {
      return NextResponse.json(
        { error: "Parameter tanggal mulai (dari) dan tanggal akhir (sampai) wajib disertakan." },
        { status: 400 }
      );
    }

    // 3. Date range limit validation (max 366 days)
    const rangeValidation = validateRekapRange(dari, sampai, 366);
    if (!rangeValidation.isValid) {
      return NextResponse.json({ error: rangeValidation.error }, { status: 400 });
    }

    // 4. Fetch database records from Supabase
    const supabase = await createClient();

    let bagianQuery = supabase
      .from("bagian")
      .select("id, kode, nama, kelompok, urutan, lokasi_antar, catatan_antar")
      .eq("aktif", true)
      .order("urutan", { ascending: true });
    if (bagianId) bagianQuery = bagianQuery.eq("id", bagianId);

    const [bagianRes, shiftsRes, vendorsRes] = await Promise.all([
      bagianQuery,
      supabase.from("shifts").select("id, nama, label, alias, urutan_laporan, batas_tiba").order("urutan_laporan"),
      supabase.from("vendors").select("id, kode, nama").eq("aktif", true).order("kode"),
    ]);

    const bagianList: ExportBagianItem[] = (bagianRes.data ?? []).map((b) => ({
      id: b.id,
      kode: b.kode,
      nama: b.nama,
      kelompok: b.kelompok,
      urutan: b.urutan,
      lokasi_antar: b.lokasi_antar,
      catatan_antar: b.catatan_antar,
    }));

    const shiftsList: ExportShiftItem[] = (shiftsRes.data ?? []).map((s) => ({
      id: s.id,
      nama: s.nama,
      label: s.label,
      alias: s.alias,
      urutan_laporan: s.urutan_laporan,
      batas_tiba: s.batas_tiba || "00:00",
    }));

    const vendorsList: ExportVendorItem[] = (vendorsRes.data ?? []).map((v) => ({
      id: v.id,
      kode: v.kode,
      nama: v.nama,
    }));

    // Query catering orders from v_rekap
    let ordersQuery = supabase
      .from("v_rekap")
      .select("tanggal, shift_id, bagian_id, vendor_id, jumlah_porsi")
      .gte("tanggal", dari)
      .lte("tanggal", sampai);

    if (vendorId) ordersQuery = ordersQuery.eq("vendor_id", vendorId);
    if (bagianId) ordersQuery = ordersQuery.eq("bagian_id", bagianId);
    if (shiftId) ordersQuery = ordersQuery.eq("shift_id", shiftId);

    const { data: ordersData, error: ordersErr } = await ordersQuery;
    if (ordersErr) throw ordersErr;

    const orders: ExportOrderItem[] = (ordersData ?? []).map((o) => ({
      tanggal: o.tanggal,
      shift_id: o.shift_id,
      bagian_id: o.bagian_id,
      vendor_id: o.vendor_id,
      jumlah_porsi: Number(o.jumlah_porsi) || 0,
    }));

    // 5. Partition months and assemble pure Excel model
    const monthPartitions = partitionRangeByMonth(dari, sampai);
    const model = buildExcelWorkbookModel({
      monthPartitions,
      bagianList,
      shiftsList,
      vendorsList,
      orders,
      catatan,
    });

    // 6. Generate binary spreadsheet buffer
    const buffer = await writeExcelWorkbook(model);
    const filename = generateExportFilename("excel", dari, sampai);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan saat mengekspor Excel." },
      { status: 500 }
    );
  }
}
