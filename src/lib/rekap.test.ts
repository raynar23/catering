import { describe, it, expect } from "vitest";
import {
  getRekapPresetRange,
  validateRekapRange,
  partitionRangeByMonth,
  sanitizeSheetName,
  generateExportFilename,
  formatIndonesianMonthYear,
} from "./rekap";

describe("rekap date range and export helpers", () => {
  const mockBaseDate = new Date("2026-10-21T10:00:00Z");

  it("calculates weekly preset starting on Monday and ending on Sunday", () => {
    const range = getRekapPresetRange("mingguan", mockBaseDate);
    // 2026-10-21 is Wednesday. Week is Monday 2026-10-19 to Sunday 2026-10-25
    expect(range.dari).toBe("2026-10-19");
    expect(range.sampai).toBe("2026-10-25");
  });

  it("calculates monthly preset for current month", () => {
    const range = getRekapPresetRange("bulanan", mockBaseDate);
    expect(range.dari).toBe("2026-10-01");
    expect(range.sampai).toBe("2026-10-31");
  });

  it("calculates 3 months preset covering 3 full calendar months", () => {
    const range = getRekapPresetRange("3_bulan", mockBaseDate);
    expect(range.dari).toBe("2026-08-01");
    expect(range.sampai).toBe("2026-10-31");
  });

  it("calculates 6 months preset covering 6 full calendar months", () => {
    const range = getRekapPresetRange("6_bulan", mockBaseDate);
    expect(range.dari).toBe("2026-05-01");
    expect(range.sampai).toBe("2026-10-31");
  });

  it("calculates annual preset covering full calendar year", () => {
    const range = getRekapPresetRange("tahunan", mockBaseDate);
    expect(range.dari).toBe("2026-01-01");
    expect(range.sampai).toBe("2026-12-31");
  });

  it("validates range limit and rejects ranges exceeding 366 days", () => {
    const valid = validateRekapRange("2026-01-01", "2026-12-31", 366);
    expect(valid.isValid).toBe(true);
    expect(valid.days).toBe(365);

    const invalid = validateRekapRange("2025-01-01", "2026-02-01", 366);
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toContain("maksimal 366 hari");
  });

  it("rejects inverted dates where start is after end", () => {
    const invalid = validateRekapRange("2026-10-31", "2026-10-01");
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toContain("tidak boleh melebihi");
  });

  it("formats Indonesian month and year properly", () => {
    expect(formatIndonesianMonthYear(new Date("2026-10-15"))).toBe("Oktober 2026");
    expect(formatIndonesianMonthYear(new Date("2026-01-01"))).toBe("Januari 2026");
  });

  it("partitions a multi-month date range into monthly blocks", () => {
    const partitions = partitionRangeByMonth("2026-09-15", "2026-11-20");
    expect(partitions.length).toBe(3);

    expect(partitions[0]).toEqual({
      monthKey: "2026-09",
      monthLabel: "September 2026",
      dari: "2026-09-15",
      sampai: "2026-09-30",
      year: 2026,
      month: 9,
    });

    expect(partitions[1]).toEqual({
      monthKey: "2026-10",
      monthLabel: "Oktober 2026",
      dari: "2026-10-01",
      sampai: "2026-10-31",
      year: 2026,
      month: 10,
    });

    expect(partitions[2]).toEqual({
      monthKey: "2026-11",
      monthLabel: "November 2026",
      dari: "2026-11-01",
      sampai: "2026-11-20",
      year: 2026,
      month: 11,
    });
  });

  it("sanitizes sheet names by replacing invalid characters and truncating to 31 chars", () => {
    expect(sanitizeSheetName("Oktober 2026")).toBe("Oktober 2026");
    expect(sanitizeSheetName("Sheet:With/Bad?Chars*[Here]")).toBe("Sheet With Bad Chars  Here");
    expect(sanitizeSheetName("A".repeat(40)).length).toBe(31);
  });

  it("generates meaningful filenames for Excel and PDF exports", () => {
    const excelName = generateExportFilename("excel", "2026-10-01", "2026-10-31");
    expect(excelName).toBe("Rekap_Catering_TPS_2026-10-01_sd_2026-10-31.xlsx");

    const pdfName = generateExportFilename("pdf", "2026-10-01", "2026-10-31");
    expect(pdfName).toBe("Laporan_Catering_TPS_2026-10-01_sd_2026-10-31.pdf");
  });
});
