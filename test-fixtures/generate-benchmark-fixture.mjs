// Generates a 92-day benchmark Excel schedule for testing import:check
import ExcelJS from "exceljs";
import { resolve } from "path";
import { getNamaVendorRotasi } from "../src/lib/jadwal/rotasi.ts";

async function generateBenchmark() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Jadwal Q4 2026");

  // Headers
  worksheet.addRow(["No.", "Tanggal", "Shift", "Vendor Catering"]);

  let rowNum = 2;

  // 92 days (October 1 to December 31 = 31 + 30 + 31 = 92 days)
  const baseDate = new Date("2026-10-01T00:00:00Z");

  for (let day = 0; day < 92; day++) {
    const curDate = new Date(baseDate.getTime() + day * 86400 * 1000);
    const dateStr = curDate.toISOString().slice(0, 10);

    const vSiang = getNamaVendorRotasi(dateStr, 0);
    const vSore = getNamaVendorRotasi(dateStr, 1);
    const vMalam = getNamaVendorRotasi(dateStr, 2);

    // Row 1 (Siang) - includes date and number
    const r1 = worksheet.addRow([day + 1, dateStr, "a. Siang", `  ${vSiang}  `]);

    // Row 2 (Sore) - merged date cell (empty date)
    const r2 = worksheet.addRow(["", "", "b. Sore", `${vSore}`]);

    // Row 3 (Malam) - merged date cell (empty date)
    const r3 = worksheet.addRow(["", "", "c. Malam", `${vMalam}   `]);

    // Merge date column across the 3 rows: B(rowNum):B(rowNum+2)
    worksheet.mergeCells(`B${rowNum}:B${rowNum + 2}`);
    worksheet.mergeCells(`A${rowNum}:A${rowNum + 2}`);

    rowNum += 3;
  }

  const outPath = resolve(process.cwd(), "test-fixtures/jadwal-92hari-benchmark.xlsx");
  await workbook.xlsx.writeFile(outPath);
  console.log(`Generated benchmark file: ${outPath} (Total rows: ${(rowNum - 2)})`);
}

generateBenchmark().catch(console.error);
