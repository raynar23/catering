import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/profile";
import { validateRekapRange, generateExportFilename } from "@/lib/rekap";
import {
  getRekapHarianAction,
  getRekapRingkasanAction,
} from "@/lib/actions/rekap";
import { generatePdfReport } from "@/lib/export/pdf-writer";

// Route handler generating official corporate A4 landscape PDF reports for Admin GA
export async function GET(request: NextRequest) {
  try {
    // 1. Role verification: Restricted to active admin_ga
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "admin_ga") {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Admin GA yang memiliki wewenang mengunduh laporan PDF." },
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

    // 4. Fetch daily matrix data and summary distribution
    const [harianRes, ringkasanRes] = await Promise.all([
      getRekapHarianAction({
        dari,
        sampai,
        vendorId,
        bagianId,
        shiftId,
        page: 1,
        pageSize: 1000, // Export all periods in range
      }),
      getRekapRingkasanAction({
        dari,
        sampai,
        vendorId,
        bagianId,
        shiftId,
      }),
    ]);

    if (!harianRes.success || !harianRes.data) {
      throw new Error(harianRes.error || "Gagal memuat data rekap harian");
    }

    const harianData = harianRes.data;
    const ringkasanData = ringkasanRes.data;

    // 5. Generate PDF document buffer
    const buffer = await generatePdfReport({
      dari,
      sampai,
      columns: harianData.columns,
      rows: harianData.rows,
      summaryTotals: harianData.summary_totals,
      grandTotal: harianData.grand_total,
      perShift: ringkasanData?.per_shift ?? [],
      perVendor: ringkasanData?.per_vendor ?? [],
      catatan,
    });

    const filename = generateExportFilename("pdf", dari, sampai);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Terjadi kesalahan saat membuat berkas PDF." },
      { status: 500 }
    );
  }
}
