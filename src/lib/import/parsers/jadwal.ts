// Parser for catering schedule tables (jadwal)
import { JadwalParsedRow, RawTableData } from "../types";
import {
  KnownShift,
  KnownVendor,
  matchShift,
  matchVendor,
  normalizeString,
  parseFlexibleDate,
} from "../match";
import { validateJadwalRows } from "../validate";

export interface ParseJadwalOptions {
  knownVendors?: KnownVendor[];
  knownShifts?: KnownShift[];
}

const DEFAULT_KNOWN_SHIFTS: KnownShift[] = [
  { id: "s1", nama: "Shift 1", label: "Siang", alias: ["siang", "pagi", "1", "a"] },
  { id: "s2", nama: "Shift 2", label: "Sore", alias: ["sore", "2", "b"] },
  { id: "s3", nama: "Shift 3", label: "Malam", alias: ["malam", "3", "c"] },
];

const DEFAULT_KNOWN_VENDORS: KnownVendor[] = [
  { id: "v1", nama: "Aisya Catering", kode: "V001" },
  { id: "v2", nama: "Catering IBU", kode: "V002" },
  { id: "v3", nama: "Nikmat Rasa", kode: "V003" },
  { id: "v4", nama: "Adhi Hidayah", kode: "V004" },
  { id: "v5", nama: "Nurina Catering", kode: "V005" },
];

/**
 * Identifies column indices for Date, Shift, and Vendor from header row
 */
function findColumnIndices(headers: string[]): {
  dateCol: number;
  shiftCol: number;
  vendorCol: number;
} {
  let dateCol = -1;
  let shiftCol = -1;
  let vendorCol = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = normalizeString(headers[i]).toLowerCase();
    if (h.includes("tanggal") || h.includes("hari") || h.includes("tgl") || h.includes("date")) {
      if (dateCol === -1) dateCol = i;
    } else if (h.includes("shift") || h.includes("waktu") || h.includes("jam")) {
      if (shiftCol === -1) shiftCol = i;
    } else if (
      h.includes("vendor") ||
      h.includes("catering") ||
      h.includes("rekanan") ||
      h.includes("suplier") ||
      h.includes("penyedia")
    ) {
      if (vendorCol === -1) vendorCol = i;
    }
  }

  // Fallback defaults if headers could not be matched
  if (dateCol === -1) dateCol = headers.length >= 3 ? 1 : 0;
  if (shiftCol === -1) shiftCol = dateCol === 1 ? 2 : 1;
  if (vendorCol === -1) vendorCol = headers.length >= 4 ? 3 : 2;

  return { dateCol, shiftCol, vendorCol };
}

/**
 * Parses raw table data into structured, validated JadwalParsedRow array
 */
export function parseJadwal(
  tables: RawTableData[],
  options: ParseJadwalOptions = {}
): JadwalParsedRow[] {
  const knownVendors = options.knownVendors && options.knownVendors.length > 0
    ? options.knownVendors
    : DEFAULT_KNOWN_VENDORS;

  const knownShifts = options.knownShifts && options.knownShifts.length > 0
    ? options.knownShifts
    : DEFAULT_KNOWN_SHIFTS;

  const parsedRows: JadwalParsedRow[] = [];
  let rowSeq = 1;

  for (const table of tables) {
    const sheetName = table.sheetName || "Sheet1";
    const { dateCol, shiftCol, vendorCol } = findColumnIndices(table.headers);

    let lastValidDate: string | null = null;

    for (let r = 0; r < table.rows.length; r++) {
      const row = table.rows[r];
      if (!row || row.length === 0) continue;

      // Extract raw cell values
      const rawDateVal = row[dateCol];
      const rawShiftVal = row[shiftCol];
      const rawVendorVal = row[vendorCol];

      // Parse date with propagation for merged rows across 3 shifts
      let parsedDate = parseFlexibleDate(rawDateVal);
      if (!parsedDate && lastValidDate && (rawShiftVal || rawVendorVal)) {
        parsedDate = lastValidDate;
      } else if (parsedDate) {
        lastValidDate = parsedDate;
      }

      // Skip completely empty rows
      if (!parsedDate && !rawShiftVal && !rawVendorVal) {
        continue;
      }

      // Match shift
      const shiftMatch = matchShift(String(rawShiftVal ?? ""), knownShifts);

      // Clean and match vendor (trimming extra whitespace like 'Nikmat Rasa  ')
      const cleanVendorName = normalizeString(String(rawVendorVal ?? ""));
      const vendorMatch = matchVendor(cleanVendorName, knownVendors);

      // Initial status determination
      let status: JadwalParsedRow["status"] = "cocok";
      let alasan: string | undefined = undefined;

      if (!parsedDate) {
        status = "error";
        alasan = "Tanggal tidak valid atau tidak terbaca";
      } else if (shiftMatch.status === "perlu_cek") {
        status = "perlu_cek";
        alasan = shiftMatch.alasan;
      } else if (vendorMatch.status === "baru") {
        status = "baru";
        alasan = vendorMatch.alasan;
      } else if (vendorMatch.status === "perlu_cek") {
        status = "perlu_cek";
        alasan = vendorMatch.alasan;
      }

      const parsedRow: JadwalParsedRow = {
        id: `jadwal-${rowSeq++}`,
        tanggal: parsedDate || "",
        shift_id: shiftMatch.shift_id,
        shift_nama: shiftMatch.shift_nama,
        shift_alias: shiftMatch.shift_alias,
        vendor_id: vendorMatch.vendor_id,
        vendor_nama: vendorMatch.vendor_nama,
        vendor_kode: vendorMatch.vendor_kode,
        is_new_vendor: vendorMatch.status === "baru",
        status,
        alasan,
        sumber: {
          sheet: sheetName,
          cell: `R${r + 2}`,
          line: r + 2,
        },
      };

      parsedRows.push(parsedRow);
    }
  }

  // Run domain validations (3 shifts/day, continuity, rotation check)
  return validateJadwalRows(parsedRows);
}
