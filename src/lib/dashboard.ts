// Pure domain functions and range math for Admin Dashboard metrics and charts
import {
  parseISO,
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
} from "date-fns";

export type DashboardPreset =
  | "hari_ini"
  | "7_hari"
  | "30_hari"
  | "bulan_ini"
  | "3_bulan"
  | "6_bulan"
  | "1_tahun"
  | "kustom";

export interface DateRangeString {
  dari: string; // YYYY-MM-DD
  sampai: string; // YYYY-MM-DD
}

export interface DailyPoint {
  tanggal: string; // YYYY-MM-DD
  total_porsi: number;
}

export interface ShiftPoint {
  shift_id: string;
  shift_nama: string;
  shift_label: string;
  urutan: number;
  total_porsi: number;
  persentase: number;
}

export interface BagianPoint {
  bagian_id: string;
  bagian_nama: string;
  kelompok: string;
  urutan: number;
  total_porsi: number;
}

export interface VendorPoint {
  vendor_id: string;
  vendor_nama: string;
  vendor_kode: string;
  urutan_rotasi: number;
  total_porsi: number;
  persentase: number;
}

export interface DashboardSummaryData {
  dari: string;
  sampai: string;
  total_porsi: number;
  rata_rata_porsi_per_hari: number;
  jumlah_revisi: number;
  revisi_menunggu: number;
  belum_input_hari_ini_besok: number;
  seri_harian: DailyPoint[];
  seri_periode_sebelumnya: DailyPoint[];
  seri_shift: ShiftPoint[];
  seri_bagian: BagianPoint[];
  seri_vendor: VendorPoint[];
}

export type BucketGranularity = "harian" | "3_hari" | "mingguan" | "bulanan";

export interface BucketedTrendPoint {
  label: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  porsi_saat_ini: number;
  porsi_sebelumnya: number;
}

// Compute date range for a given standard preset
export function getPresetDateRange(
  preset: DashboardPreset,
  referenceDate: string | Date = new Date()
): DateRangeString {
  const ref = typeof referenceDate === "string" ? parseISO(referenceDate) : referenceDate;
  const todayStr = format(ref, "yyyy-MM-dd");

  switch (preset) {
    case "hari_ini":
      return { dari: todayStr, sampai: todayStr };
    case "7_hari":
      return {
        dari: format(subDays(ref, 6), "yyyy-MM-dd"),
        sampai: todayStr,
      };
    case "30_hari":
      return {
        dari: format(subDays(ref, 29), "yyyy-MM-dd"),
        sampai: todayStr,
      };
    case "bulan_ini": {
      const monthStart = format(startOfMonth(ref), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(ref), "yyyy-MM-dd");
      return { dari: monthStart, sampai: monthEnd };
    }
    case "3_bulan":
      return {
        dari: format(subDays(ref, 89), "yyyy-MM-dd"),
        sampai: todayStr,
      };
    case "6_bulan":
      return {
        dari: format(subDays(ref, 179), "yyyy-MM-dd"),
        sampai: todayStr,
      };
    case "1_tahun":
      return {
        dari: format(subDays(ref, 364), "yyyy-MM-dd"),
        sampai: todayStr,
      };
    case "kustom":
    default:
      return { dari: todayStr, sampai: todayStr };
  }
}

// Shift current range backward or forward by its exact duration
export function shiftDateRange(
  dari: string,
  sampai: string,
  direction: "prev" | "next"
): DateRangeString {
  const dStart = parseISO(dari);
  const dEnd = parseISO(sampai);
  const days = differenceInCalendarDays(dEnd, dStart) + 1;

  if (direction === "prev") {
    return {
      dari: format(subDays(dStart, days), "yyyy-MM-dd"),
      sampai: format(subDays(dEnd, days), "yyyy-MM-dd"),
    };
  } else {
    return {
      dari: format(addDays(dStart, days), "yyyy-MM-dd"),
      sampai: format(addDays(dEnd, days), "yyyy-MM-dd"),
    };
  }
}

// Calculate the identical preceding time window for baseline comparison
export function getPreviousPeriodRange(dari: string, sampai: string): DateRangeString {
  const dStart = parseISO(dari);
  const dEnd = parseISO(sampai);
  const days = differenceInCalendarDays(dEnd, dStart) + 1;

  return {
    dari: format(subDays(dStart, days), "yyyy-MM-dd"),
    sampai: format(subDays(dStart, 1), "yyyy-MM-dd"),
  };
}

// Determine adaptive bucketing granularity based on total day count
export function getTrendGranularity(dayCount: number): BucketGranularity {
  if (dayCount <= 10) return "harian";
  if (dayCount <= 35) return "3_hari";
  if (dayCount <= 90) return "mingguan";
  return "bulanan";
}

// Group daily trend series into adaptive time buckets preserving total sum
export function bucketTrendSeries(
  currentDaily: DailyPoint[],
  previousDaily: DailyPoint[]
): BucketedTrendPoint[] {
  const count = currentDaily.length;
  if (count === 0) return [];

  const granularity = getTrendGranularity(count);

  if (granularity === "harian") {
    return currentDaily.map((item, idx) => {
      const prev = previousDaily[idx]?.total_porsi ?? 0;
      const parsed = parseISO(item.tanggal);
      return {
        label: format(parsed, "dd/MM"),
        tanggal_mulai: item.tanggal,
        tanggal_selesai: item.tanggal,
        porsi_saat_ini: item.total_porsi,
        porsi_sebelumnya: prev,
      };
    });
  }

  // Determine chunk size based on granularity
  const chunkSize = granularity === "3_hari" ? 3 : granularity === "mingguan" ? 7 : 30;
  const result: BucketedTrendPoint[] = [];

  for (let i = 0; i < count; i += chunkSize) {
    const currentSlice = currentDaily.slice(i, i + chunkSize);
    const previousSlice = previousDaily.slice(i, i + chunkSize);

    const sumCurrent = currentSlice.reduce((acc, curr) => acc + curr.total_porsi, 0);
    const sumPrevious = previousSlice.reduce((acc, curr) => acc + curr.total_porsi, 0);

    const firstDate = currentSlice[0].tanggal;
    const lastDate = currentSlice[currentSlice.length - 1].tanggal;

    const label =
      firstDate === lastDate
        ? format(parseISO(firstDate), "dd/MM")
        : `${format(parseISO(firstDate), "dd/MM")}-${format(parseISO(lastDate), "dd/MM")}`;

    result.push({
      label,
      tanggal_mulai: firstDate,
      tanggal_selesai: lastDate,
      porsi_saat_ini: sumCurrent,
      porsi_sebelumnya: sumPrevious,
    });
  }

  return result;
}

// Verify that all multi-dimensional breakdown sums exactly match the overall KPI total
export function verifyDashboardConsistency(data: DashboardSummaryData): {
  valid: boolean;
  mismatches: string[];
} {
  const mismatches: string[] = [];
  const expectedTotal = data.total_porsi;

  const sumDaily = data.seri_harian.reduce((acc, curr) => acc + curr.total_porsi, 0);
  if (sumDaily !== expectedTotal) {
    mismatches.push(`Seri harian (${sumDaily}) != Total KPI (${expectedTotal})`);
  }

  const sumShift = data.seri_shift.reduce((acc, curr) => acc + curr.total_porsi, 0);
  if (sumShift !== expectedTotal) {
    mismatches.push(`Seri shift (${sumShift}) != Total KPI (${expectedTotal})`);
  }

  const sumBagian = data.seri_bagian.reduce((acc, curr) => acc + curr.total_porsi, 0);
  if (sumBagian !== expectedTotal) {
    mismatches.push(`Seri bagian (${sumBagian}) != Total KPI (${expectedTotal})`);
  }

  const sumVendor = data.seri_vendor.reduce((acc, curr) => acc + curr.total_porsi, 0);
  if (sumVendor !== expectedTotal) {
    mismatches.push(`Seri vendor (${sumVendor}) != Total KPI (${expectedTotal})`);
  }

  return {
    valid: mismatches.length === 0,
    mismatches,
  };
}
