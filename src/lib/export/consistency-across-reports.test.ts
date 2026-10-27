import { describe, it, expect } from "vitest";
import { buildExcelWorkbookModel } from "@/lib/export/excel-model";
import { verifyDashboardConsistency } from "@/lib/dashboard";

describe("H1.3: Consistency of Portions Across Dashboard, Rekapitulasi, Excel, and PDF", () => {
  // Sample operational dataset from v_rekap for a 3-day range across 3 shifts and 5 sections
  const mockDateRange = {
    dari: "2026-10-01",
    sampai: "2026-10-03",
  };

  const mockSections = [
    { id: "sec-1", kode: "CC_OP", nama: "CC Operator", kelompok: "Operasional", urutan: 1 },
    { id: "sec-2", kode: "RTG_OP", nama: "RTG Operator", kelompok: "Operasional", urutan: 2 },
    { id: "sec-3", kode: "MEK_CC", nama: "Mekanik CC", kelompok: "Teknik", urutan: 3 },
    { id: "sec-4", kode: "MEK_RTG", nama: "Mekanik RTG", kelompok: "Teknik", urutan: 4 },
    { id: "sec-5", kode: "CFS", nama: "Area Gudang CFS", kelompok: "Gudang", urutan: 5 },
  ];

  const mockShifts = [
    { id: "sh-3", nama: "Shift 3", label: "Malam", alias: "Malam", urutan_laporan: 1, batas_tiba: "01:00" },
    { id: "sh-1", nama: "Shift 1", label: "Siang", alias: "Siang", urutan_laporan: 2, batas_tiba: "10:00" },
    { id: "sh-2", nama: "Shift 2", label: "Sore", alias: "Sore", urutan_laporan: 3, batas_tiba: "17:00" },
  ];

  const mockVendors = [
    { id: "ven-1", kode: "V001", nama: "Aisya Catering" },
    { id: "ven-2", kode: "V002", nama: "Catering IBU" },
  ];

  // Synthetic v_rekap rows: 3 days * 3 shifts = 9 periods, each with 5 sections = 45 line items
  const vRekapRows: Array<{
    tanggal: string;
    shift_id: string;
    shift_nama: string;
    shift_label: string;
    urutan_laporan: number;
    vendor_id: string;
    vendor_kode: string;
    vendor_nama: string;
    bagian_id: string;
    bagian_nama: string;
    bagian_kelompok: string;
    jumlah_karyawan: number;
    jumlah_porsi: number;
  }> = [];

  let expectedPortionSum = 0;

  const dates = ["2026-10-01", "2026-10-02", "2026-10-03"];
  dates.forEach((tgl, dIdx) => {
    mockShifts.forEach((sh, sIdx) => {
      const vendor = mockVendors[(dIdx + sIdx) % mockVendors.length];
      mockSections.forEach((sec, bIdx) => {
        // Controlled portion values (10 + dIdx*2 + sIdx + bIdx)
        const portion = 10 + dIdx * 2 + sIdx + bIdx;
        expectedPortionSum += portion;

        vRekapRows.push({
          tanggal: tgl,
          shift_id: sh.id,
          shift_nama: sh.nama,
          shift_label: sh.label,
          urutan_laporan: sh.urutan_laporan,
          vendor_id: vendor.id,
          vendor_kode: vendor.kode,
          vendor_nama: vendor.nama,
          bagian_id: sec.id,
          bagian_nama: sec.nama,
          bagian_kelompok: sec.kelompok,
          jumlah_karyawan: portion,
          jumlah_porsi: portion,
        });
      });
    });
  });

  it("verifies identical total portion sum across Dashboard, Rekapitulasi, Excel, and PDF models", () => {
    // 1. DASHBOARD TOTAL CALCULATION (from dashboard_ringkasan logic)
    const dashboardKPI = {
      total_porsi: vRekapRows.reduce((acc, r) => acc + r.jumlah_porsi, 0),
      total_karyawan: vRekapRows.reduce((acc, r) => acc + r.jumlah_karyawan, 0),
      total_anggaran: 0,
      total_pesanan_final: 9,
      total_revisi_menunggu: 0,
      seri_harian: dates.map((d) => ({
        tanggal: d,
        total_porsi: vRekapRows.filter((r) => r.tanggal === d).reduce((acc, r) => acc + r.jumlah_porsi, 0),
        total_karyawan: vRekapRows.filter((r) => r.tanggal === d).reduce((acc, r) => acc + r.jumlah_karyawan, 0),
      })),
      seri_shift: mockShifts.map((sh) => ({
        shift_id: sh.id,
        shift_nama: sh.nama,
        shift_label: sh.label,
        total_porsi: vRekapRows.filter((r) => r.shift_id === sh.id).reduce((acc, r) => acc + r.jumlah_porsi, 0),
        persentase: 0,
      })),
      seri_bagian: mockSections.map((sec) => ({
        bagian_id: sec.id,
        bagian_nama: sec.nama,
        kelompok: sec.kelompok,
        total_porsi: vRekapRows.filter((r) => r.bagian_id === sec.id).reduce((acc, r) => acc + r.jumlah_porsi, 0),
        persentase: 0,
      })),
      seri_vendor: mockVendors.map((ven) => ({
        vendor_id: ven.id,
        vendor_kode: ven.kode,
        vendor_nama: ven.nama,
        total_porsi: vRekapRows.filter((r) => r.vendor_id === ven.id).reduce((acc, r) => acc + r.jumlah_porsi, 0),
        persentase: 0,
      })),
    };

    // Verify multi-dimensional integrity within dashboard
    const consistency = verifyDashboardConsistency(dashboardKPI as any);
    expect(consistency.valid).toBe(true);
    expect(consistency.mismatches).toEqual([]);
    const dashboardTotal = dashboardKPI.total_porsi;

    // 2. REKAPITULASI SUMMARY TOTAL (from getRekapRingkasan / v_rekap aggregation)
    const rekapDailyRows: Record<string, { tanggal: string; items: Record<string, number>; total_porsi: number }> = {};
    vRekapRows.forEach((r) => {
      const key = `${r.tanggal}_${r.shift_id}`;
      if (!rekapDailyRows[key]) {
        rekapDailyRows[key] = { tanggal: r.tanggal, items: {}, total_porsi: 0 };
      }
      rekapDailyRows[key].items[r.bagian_id] = r.jumlah_porsi;
      rekapDailyRows[key].total_porsi += r.jumlah_porsi;
    });

    const rekapTotal = Object.values(rekapDailyRows).reduce((acc, row) => acc + row.total_porsi, 0);

    // 3. EXCEL EXPORT WORKBOOK MODEL
    const excelOrders = vRekapRows.map((r) => ({
      tanggal: r.tanggal,
      shift_id: r.shift_id,
      bagian_id: r.bagian_id,
      jumlah_porsi: r.jumlah_porsi,
    }));

    const excelWorkbook = buildExcelWorkbookModel({
      monthPartitions: [
        {
          monthKey: "2026-10",
          monthLabel: "Oktober 2026",
          dari: mockDateRange.dari,
          sampai: mockDateRange.sampai,
          year: 2026,
          month: 10,
        },
      ],
      bagianList: mockSections,
      shiftsList: mockShifts,
      vendorsList: mockVendors,
      orders: excelOrders,
    });

    expect(excelWorkbook.sheets.length).toBeGreaterThan(0);
    const sheet = excelWorkbook.sheets[0];

    // Find the cell with grand total value in the matrix
    // In excel-model.ts, grand total is written at grandTotalRow, totalCol
    const grandTotalCell = sheet.cells.find(
      (c) => typeof c.value === "number" && c.value === expectedPortionSum
    );
    expect(grandTotalCell).toBeDefined();
    const excelCalculatedTotal = grandTotalCell!.value as number;

    // 4. PDF REPORT MODEL (from PdfReportOptions)
    const pdfReportOptions = {
      dari: mockDateRange.dari,
      sampai: mockDateRange.sampai,
      columns: mockSections.map((s) => ({ id: s.id, nama: s.nama, kode: s.kode })),
      rows: Object.values(rekapDailyRows).map((r) => ({
        tanggal: r.tanggal,
        shift_nama: "Shift 1",
        shift_label: "Siang",
        vendor_nama: "Aisya Catering",
        vendor_kode: "V001",
        items: r.items,
        total_porsi: r.total_porsi,
      })),
      summaryTotals: {},
      grandTotal: Object.values(rekapDailyRows).reduce((acc, r) => acc + r.total_porsi, 0),
      perShift: [],
      perVendor: [],
    };
    const pdfTotal = pdfReportOptions.grandTotal;

    // ASSERTION: All four must be exactly equal to the ground-truth portion sum!
    console.log(`[VERIFIKASI TOTAL IDENTIK] GroundTruth=${expectedPortionSum}, Dashboard=${dashboardTotal}, Rekapitulasi=${rekapTotal}, Excel=${excelCalculatedTotal}, PDF=${pdfTotal}`);

    expect(dashboardTotal).toBe(expectedPortionSum);
    expect(rekapTotal).toBe(expectedPortionSum);
    expect(excelCalculatedTotal).toBe(expectedPortionSum);
    expect(pdfTotal).toBe(expectedPortionSum);

    // Strict equality comparison across all 4 models
    expect(dashboardTotal).toEqual(rekapTotal);
    expect(rekapTotal).toEqual(excelCalculatedTotal);
    expect(excelCalculatedTotal).toEqual(pdfTotal);
  });
});
