import {
  parseISO,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  differenceInCalendarDays,
  addMonths,
  isBefore,
  isAfter,
} from "date-fns";

export type RekapPreset =
  | "mingguan"
  | "bulanan"
  | "3_bulan"
  | "6_bulan"
  | "tahunan"
  | "kustom";

export interface DateRangeResult {
  dari: string;
  sampai: string;
}

export interface MonthPartition {
  monthKey: string;
  monthLabel: string;
  dari: string;
  sampai: string;
  year: number;
  month: number;
}

// Generate ISO date range based on selected rekap preset
export function getRekapPresetRange(
  preset: RekapPreset,
  baseDate: Date = new Date()
): DateRangeResult {
  switch (preset) {
    case "mingguan": {
      // Current calendar week (Monday to Sunday)
      const from = startOfWeek(baseDate, { weekStartsOn: 1 });
      const to = endOfWeek(baseDate, { weekStartsOn: 1 });
      return {
        dari: format(from, "yyyy-MM-dd"),
        sampai: format(to, "yyyy-MM-dd"),
      };
    }
    case "bulanan": {
      const from = startOfMonth(baseDate);
      const to = endOfMonth(baseDate);
      return {
        dari: format(from, "yyyy-MM-dd"),
        sampai: format(to, "yyyy-MM-dd"),
      };
    }
    case "3_bulan": {
      const from = startOfMonth(subMonths(baseDate, 2));
      const to = endOfMonth(baseDate);
      return {
        dari: format(from, "yyyy-MM-dd"),
        sampai: format(to, "yyyy-MM-dd"),
      };
    }
    case "6_bulan": {
      const from = startOfMonth(subMonths(baseDate, 5));
      const to = endOfMonth(baseDate);
      return {
        dari: format(from, "yyyy-MM-dd"),
        sampai: format(to, "yyyy-MM-dd"),
      };
    }
    case "tahunan": {
      const from = startOfYear(baseDate);
      const to = endOfYear(baseDate);
      return {
        dari: format(from, "yyyy-MM-dd"),
        sampai: format(to, "yyyy-MM-dd"),
      };
    }
    case "kustom":
    default: {
      const from = startOfMonth(baseDate);
      const to = endOfMonth(baseDate);
      return {
        dari: format(from, "yyyy-MM-dd"),
        sampai: format(to, "yyyy-MM-dd"),
      };
    }
  }
}

// Validate date range and enforce maximum period limit of 366 days
export function validateRekapRange(
  dariStr: string,
  sampaiStr: string,
  maxDays = 366
): { isValid: boolean; error?: string; days: number } {
  try {
    const dari = parseISO(dariStr);
    const sampai = parseISO(sampaiStr);

    if (isNaN(dari.getTime()) || isNaN(sampai.getTime())) {
      return { isValid: false, error: "Format tanggal tidak valid", days: 0 };
    }

    if (isAfter(dari, sampai)) {
      return { isValid: false, error: "Tanggal mulai tidak boleh melebihi tanggal akhir", days: 0 };
    }

    const days = differenceInCalendarDays(sampai, dari) + 1;
    if (days > maxDays) {
      return {
        isValid: false,
        error: `Rentang waktu maksimal ${maxDays} hari (rentang dipilih: ${days} hari)`,
        days,
      };
    }

    return { isValid: true, days };
  } catch {
    return { isValid: false, error: "Gagal memproses rentang tanggal", days: 0 };
  }
}

const INDONESIAN_MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Format month label in Indonesian (e.g., "Oktober 2026")
export function formatIndonesianMonthYear(date: Date): string {
  const monthName = INDONESIAN_MONTH_NAMES[date.getMonth()];
  return `${monthName} ${date.getFullYear()}`;
}

// Partition a date range into month segments for multi-sheet Excel generation
export function partitionRangeByMonth(dariStr: string, sampaiStr: string): MonthPartition[] {
  const start = parseISO(dariStr);
  const end = parseISO(sampaiStr);

  if (isAfter(start, end)) return [];

  const partitions: MonthPartition[] = [];
  let currentCursor = startOfMonth(start);

  while (!isAfter(currentCursor, end)) {
    const monthEnd = endOfMonth(currentCursor);
    const segStart = isBefore(start, currentCursor) ? currentCursor : start;
    const segEnd = isAfter(end, monthEnd) ? monthEnd : end;

    partitions.push({
      monthKey: format(currentCursor, "yyyy-MM"),
      monthLabel: formatIndonesianMonthYear(currentCursor),
      dari: format(segStart, "yyyy-MM-dd"),
      sampai: format(segEnd, "yyyy-MM-dd"),
      year: currentCursor.getFullYear(),
      month: currentCursor.getMonth() + 1,
    });

    currentCursor = addMonths(currentCursor, 1);
  }

  return partitions;
}

// Sanitize Excel sheet name according to openpyxl and Excel specifications
export function sanitizeSheetName(name: string): string {
  // Disallowed characters: : \ / ? * [ ]
  const cleaned = name.replace(/[:\\/?*[\]]/g, " ").trim();
  return cleaned.slice(0, 31) || "Sheet1";
}

// Generate standardized meaningful filenames for exported spreadsheets and documents
export function generateExportFilename(
  type: "excel" | "pdf",
  dariStr: string,
  sampaiStr: string
): string {
  const ext = type === "excel" ? "xlsx" : "pdf";
  const prefix = type === "excel" ? "Rekap_Catering_TPS" : "Laporan_Catering_TPS";
  return `${prefix}_${dariStr}_sd_${sampaiStr}.${ext}`;
}
