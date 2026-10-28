// ExcelJS extractor resolving merged cells, stored values, and 5,000 row limits
import ExcelJS from "exceljs";
import { Readable } from "stream";
import { ExtractorInterface, RawTableData } from "../types";

export const MAX_IMPORT_ROWS = 5000;

// Resolve cell value taking cached formula result if formula is present
export function getCellValue(cell: ExcelJS.Cell): string | number | boolean | null {
  const val = cell.value;
  if (val === null || val === undefined) return null;

  // Formula cell: extract evaluated result
  if (typeof val === "object") {
    if ("result" in val && val.result !== undefined && val.result !== null) {
      if (val.result instanceof Date) {
        return val.result.toISOString().slice(0, 10);
      }
      return val.result as string | number | boolean;
    }
    if ("text" in val && typeof val.text === "string") {
      return val.text;
    }
    if ("richText" in val && Array.isArray(val.richText)) {
      return val.richText.map((t) => t.text).join("");
    }
    if (val instanceof Date) {
      return val.toISOString().slice(0, 10);
    }
    return String(val);
  }

  return val;
}

// Extractor implementing Excel and CSV sheet matrix extraction with merged-cell resolution
export class XlsxExtractor implements ExtractorInterface {
  async extract(buffer: Buffer, filename: string): Promise<RawTableData[]> {
    const workbook = new ExcelJS.Workbook();
    const isCsv = filename.toLowerCase().endsWith(".csv");

    if (isCsv) {
      const bufferStream = Readable.from(buffer);
      await workbook.csv.read(bufferStream);
    } else {
      await workbook.xlsx.load(buffer as any);
    }

    const results: RawTableData[] = [];

    workbook.eachSheet((worksheet) => {
      // Build lookup for merged cell master values
      const mergedMap = new Map<string, string | number | boolean | null>();

      // In ExcelJS, worksheet._merges or model.merges contains ranges
      const merges = (worksheet as any).model?.merges || [];
      for (const rangeStr of merges) {
        try {
          // rangeStr is e.g. "B4:B6"
          const [topMaster, bottomSlave] = rangeStr.split(":");
          const masterCell = worksheet.getCell(topMaster);
          const masterVal = getCellValue(masterCell);

          // Get row/col coordinates
          const startCol = Number(masterCell.col);
          const startRow = Number(masterCell.row);
          const slaveCell = worksheet.getCell(bottomSlave);
          const endCol = Number(slaveCell.col);
          const endRow = Number(slaveCell.row);

          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              mergedMap.set(`${r},${c}`, masterVal);
            }
          }
        } catch {
          // Ignore merge parsing anomaly
        }
      }

      const allRows: (string | number | boolean | null)[][] = [];
      let rowCounter = 0;

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowCounter >= MAX_IMPORT_ROWS) return;
        rowCounter++;

        const rowValues: (string | number | boolean | null)[] = [];
        const cellCount = Math.max(row.cellCount, row.actualCellCount, 1);

        for (let colIdx = 1; colIdx <= cellCount; colIdx++) {
          const mergeKey = `${rowNumber},${colIdx}`;
          let val: string | number | boolean | null = null;

          if (mergedMap.has(mergeKey)) {
            val = mergedMap.get(mergeKey) ?? null;
          } else {
            const cell = row.getCell(colIdx);
            val = getCellValue(cell);
          }

          rowValues.push(val);
        }

        allRows.push(rowValues);
      });

      if (allRows.length > 0) {
        let headerIdx = -1;
        const headerRegex = /tanggal|tgl|hari|date|shift|waktu|jam|vendor|catering|suplier|penyedia|rekanan|bagian|divisi|kelompok|porsi|jumlah|total|no\b|nomor/i;

        // Scan first 10 rows for explicit column headers
        for (let r = 0; r < Math.min(allRows.length, 10); r++) {
          const row = allRows[r];
          const matched = row.filter((c) => c !== null && c !== undefined && headerRegex.test(String(c).trim())).length;
          const distinctNonEmpty = new Set(row.map((c) => String(c ?? "").trim()).filter(Boolean));
          if (matched >= 2 && distinctNonEmpty.size >= 2) {
            headerIdx = r;
            break;
          }
        }

        let headers: string[] = [];
        let dataRows: (string | number | boolean | null)[][] = [];

        if (headerIdx !== -1) {
          headers = allRows[headerIdx].map((h) => (h !== null && h !== undefined ? String(h).trim() : ""));
          dataRows = allRows.slice(headerIdx + 1);
        } else {
          // If row 0 is a merged title banner, skip it
          let startRow = 0;
          const firstNonEmpty = allRows[0].map((c) => String(c ?? "").trim()).filter(Boolean);
          const uniqueFirst = new Set(firstNonEmpty);
          if (uniqueFirst.size <= 1 && allRows.length > 1) {
            startRow = 1;
          }

          dataRows = allRows.slice(startRow);
          // Infer column headers from first representative row
          const sample = dataRows.find((r) => r.filter((c) => c !== null && c !== undefined && String(c).trim() !== "").length >= 2);
          if (sample) {
            headers = sample.map((c) => {
              const s = String(c ?? "").trim();
              if ((c as any) instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(s)) return "Tanggal";
              if (/^[a-c1-3][.)]/i.test(s) || /siang|sore|malam|shift/i.test(s)) return "Shift";
              if (typeof c === "number" || /^\d+$/.test(s)) return "No.";
              return "Vendor Catering";
            });
          } else {
            headers = ["No.", "Tanggal", "Shift", "Vendor Catering"];
          }
        }

        // Filter out completely empty rows
        const cleanedRows = dataRows.filter((row) =>
          row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")
        );

        results.push({
          sheetName: worksheet.name,
          headers,
          rows: cleanedRows,
        });
      }
    });

    return results;
  }
}
