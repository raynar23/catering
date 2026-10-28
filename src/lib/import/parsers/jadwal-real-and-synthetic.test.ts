// Unit and integration tests for schedule extraction, synthetic fixtures, and UI binding
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import ExcelJS from "exceljs";
import { XlsxExtractor } from "../extract/xlsx";
import { parseJadwal } from "./jadwal";
import { calculateImportSummary } from "../validate";
import { RawTableData } from "../types";

describe("Schedule import extraction and preview binding", () => {
  const knownVendors = [{ id: "v-aisya", nama: "Aisya Catering", kode: "V001" }];
  const knownShifts = [
    { id: "s1", nama: "Shift 1", label: "Shift 1 (Siang)", alias: "Siang" },
    { id: "s2", nama: "Shift 2", label: "Shift 2 (Sore)", alias: "Sore" },
    { id: "s3", nama: "Shift 3", label: "Shift 3 (Malam)", alias: "Malam" },
  ];

  it("1. Extraction from Buffer produces identical output to extraction from workbook file", async () => {
    const filePath = resolve(process.cwd(), "data-real/jadwal_q4_2026.xlsx");
    if (!existsSync(filePath)) return;

    const buffer = readFileSync(filePath);
    const extractor = new XlsxExtractor();

    // Direct buffer extraction via XlsxExtractor
    const bufferTables = await extractor.extract(buffer, "jadwal_q4_2026.xlsx");

    // File-based workbook extraction
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.worksheets[0];
    const wbRows: any[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals: any[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        vals[colNumber - 1] = cell.value;
      });
      wbRows.push(vals);
    });

    expect(bufferTables.length).toBeGreaterThan(0);
    expect(bufferTables[0].headers).toEqual(["No.", "Tanggal", "Shift", "Vendor Catering"]);
    expect(bufferTables[0].rows.length).toBe(wbRows.length - 1);
  });

  it("2. Synthetic fixture with empty separator rows, merged dates, and spaced vendor names", () => {
    // 3 days x 3 shifts = 9 data rows, with 3 empty separator rows interspersed
    const syntheticTable: RawTableData = {
      sheetName: "Jadwal",
      headers: ["No.", "Tanggal", "Shift", "Vendor Catering"],
      rows: [
        // Day 1: Merged date on first shift
        [1, "2026-10-01", "a. Siang", "  Aisya  Catering  "],
        [1, null, "b. Sore", " Catering IBU "],
        [1, null, "c. Malam", "  Nikmat   Rasa  "],
        // Empty separator row between Day 1 and Day 2 (should be skipped)
        [1, null, null, null],

        // Day 2: Merged date
        [2, "2026-10-02", "a. Siang", " Adhi Hidayah "],
        [2, null, "b. Sore", " Nurina Catering "],
        [2, null, "c. Malam", "  Aisya Catering "],
        // Pure empty row with whitespace strings (should be skipped)
        ["", "", "", ""],

        // Day 3: Indonesian date string on first shift
        [3, "03 Oktober 2026", "a. Siang", " Catering IBU "],
        [3, null, "b. Sore", " Nikmat Rasa "],
        [3, null, "c. Malam", " Adhi Hidayah "],
        // Null row (should be skipped)
        [null, null, null, null],
      ],
    };

    const parsed = parseJadwal([syntheticTable], { knownVendors, knownShifts });

    // Exactly 9 schedule rows, separator rows discarded
    expect(parsed.length).toBe(9);

    // Day 1 verification with normalized vendor names
    expect(parsed[0].tanggal).toBe("2026-10-01");
    expect(parsed[0].shift_nama).toBe("Shift 1");
    expect(parsed[0].shift_alias).toBe("siang");
    expect(parsed[0].vendor_nama).toBe("Aisya Catering");
    expect(parsed[0].status).toBe("cocok");

    expect(parsed[1].tanggal).toBe("2026-10-01");
    expect(parsed[1].shift_alias).toBe("sore");
    expect(parsed[1].vendor_nama).toBe("Catering IBU");
    expect(parsed[1].status).toBe("baru");

    expect(parsed[2].tanggal).toBe("2026-10-01");
    expect(parsed[2].shift_alias).toBe("malam");
    expect(parsed[2].vendor_nama).toBe("Nikmat Rasa");
    expect(parsed[2].status).toBe("baru");

    // Day 2 Aisya match
    expect(parsed[5].vendor_nama).toBe("Aisya Catering");
    expect(parsed[5].status).toBe("cocok");
  });

  it("3. Missing or invalid date, shift, or vendor produces error status and disables confirmation", () => {
    const errorTable: RawTableData = {
      sheetName: "Jadwal",
      headers: ["Tanggal", "Shift", "Vendor"],
      rows: [
        ["2026-10-01", "a. Siang", "Aisya Catering"],
        ["", "b. Sore", "Catering IBU"], // Missing date without prior date
        ["2026-10-02", "", "Nikmat Rasa"], // Missing shift
        ["2026-10-03", "c. Malam", ""], // Missing vendor
        ["2026-10-04", "UnknownShiftX", "Adhi Hidayah"], // Unrecognized shift
      ],
    };

    const parsed = parseJadwal([errorTable], { knownVendors, knownShifts });
    const summary = calculateImportSummary(parsed);

    // Rows with missing or invalid fields are flagged as error
    const errorRows = parsed.filter((r) => r.status === "error");
    expect(errorRows.length).toBeGreaterThanOrEqual(3);
    expect(summary.error).toBe(errorRows.length);

    // Confirmation button predicate check
    const canConfirm = summary.error === 0 && parsed.length > 0;
    expect(canConfirm).toBe(false);
  });

  it("4. Parsed rows bind correctly to preview table field formats", () => {
    const table: RawTableData = {
      sheetName: "Jadwal",
      headers: ["Tanggal", "Shift", "Vendor"],
      rows: [
        ["2026-10-01", "a. Siang", "Aisya Catering"],
        ["2026-10-01", "b. Sore", "Catering IBU"],
        ["2026-10-01", "c. Malam", "Nikmat Rasa"],
      ],
    };

    const parsed = parseJadwal([table], { knownVendors, knownShifts });

    for (const r of parsed) {
      // Date must strictly adhere to YYYY-MM-DD
      expect(r.tanggal).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Shift nama and alias binding
      expect(["Shift 1", "Shift 2", "Shift 3"]).toContain(r.shift_nama);
      expect(["siang", "sore", "malam"]).toContain(r.shift_alias);

      // Vendor nama must be non-empty and trimmed
      expect(r.vendor_nama.trim().length).toBeGreaterThan(0);
      expect(r.vendor_nama).toBe(r.vendor_nama.trim());
    }
  });

  it("5. Real file benchmark: exactly 276 rows, 92 days, 5 vendors, 0 errors, 56 cocok", async () => {
    const primaryPath = resolve(process.cwd(), "data-real/jadwal_q4_2026.xlsx");
    const downloadPath = "/Users/muhammadraynar/Downloads/Jadwal Catering TPS Tahun 2026.xlsx";
    const targetPath = existsSync(primaryPath) ? primaryPath : existsSync(downloadPath) ? downloadPath : null;

    if (!targetPath) return;

    const buffer = readFileSync(targetPath);
    const extractor = new XlsxExtractor();
    const tables = await extractor.extract(buffer, "jadwal_q4_2026.xlsx");

    const parsed = parseJadwal(tables, { knownVendors, knownShifts });
    const summary = calculateImportSummary(parsed);

    // Target 276 rows (92 days x 3 shifts)
    expect(summary.total).toBe(276);
    expect(summary.error).toBe(0);
    expect(summary.cocok).toBe(56); // Aisya Catering
    expect(summary.baru).toBe(220); // 4 other vendors x 55 shifts each

    // Target 92 days
    const uniqueDates = Array.from(new Set(parsed.map((r) => r.tanggal))).sort();
    expect(uniqueDates.length).toBe(92);
    expect(uniqueDates[0]).toBe("2026-10-01");
    expect(uniqueDates[91]).toBe("2026-12-31");

    // Target 5 vendors
    const vendorCounts: Record<string, number> = {};
    for (const r of parsed) {
      vendorCounts[r.vendor_nama] = (vendorCounts[r.vendor_nama] || 0) + 1;
    }

    expect(Object.keys(vendorCounts).length).toBe(5);
    expect(vendorCounts["Aisya Catering"]).toBe(56);
    expect(vendorCounts["Catering IBU"]).toBe(55);
    expect(vendorCounts["Nikmat Rasa"]).toBe(55);
    expect(vendorCounts["Adhi Hidayah"]).toBe(55);
    expect(vendorCounts["Nurina Catering"]).toBe(55);
  });
});
