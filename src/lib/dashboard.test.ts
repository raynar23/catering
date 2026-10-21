// Unit tests for dashboard domain functions, range mathematics, and adaptive bucketing
import { describe, it, expect } from "vitest";
import {
  getPresetDateRange,
  shiftDateRange,
  getPreviousPeriodRange,
  getTrendGranularity,
  bucketTrendSeries,
  verifyDashboardConsistency,
  DailyPoint,
  DashboardSummaryData,
} from "./dashboard";

describe("getPresetDateRange", () => {
  const refDate = "2026-10-21";

  it("calculates hari_ini range accurately", () => {
    const range = getPresetDateRange("hari_ini", refDate);
    expect(range).toEqual({ dari: "2026-10-21", sampai: "2026-10-21" });
  });

  it("calculates 7_hari range inclusive of reference date", () => {
    const range = getPresetDateRange("7_hari", refDate);
    expect(range).toEqual({ dari: "2026-10-15", sampai: "2026-10-21" });
  });

  it("calculates 30_hari range accurately", () => {
    const range = getPresetDateRange("30_hari", refDate);
    expect(range).toEqual({ dari: "2026-09-22", sampai: "2026-10-21" });
  });

  it("calculates bulan_ini range from start of month to end of month", () => {
    const range = getPresetDateRange("bulan_ini", refDate);
    expect(range).toEqual({ dari: "2026-10-01", sampai: "2026-10-31" });
  });
});

describe("shiftDateRange", () => {
  it("shifts 7-day range backward by 7 days", () => {
    const shifted = shiftDateRange("2026-10-15", "2026-10-21", "prev");
    expect(shifted).toEqual({ dari: "2026-10-08", sampai: "2026-10-14" });
  });

  it("shifts 7-day range forward by 7 days", () => {
    const shifted = shiftDateRange("2026-10-15", "2026-10-21", "next");
    expect(shifted).toEqual({ dari: "2026-10-22", sampai: "2026-10-28" });
  });
});

describe("getPreviousPeriodRange", () => {
  it("computes exact preceding window with identical length", () => {
    const prev = getPreviousPeriodRange("2026-10-15", "2026-10-21");
    expect(prev).toEqual({ dari: "2026-10-08", sampai: "2026-10-14" });
  });

  it("computes preceding window for a single day", () => {
    const prev = getPreviousPeriodRange("2026-10-21", "2026-10-21");
    expect(prev).toEqual({ dari: "2026-10-20", sampai: "2026-10-20" });
  });
});

describe("getTrendGranularity and bucketTrendSeries", () => {
  it("determines correct granularity thresholds", () => {
    expect(getTrendGranularity(7)).toBe("harian");
    expect(getTrendGranularity(10)).toBe("harian");
    expect(getTrendGranularity(14)).toBe("3_hari");
    expect(getTrendGranularity(30)).toBe("3_hari");
    expect(getTrendGranularity(60)).toBe("mingguan");
    expect(getTrendGranularity(180)).toBe("bulanan");
  });

  it("preserves exact mathematical sum across adaptive bucketing", () => {
    const dailyCurrent: DailyPoint[] = Array.from({ length: 30 }, (_, i) => ({
      tanggal: `2026-10-${String(i + 1).padStart(2, "0")}`,
      total_porsi: (i + 1) * 10,
    }));

    const dailyPrev: DailyPoint[] = Array.from({ length: 30 }, (_, i) => ({
      tanggal: `2026-09-${String(i + 1).padStart(2, "0")}`,
      total_porsi: (i + 1) * 8,
    }));

    const expectedCurrentSum = dailyCurrent.reduce((a, b) => a + b.total_porsi, 0);
    const expectedPrevSum = dailyPrev.reduce((a, b) => a + b.total_porsi, 0);

    const bucketed = bucketTrendSeries(dailyCurrent, dailyPrev);

    const actualCurrentSum = bucketed.reduce((a, b) => a + b.porsi_saat_ini, 0);
    const actualPrevSum = bucketed.reduce((a, b) => a + b.porsi_sebelumnya, 0);

    expect(actualCurrentSum).toBe(expectedCurrentSum);
    expect(actualPrevSum).toBe(expectedPrevSum);
    expect(bucketed.length).toBe(10); // 30 days grouped in 3-day chunks
  });
});

describe("verifyDashboardConsistency", () => {
  const consistentData: DashboardSummaryData = {
    dari: "2026-10-01",
    sampai: "2026-10-03",
    total_porsi: 300,
    rata_rata_porsi_per_hari: 100,
    jumlah_revisi: 2,
    revisi_menunggu: 1,
    belum_input_hari_ini_besok: 0,
    seri_harian: [
      { tanggal: "2026-10-01", total_porsi: 100 },
      { tanggal: "2026-10-02", total_porsi: 100 },
      { tanggal: "2026-10-03", total_porsi: 100 },
    ],
    seri_periode_sebelumnya: [
      { tanggal: "2026-09-28", total_porsi: 90 },
      { tanggal: "2026-09-29", total_porsi: 90 },
      { tanggal: "2026-09-30", total_porsi: 90 },
    ],
    seri_shift: [
      { shift_id: "s1", shift_nama: "Shift 1", shift_label: "Pagi", urutan: 1, total_porsi: 150, persentase: 50 },
      { shift_id: "s2", shift_nama: "Shift 2", shift_label: "Siang", urutan: 2, total_porsi: 150, persentase: 50 },
    ],
    seri_bagian: [
      { bagian_id: "b1", bagian_nama: "Dermaga", kelompok: "Operasi", urutan: 1, total_porsi: 200 },
      { bagian_id: "b2", bagian_nama: "Teknik", kelompok: "Teknik", urutan: 2, total_porsi: 100 },
    ],
    seri_vendor: [
      { vendor_id: "v1", vendor_nama: "Aisya", vendor_kode: "V001", urutan_rotasi: 0, total_porsi: 300, persentase: 100 },
    ],
  };

  it("validates that all breakdown series sum to the identical total_porsi", () => {
    const res = verifyDashboardConsistency(consistentData);
    expect(res.valid).toBe(true);
    expect(res.mismatches).toHaveLength(0);
  });

  it("detects breakdown sum mismatches", () => {
    const inconsistent = {
      ...consistentData,
      seri_vendor: [{ ...consistentData.seri_vendor[0], total_porsi: 250 }],
    };
    const res = verifyDashboardConsistency(inconsistent);
    expect(res.valid).toBe(false);
    expect(res.mismatches[0]).toContain("Seri vendor (250) != Total KPI (300)");
  });
});
