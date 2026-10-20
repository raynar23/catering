// Centralized formatting helper for id-ID locale and Asia/Jakarta timezone

const TIMEZONE = "Asia/Jakarta";
const LOCALE = "id-ID";

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);

  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  return `${day}-${month}-${year}`;
}

export function formatDateLong(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = formatDate(d);
  const timeStr = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d).replace(":", ".");
  return `${dateStr} ${timeStr}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  return `${value}`;
}
