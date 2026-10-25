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
  "rtg operator": "RTG_OP",
  cc: "CC_OP",
  rtg: "RTG_OP",
  cfs: "CFS",
  gudang: "CFS",
};

/**
 * Normalizes department label and removes extraneous suffixes
 */
function cleanBagianLabel(raw: string): string {
  const norm = normalizeString(raw).toLowerCase();
  // Strip annotations like "Mengikuti update jadwal manning", "(manning)", etc.
  return norm
    .replace(/mengikuti update.*/gi, "")
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
 * Parses daily matrix table with shift columns (3, 1, 2) across calendar dates
 */
export function parseRekapHarian(
  tables: RawTableData[],
  options: ParseRekapOptions = {}
): RekapHarianParsedRow[] {
  const year = options.year || 2026;
  const month = options.month || 10;
  const results: RekapHarianParsedRow[] = [];
  let seq = 1;

  // Sort department keys by descending length so specific terms are tested before short acronyms
  const sortedDeptKeys = Object.keys(DEFAULT_BAGIAN_MAP).sort(
    (a, b) => b.length - a.length
  );

  for (const table of tables) {
    const sheetName = table.sheetName || "Rekap Harian";

    // Locate header row containing dates or shift indicators
    let shiftHeaderRowIdx = -1;
    let dateHeaderRowIdx = -1;

    for (let r = 0; r < Math.min(table.rows.length, 10); r++) {
      const rowStr = table.rows[r].join(" ").toLowerCase();
      if (rowStr.includes("shift 3") || rowStr.includes("shift 1") || rowStr.includes("shift 2")) {
        shiftHeaderRowIdx = r;
        dateHeaderRowIdx = r > 0 ? r - 1 : r;
        break;
      }
    }

    if (shiftHeaderRowIdx === -1) {
      continue;
    }

    const shiftRow = table.rows[shiftHeaderRowIdx];
    const dateRow = table.rows[dateHeaderRowIdx];

    interface MatrixCol {
      colIdx: number;
      dateStr: string;
      shiftNama: string;
      urutanShift: UrutanShift;
    }

    const matrixCols: MatrixCol[] = [];
    let currentDate = 1;

    for (let c = 1; c < shiftRow.length; c++) {
      const shiftVal = normalizeString(String(shiftRow[c] ?? "")).toLowerCase();
      const dateVal = dateRow ? normalizeString(String(dateRow[c] ?? "")) : "";

      const parsedDayNum = parseInt(dateVal, 10);
      if (!isNaN(parsedDayNum) && parsedDayNum >= 1 && parsedDayNum <= 31) {
        currentDate = parsedDayNum;
      }

      let shiftNama = "";
      let urutan: UrutanShift = 0;

      if (shiftVal.includes("3") || shiftVal.includes("malam")) {
        shiftNama = "Shift 3";
        urutan = 2;
      } else if (shiftVal.includes("1") || shiftVal.includes("siang")) {
        shiftNama = "Shift 1";
        urutan = 0;
      } else if (shiftVal.includes("2") || shiftVal.includes("sore")) {
        shiftNama = "Shift 2";
        urutan = 1;
      }

      if (shiftNama) {
        const dayPadded = String(currentDate).padStart(2, "0");
        const monthPadded = String(month).padStart(2, "0");
        const dateIso = `${year}-${monthPadded}-${dayPadded}`;

        matrixCols.push({
          colIdx: c,
          dateStr: dateIso,
          shiftNama,
          urutanShift: urutan,
        });
      }
    }

    interface BagianRowData {
      bagianKode: string;
      values: Map<number, number>;
    }

    const departmentRows: BagianRowData[] = [];

    for (let r = shiftHeaderRowIdx + 1; r < table.rows.length; r++) {
      const row = table.rows[r];
      if (!row || row.length === 0) continue;

      const label = cleanBagianLabel(String(row[0] ?? ""));
      if (!label) continue;

      // Find matching department code prioritizing longer keys
      let matchedCode: string | null = null;
      for (const key of sortedDeptKeys) {
        if (label.includes(key)) {
          matchedCode = DEFAULT_BAGIAN_MAP[key];
          break;
        }
      }

      if (matchedCode) {
        const valMap = new Map<number, number>();
        for (const col of matrixCols) {
          const val = parsePorsiValue(row[col.colIdx]);
          valMap.set(col.colIdx, val);
        }
        departmentRows.push({ bagianKode: matchedCode, values: valMap });
      }
    }

    // Pivot back to rows per date + shift
    const periodMap = new Map<string, MatrixCol>();
    for (const col of matrixCols) {
      const key = `${col.dateStr}__${col.shiftNama}`;
      if (!periodMap.has(key)) {
        periodMap.set(key, col);
      }
    }

    for (const col of periodMap.values()) {
      const items: Record<string, number> = {};
      let totalPorsi = 0;

      for (const dept of departmentRows) {
        const porsi = dept.values.get(col.colIdx) || 0;
        items[dept.bagianKode] = porsi;
        totalPorsi += porsi;
      }

      const expectedVendor = getNamaVendorRotasi(col.dateStr, col.urutanShift);

      results.push({
        id: `rekap-${seq++}`,
        tanggal: col.dateStr,
        shift_id: null,
        shift_nama: col.shiftNama,
        vendor_id: null,
        vendor_nama: expectedVendor,
        items,
        total_porsi: totalPorsi,
        status: "cocok",
        sumber: {
          sheet: sheetName,
          cell: `C${col.colIdx}`,
        },
      });
    }
  }

  return results;
}
