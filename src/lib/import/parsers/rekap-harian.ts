// Parser for daily meal portion update matrices (rekap-harian)
import { RawTableData, RekapHarianParsedRow } from "../types";
import { KnownBagian, KnownShift, KnownVendor, normalizeString } from "../match";
import { getNamaVendorRotasi, UrutanShift } from "../../jadwal/rotasi";

export interface ParseRekapOptions {
  year?: number;
  month?: number; // 1 - 12
  knownShifts?: KnownShift[];
  knownVendors?: KnownVendor[];
  knownBagian?: KnownBagian[];
}

const DEFAULT_BAGIAN_MAP: Record<string, string> = {
  "mekanik cc": "MEK_CC",
  "mekanik rtg": "MEK_RTG",
  "mek cc": "MEK_CC",
  "mek rtg": "MEK_RTG",
  "cc operator": "CC_OP",
  "operator cc": "CC_OP",
  "rtg operator": "RTG_OP",
  "operator rtg": "RTG_OP",
  "gudang cfs": "CFS",
  "petugas cfs": "CFS",
  "area gudang cfs": "CFS",
  cfs: "CFS",
};

/**
 * Normalizes department label and removes extraneous suffixes
 */
function cleanBagianLabel(raw: string): string {
  const norm = normalizeString(raw).toLowerCase();
  return norm
    .replace(/mengikuti update.*/gi, "")
    .replace(/mangikuti update.*/gi, "")
    .replace(/\(.*\)/g, "")
    .trim();
}

/**
 * Parses numeric cell value, treating "-" or empty as 0
 */
function parsePorsiValue(val: any): number {
  if (val === null || val === undefined) return 0;
  const str = String(val).trim();
  if (str === "-" || str === "" || str === "0") return 0;
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : Math.max(0, num);
}

/**
 * Checks if a row contains numeric calendar day markers
 */
function hasDateNumbers(row: (string | number | boolean | Date | null)[]): boolean {
  if (!row) return false;
  let count = 0;
  for (const c of row) {
    const s = String(c ?? "").trim();
    if (/^\d+$/.test(s)) {
      const n = parseInt(s, 10);
      if (n >= 1 && n <= 31) count++;
    }
  }
  return count >= 2;
}

/**
 * Checks if a row contains shift indicators across columns
 */
function isShiftRow(row: (string | number | boolean | Date | null)[]): boolean {
  if (!row || row.length <= 1) return false;
  const cells = row.slice(1).map((c) => String(c ?? "").trim().toLowerCase());

  // Explicit strings like "shift 1", "shift 2", "shift 3"
  const explicitShifts = cells.filter(
    (c) => c.includes("shift 1") || c.includes("shift 2") || c.includes("shift 3")
  );
  if (explicitShifts.length >= 2) return true;

  // Repeating 3, 1, 2 or 1, 2, 3 pattern across at least 3 triads
  let tripletMatches = 0;
  for (let i = 0; i < cells.length - 2; i++) {
    const a = cells[i],
      b = cells[i + 1],
      c = cells[i + 2];
    if (
      (a === "3" && b === "1" && c === "2") ||
      (a === "1" && b === "2" && c === "3") ||
      (a.includes("malam") && b.includes("siang") && c.includes("sore"))
    ) {
      tripletMatches++;
    }
  }
  return tripletMatches >= 3;
}

/**
 * Parses daily matrix table with shift columns across calendar dates
 */
export function parseRekapHarian(
  tables: RawTableData[],
  options: ParseRekapOptions = {}
): RekapHarianParsedRow[] {
  let year = options.year || 2026;
  let month = options.month || 10;
  const results: RekapHarianParsedRow[] = [];
  let seq = 1;

  const sortedDeptKeys = Object.keys(DEFAULT_BAGIAN_MAP).sort(
    (a, b) => b.length - a.length
  );

  for (const table of tables) {
    const sheetName = table.sheetName || "Rekap Harian";

    // Extract year and month from sheet title or top rows if available
    for (let r = 0; r < Math.min(table.rows.length, 5); r++) {
      const rowText = table.rows[r].join(" ").toLowerCase();
      const yearMatch = rowText.match(/20\d{2}/);
      if (yearMatch) {
        year = parseInt(yearMatch[0], 10);
      }
      if (rowText.includes("januari") || rowText.includes("jan")) month = 1;
      else if (rowText.includes("februari") || rowText.includes("feb")) month = 2;
      else if (rowText.includes("maret") || rowText.includes("mar")) month = 3;
      else if (rowText.includes("april") || rowText.includes("apr")) month = 4;
      else if (rowText.includes("mei") || rowText.includes("may")) month = 5;
      else if (rowText.includes("juni") || rowText.includes("jun")) month = 6;
      else if (rowText.includes("juli") || rowText.includes("jul")) month = 7;
      else if (rowText.includes("agustus") || rowText.includes("agu")) month = 8;
      else if (rowText.includes("september") || rowText.includes("sep")) month = 9;
      else if (rowText.includes("oktober") || rowText.includes("okt")) month = 10;
      else if (rowText.includes("november") || rowText.includes("nov")) month = 11;
      else if (rowText.includes("desember") || rowText.includes("des")) month = 12;
    }

    // Locate shift rows
    const shiftRowIndices: number[] = [];
    for (let r = 0; r < table.rows.length; r++) {
      if (isShiftRow(table.rows[r])) {
        // Must either be preceded by date numbers or have explicit shift keywords
        const hasExplicitWords = table.rows[r].some((c) =>
          /shift\s*[1-3]/i.test(String(c ?? ""))
        );
        if (hasExplicitWords || (r > 0 && hasDateNumbers(table.rows[r - 1]))) {
          shiftRowIndices.push(r);
        }
      }
    }

    if (shiftRowIndices.length === 0) {
      continue;
    }

    // Map by dateStr__shiftNama across all blocks
    interface PeriodAggregate {
      tanggal: string;
      shiftNama: string;
      urutanShift: UrutanShift;
      shiftId: string | null;
      vendorId: string | null;
      vendorNama: string;
      totalPorsi: number;
      items: Record<string, number>;
      firstSheet: string;
      firstColIdx: number;
    }

    const aggregateMap = new Map<string, PeriodAggregate>();

    for (let bIdx = 0; bIdx < shiftRowIndices.length; bIdx++) {
      const shiftRowIdx = shiftRowIndices[bIdx];
      const dateRowIdx = shiftRowIdx > 0 ? shiftRowIdx - 1 : shiftRowIdx;
      const endRowIdx =
        bIdx < shiftRowIndices.length - 1
          ? shiftRowIndices[bIdx + 1] - 1
          : table.rows.length - 1;

      const shiftRow = table.rows[shiftRowIdx];
      const dateRow = table.rows[dateRowIdx];

      interface ColMeta {
        colIdx: number;
        dateStr: string;
        shiftNama: string;
        urutanShift: UrutanShift;
      }

      const activeCols: ColMeta[] = [];
      let currentDate = 1;

      for (let c = 1; c < shiftRow.length; c++) {
        const dVal = dateRow ? dateRow[c] : null;
        if (dVal !== null && dVal !== undefined) {
          const parsed = parseInt(String(dVal).trim(), 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
            currentDate = parsed;
          }
        }

        const shiftVal = normalizeString(String(shiftRow[c] ?? "")).toLowerCase();
        let shiftNama = "";
        let urutan: UrutanShift = 0;

        if (shiftVal === "3" || shiftVal.includes("3") || shiftVal.includes("malam")) {
          shiftNama = "Shift 3";
          urutan = 2;
        } else if (shiftVal === "1" || shiftVal.includes("1") || shiftVal.includes("siang")) {
          shiftNama = "Shift 1";
          urutan = 0;
        } else if (shiftVal === "2" || shiftVal.includes("2") || shiftVal.includes("sore")) {
          shiftNama = "Shift 2";
          urutan = 1;
        }

        if (shiftNama) {
          const dayPadded = String(currentDate).padStart(2, "0");
          const monthPadded = String(month).padStart(2, "0");
          const dateIso = `${year}-${monthPadded}-${dayPadded}`;

          activeCols.push({
            colIdx: c,
            dateStr: dateIso,
            shiftNama,
            urutanShift: urutan,
          });

          const aggKey = `${dateIso}__${shiftNama}`;
          if (!aggregateMap.has(aggKey)) {
            // Match shift ID
            const matchedShift = (options.knownShifts || []).find(
              (s) =>
                s.nama.toLowerCase() === shiftNama.toLowerCase() ||
                s.label.toLowerCase() === shiftNama.toLowerCase()
            );

            // Compute assigned vendor from TPS rotation
            const vendorName = getNamaVendorRotasi(dateIso, urutan);
            const matchedVendor = (options.knownVendors || []).find(
              (v) => v.nama.toLowerCase() === vendorName.toLowerCase()
            );

            aggregateMap.set(aggKey, {
              tanggal: dateIso,
              shiftNama,
              urutanShift: urutan,
              shiftId: matchedShift?.id || null,
              vendorId: matchedVendor?.id || null,
              vendorNama: vendorName,
              totalPorsi: 0,
              items: {},
              firstSheet: sheetName,
              firstColIdx: c,
            });
          }
        }
      }

      // Parse data rows in this block
      for (let r = shiftRowIdx + 1; r <= endRowIdx; r++) {
        const row = table.rows[r];
        if (!row || row.length === 0) continue;

        // Clean labels across first two cells
        const label0 = String(row[0] ?? "");
        const label1 = String(row[1] ?? "");
        const fullLabel = `${label0} ${label1}`.trim();
        const cleaned = cleanBagianLabel(fullLabel);
        if (!cleaned) continue;

        const isSummaryOrHeader =
          cleaned.includes("total") ||
          cleaned.includes("jumlah") ||
          cleaned.includes("pos security") ||
          cleaned.includes("ruang") ||
          cleaned.includes("tambahan") ||
          cleaned.startsWith("pt ");

        // Match department code or ID
        let matchedCode: string | null = null;
        let matchedBagianId: string | null = null;

        if (options.knownBagian && options.knownBagian.length > 0) {
          for (const kb of options.knownBagian) {
            const kbNama = cleanBagianLabel(kb.nama);
            const kbKode = kb.kode.toLowerCase();
            if (cleaned.includes(kbNama) || cleaned.includes(kbKode)) {
              matchedCode = kb.kode;
              matchedBagianId = kb.id;
              break;
            }
          }
        }

        if (!matchedCode) {
          for (const key of sortedDeptKeys) {
            if (cleaned.includes(key)) {
              matchedCode = DEFAULT_BAGIAN_MAP[key];
              break;
            }
          }
        }

        for (const col of activeCols) {
          const val = parsePorsiValue(row[col.colIdx]);
          const agg = aggregateMap.get(`${col.dateStr}__${col.shiftNama}`);
          if (agg) {
            if (val > 0 && !isSummaryOrHeader) {
              agg.totalPorsi += val;
            }
            if (matchedCode && !cleaned.includes("total") && !cleaned.includes("jumlah")) {
              const targetKey = matchedCode;
              agg.items[targetKey] = (agg.items[targetKey] || 0) + val;
            }
          }
        }
      }
    }

    // Convert aggregate map into parsed rows
    for (const agg of aggregateMap.values()) {
      results.push({
        id: `rekap-${seq++}`,
        tanggal: agg.tanggal,
        shift_id: agg.shiftId,
        shift_nama: agg.shiftNama,
        vendor_id: agg.vendorId,
        vendor_nama: agg.vendorNama,
        items: agg.items,
        total_porsi: agg.totalPorsi,
        status: "cocok",
        sumber: {
          sheet: agg.firstSheet,
          cell: `C${agg.firstColIdx}`,
        },
      });
    }
  }

  // Sort by date ascending and shift urutan
  return results.sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    const uA = a.shift_nama.includes("3") ? 2 : a.shift_nama.includes("2") ? 1 : 0;
    const uB = b.shift_nama.includes("3") ? 2 : b.shift_nama.includes("2") ? 1 : 0;
    return uA - uB;
  });
}
