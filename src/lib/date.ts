// Date calculation and formatting helpers without UTC timezone shifting

// Format date to YYYY-MM-DD using local calendar year, month, and day
export function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse YYYY-MM-DD string into a Date at local midnight
export function parseDateIso(isoStr: string): Date {
  const [yearStr, monthStr, dayStr] = isoStr.split("-");
  const year = parseInt(yearStr || "2026", 10);
  const month = parseInt(monthStr || "1", 10) - 1;
  const day = parseInt(dayStr || "1", 10);
  return new Date(year, month, day);
}

// Calculate first and last day of a month (1-indexed month: 1 for January)
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const startDay = new Date(year, month - 1, 1);
  const endDay = new Date(year, month, 0);

  return {
    start: formatDateIso(startDay),
    end: formatDateIso(endDay),
  };
}

// Month options formatted for Indonesian locale
export const MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

// Validate shift time string (HH:mm or HH:mm:ss, allowing 24:00)
export function isValidTimeString(time: string): boolean {
  if (!time) return false;
  const normalized = time.trim().replace(".", ":");
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$|^24:00(:00)?$/;
  return regex.test(normalized);
}

// Format time string to Indonesian period format (e.g. 08:00:00 -> 08.00)
export function formatTimeShort(time: string): string {
  if (!time) return "";
  const parts = time.replace(".", ":").split(":");
  const h = parts[0]?.padStart(2, "0") ?? "00";
  const m = parts[1]?.padStart(2, "0") ?? "00";
  return `${h}.${m}`;
}
