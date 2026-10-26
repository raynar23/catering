// Fuzzy string matching, normalization, alias resolution, and date sanitization
import { parseISO, isValid } from "date-fns";

export interface KnownVendor {
  id: string;
  nama: string;
  kode: string;
}

export interface KnownShift {
  id: string;
  nama: string;
  label: string;
  alias: string[];
}

export interface KnownBagian {
  id: string;
  nama: string;
  kode: string;
  kelompok: string;
}

// Clean and normalize arbitrary string by trimming and collapsing multiple spaces
export function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width chars
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

// Compute Levenshtein distance between two strings
export function levenshteinDistance(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

// Calculate similarity ratio between 0.0 and 1.0
export function stringSimilarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return 1.0 - dist / maxLen;
}

const INDONESIAN_MONTH_MAP: Record<string, string> = {
  jan: "01",
  januari: "01",
  feb: "02",
  februari: "02",
  mar: "03",
  maret: "03",
  apr: "04",
  april: "04",
  mei: "05",
  may: "05",
  jun: "06",
  juni: "06",
  jul: "07",
  juli: "07",
  agu: "08",
  agustus: "08",
  aug: "08",
  sep: "09",
  september: "09",
  okt: "10",
  oktober: "10",
  oct: "10",
  nov: "11",
  november: "11",
  des: "12",
  desember: "12",
  dec: "12",
};

// Parse various date inputs (Date, Excel serial, Indonesian string, ISO) into YYYY-MM-DD
export function parseFlexibleDate(val: any): string | null {
  if (val === null || val === undefined) return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().slice(0, 10);
  }

  // Excel serial number (days since 1899-12-30)
  if (typeof val === "number") {
    if (val > 30000 && val < 60000) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().slice(0, 10);
    }
  }

  const str = normalizeString(String(val));
  if (!str) return null;

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = parseISO(str);
    return isValid(d) ? str : null;
  }

  // Format DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    const iso = `${year}-${month}-${day}`;
    return isValid(parseISO(iso)) ? iso : null;
  }

  // Format e.g., "Kamis, 01 Oktober 2026" or "1 Okt 2026"
  const textMatch = str.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, "0");
    const mStr = textMatch[2].toLowerCase();
    const year = textMatch[3];
    const month = INDONESIAN_MONTH_MAP[mStr];
    if (month) {
      const iso = `${year}-${month}-${day}`;
      return isValid(parseISO(iso)) ? iso : null;
    }
  }

  return null;
}

// Match vendor name against known registered vendors using exact, alias, and fuzzy scoring
export function matchVendor(
  rawName: string,
  knownVendors: KnownVendor[]
): {
  vendor_id: string | null;
  vendor_nama: string;
  vendor_kode: string | null;
  status: "cocok" | "baru" | "perlu_cek";
  alasan?: string;
} {
  const cleaned = normalizeString(rawName);
  if (!cleaned) {
    return {
      vendor_id: null,
      vendor_nama: "",
      vendor_kode: null,
      status: "baru",
      alasan: "Nama vendor kosong",
    };
  }

  const normTarget = cleaned.toLowerCase();

  // 1. Exact match (case-insensitive)
  const exact = knownVendors.find((v) => normalizeString(v.nama).toLowerCase() === normTarget);
  if (exact) {
    return {
      vendor_id: exact.id,
      vendor_nama: exact.nama,
      vendor_kode: exact.kode,
      status: "cocok",
    };
  }

  // 2. Exact match against vendor code (e.g., "V001")
  const exactCode = knownVendors.find((v) => v.kode.toLowerCase() === normTarget);
  if (exactCode) {
    return {
      vendor_id: exactCode.id,
      vendor_nama: exactCode.nama,
      vendor_kode: exactCode.kode,
      status: "cocok",
    };
  }

  // 3. Substring match (e.g. "Aisya" inside "Aisya Catering")
  const subMatch = knownVendors.find((v) => {
    const vNorm = normalizeString(v.nama).toLowerCase();
    return vNorm.includes(normTarget) || normTarget.includes(vNorm);
  });
  if (subMatch) {
    return {
      vendor_id: subMatch.id,
      vendor_nama: subMatch.nama,
      vendor_kode: subMatch.kode,
      status: "cocok",
    };
  }

  // 4. Fuzzy similarity matching (> 0.75 ratio)
  let bestVendor: KnownVendor | null = null;
  let highestRatio = 0;

  for (const v of knownVendors) {
    const ratio = stringSimilarity(normTarget, normalizeString(v.nama).toLowerCase());
    if (ratio > highestRatio) {
      highestRatio = ratio;
      bestVendor = v;
    }
  }

  if (bestVendor && highestRatio >= 0.75) {
    return {
      vendor_id: bestVendor.id,
      vendor_nama: bestVendor.nama,
      vendor_kode: bestVendor.kode,
      status: "perlu_cek",
      alasan: `Kemiripan nama ${Math.round(highestRatio * 100)}% dengan '${bestVendor.nama}'`,
    };
  }

  // 5. Unrecognized vendor (marked as 'baru')
  return {
    vendor_id: null,
    vendor_nama: cleaned,
    vendor_kode: null,
    status: "baru",
    alasan: "Vendor baru (belum terdaftar di database)",
  };
}

// Match raw shift text (e.g., "a. Siang", "Shift 2", "Malam") using letter prefixes and aliases
export function matchShift(
  rawShift: string,
  knownShifts: KnownShift[]
): {
  shift_id: string | null;
  shift_nama: string;
  shift_alias: string;
  status: "cocok" | "perlu_cek";
  alasan?: string;
} {
  const cleaned = normalizeString(rawShift).toLowerCase();

  // Strip prefixes like "a. ", "b. ", "c. ", "1. ", "2. ", "3. "
  const prefixMatch = cleaned.match(/^([a-c1-3])[.)]\s*(.*)$/);
  const letterOrNum = prefixMatch ? prefixMatch[1] : null;
  const coreText = prefixMatch && prefixMatch[2] ? prefixMatch[2].trim() : cleaned;

  // 1. Match by shift letter prefix: a -> Shift 1 (Siang), b -> Shift 2 (Sore), c -> Shift 3 (Malam)
  if (letterOrNum === "a") {
    const s1 = knownShifts.find((s) => s.nama === "Shift 1" || s.alias.includes("siang"));
    if (s1) return { shift_id: s1.id, shift_nama: s1.nama, shift_alias: "siang", status: "cocok" };
  }
  if (letterOrNum === "b") {
    const s2 = knownShifts.find((s) => s.nama === "Shift 2" || s.alias.includes("sore"));
    if (s2) return { shift_id: s2.id, shift_nama: s2.nama, shift_alias: "sore", status: "cocok" };
  }
  if (letterOrNum === "c") {
    const s3 = knownShifts.find((s) => s.nama === "Shift 3" || s.alias.includes("malam"));
    if (s3) return { shift_id: s3.id, shift_nama: s3.nama, shift_alias: "malam", status: "cocok" };
  }

  // 2. Match by alias keyword inside core text
  for (const s of knownShifts) {
    if (coreText.includes(s.nama.toLowerCase())) {
      const alias = s.alias[0] || s.label.toLowerCase();
      return { shift_id: s.id, shift_nama: s.nama, shift_alias: alias, status: "cocok" };
    }
    for (const a of s.alias) {
      if (coreText.includes(a.toLowerCase())) {
        return { shift_id: s.id, shift_nama: s.nama, shift_alias: a, status: "cocok" };
      }
    }
  }

  // 3. Fallback based on known label
  for (const s of knownShifts) {
    if (coreText.includes(s.label.toLowerCase())) {
      const alias = s.alias[0] || s.label.toLowerCase();
      return { shift_id: s.id, shift_nama: s.nama, shift_alias: alias, status: "cocok" };
    }
  }

  return {
    shift_id: null,
    shift_nama: rawShift,
    shift_alias: "",
    status: "perlu_cek",
    alasan: `Shift '${rawShift}' tidak dikenali`,
  };
}
