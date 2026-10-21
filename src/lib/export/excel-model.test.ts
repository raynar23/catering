import { describe, it, expect } from "vitest";
import {
  buildExcelWorkbookModel,
  colToLetter,
  ExcelBuilderOptions,
} from "./excel-model";

describe("Excel Cell Model Builder", () => {
  it("converts 1-based column indices to Excel column letters accurately", () => {
    expect(colToLetter(1)).toBe("A");
    expect(colToLetter(2)).toBe("B");
    expect(colToLetter(3)).toBe("C");
    expect(colToLetter(26)).toBe("Z");
    expect(colToLetter(27)).toBe("AA");
    expect(colToLetter(28)).toBe("AB");
    expect(colToLetter(52)).toBe("AZ");
    expect(colToLetter(53)).toBe("BA");
  });

  // Synthetic fixture with 5 departments, 2 weeks, fabricated numbers
  const syntheticFixture: ExcelBuilderOptions = {
    monthPartitions: [
      {
        monthKey: "2026-10",
        monthLabel: "Oktober 2026",
        dari: "2026-10-01",
        sampai: "2026-10-14", // 2 weeks (14 days)
        year: 2026,
        month: 10,
      },
    ],
    bagianList: [
      { id: "b1", kode: "OPS1", nama: "Dermaga 1", kelompok: "OPERASIONAL", urutan: 1 },
      { id: "b2", kode: "OPS2", nama: "Dermaga 2", kelompok: "OPERASIONAL", urutan: 2 },
      { id: "b3", kode: "TKN1", nama: "Mekanik", kelompok: "TEKNIK", urutan: 3 },
      { id: "b4", kode: "TKN2", nama: "Elektrik", kelompok: "TEKNIK", urutan: 4 },
      { id: "b5", kode: "ADM", nama: "Pelayanan Kapal", kelompok: "ADMINISTRASI", urutan: 5 },
    ],
    shiftsList: [
      { id: "s3", nama: "Shift 3", label: "Malam", alias: "Malam", urutan_laporan: 1, batas_tiba: "01:00" },
      { id: "s1", nama: "Shift 1", label: "Siang", alias: "Siang", urutan_laporan: 2, batas_tiba: "10:00" },
      { id: "s2", nama: "Shift 2", label: "Sore", alias: "Sore", urutan_laporan: 3, batas_tiba: "17:00" },
    ],
    vendorsList: [
      { id: "v1", kode: "V001", nama: "Catering Berkah" },
      { id: "v2", kode: "V002", nama: "Catering Amanah" },
    ],
    orders: [
      // Fabricated orders for testing formulas and cached calculations
      { tanggal: "2026-10-01", shift_id: "s3", bagian_id: "b1", jumlah_porsi: 10 },
      { tanggal: "2026-10-01", shift_id: "s1", bagian_id: "b1", jumlah_porsi: 15 },
      { tanggal: "2026-10-01", shift_id: "s2", bagian_id: "b1", jumlah_porsi: 12 },
      { tanggal: "2026-10-01", shift_id: "s1", bagian_id: "b2", jumlah_porsi: 20 },
      { tanggal: "2026-10-02", shift_id: "s3", bagian_id: "b3", jumlah_porsi: 8 },
      { tanggal: "2026-10-02", shift_id: "s1", bagian_id: "b4", jumlah_porsi: 7 },
      { tanggal: "2026-10-03", shift_id: "s2", bagian_id: "b5", jumlah_porsi: 25 },
    ],
    catatan: "Catatan pengujian catering fixture",
  };

  it("builds a workbook model with standard sheet and title metadata", () => {
    const workbook = buildExcelWorkbookModel(syntheticFixture);
    expect(workbook.sheets.length).toBe(1);

    const sheet = workbook.sheets[0];
    expect(sheet.name).toBe("Oktober 2026");

    // Check title cell
    const titleCell = sheet.cells.find((c) => c.row === 1 && c.col === 1);
    expect(titleCell?.value).toBe("REKAPITULASI PEMBAGIAN JATAH MAKAN PETUGAS SHIFT");
    expect(titleCell?.style?.font?.name).toBe("Arial");
    expect(titleCell?.style?.font?.bold).toBe(true);

    // Check subtitle cell
    const subTitleCell = sheet.cells.find((c) => c.row === 2 && c.col === 1);
    expect(subTitleCell?.value).toContain("PERIODE TANGGAL 1 - 14 OKTOBER 2026");
  });

  it("organizes 3 shift sub-columns in exact sequence (3, 1, 2) for each date", () => {
    const workbook = buildExcelWorkbookModel(syntheticFixture);
    const sheet = workbook.sheets[0];

    // Day 1 headers at Row 4 & 5
    // startCol for Day 1: col 3 (C)
    const day1Shift3 = sheet.cells.find((c) => c.row === 5 && c.col === 3);
    const day1Shift1 = sheet.cells.find((c) => c.row === 5 && c.col === 4);
    const day1Shift2 = sheet.cells.find((c) => c.row === 5 && c.col === 5);

    expect(day1Shift3?.value).toBe("3");
    expect(day1Shift1?.value).toBe("1");
    expect(day1Shift2?.value).toBe("2");
  });

  it("injects data values, empty placeholders, and row SUM formulas", () => {
    const workbook = buildExcelWorkbookModel(syntheticFixture);
    const sheet = workbook.sheets[0];

    // Find row for Dermaga 1 (b1)
    const dermagaRowCell = sheet.cells.find((c) => c.value === "Dermaga 1");
    expect(dermagaRowCell).toBeDefined();

    const rowNum = dermagaRowCell!.row;
    // Day 1 Shift 3 for b1 = 10
    const cellD1S3 = sheet.cells.find((c) => c.row === rowNum && c.col === 3);
    expect(cellD1S3?.value).toBe(10);

    // Empty cell should be marked with "-"
    const cellD2S1 = sheet.cells.find((c) => c.row === rowNum && c.col === 7);
    expect(cellD2S1?.value).toBe("-");

    // Total column for Dermaga 1: 10 + 15 + 12 = 37
    // Total column is col 3 + (14 * 3) = col 45
    const totalCell = sheet.cells.find((c) => c.row === rowNum && c.col === 45);
    expect(totalCell?.value).toBe(37);
    expect(totalCell?.formula).toContain("SUM(C");
  });

  it("calculates kelompok subtotal formulas and grand total formula", () => {
    const workbook = buildExcelWorkbookModel(syntheticFixture);
    const sheet = workbook.sheets[0];

    // Check presence of JUMLAH OPERASIONAL subtotal row
    const subtotalCell = sheet.cells.find((c) => c.value === "JUMLAH OPERASIONAL");
    expect(subtotalCell).toBeDefined();
    expect(subtotalCell?.style?.font?.bold).toBe(true);

    // Check presence of TOTAL grand total row in column 2
    const grandTotalCell = sheet.cells.find((c) => c.col === 2 && c.value === "TOTAL");
    expect(grandTotalCell).toBeDefined();

    const grandRow = grandTotalCell!.row;
    const grandSumCell = sheet.cells.find((c) => c.row === grandRow && c.col === 45);
    // Total fabricated sum: 10 + 15 + 12 + 20 + 8 + 7 + 25 = 97
    expect(grandSumCell?.value).toBe(97);
    expect(grandSumCell?.formula).toBe("SUM(C" + grandRow + ":AR" + grandRow + ")");
  });

  it("includes CATATAN and JADWAL PENGIRIMAN in document footer", () => {
    const workbook = buildExcelWorkbookModel(syntheticFixture);
    const sheet = workbook.sheets[0];

    const notesHeader = sheet.cells.find((c) => c.value === "CATATAN:");
    expect(notesHeader).toBeDefined();

    const notesContent = sheet.cells.find((c) => c.value === "Catatan pengujian catering fixture");
    expect(notesContent).toBeDefined();

    const scheduleHeader = sheet.cells.find((c) => c.value === "JADWAL PENGIRIMAN CATERING:");
    expect(scheduleHeader).toBeDefined();
  });

  it("generates a consolidated Ringkasan sheet when range spans multiple months", () => {
    const multiMonthFixture: ExcelBuilderOptions = {
      ...syntheticFixture,
      monthPartitions: [
        { monthKey: "2026-09", monthLabel: "September 2026", dari: "2026-09-01", sampai: "2026-09-30", year: 2026, month: 9 },
        { monthKey: "2026-10", monthLabel: "Oktober 2026", dari: "2026-10-01", sampai: "2026-10-31", year: 2026, month: 10 },
      ],
    };

    const workbook = buildExcelWorkbookModel(multiMonthFixture);
    // 2 monthly sheets + 1 summary sheet = 3 sheets
    expect(workbook.sheets.length).toBe(3);
    expect(workbook.sheets[0].name).toBe("September 2026");
    expect(workbook.sheets[1].name).toBe("Oktober 2026");
    expect(workbook.sheets[2].name).toBe("Ringkasan");

    const summarySheet = workbook.sheets[2];
    const summaryTitle = summarySheet.cells.find((c) => c.value === "RINGKASAN REKAPITULASI PEMBAGIAN JATAH MAKAN");
    expect(summaryTitle).toBeDefined();
  });
});
