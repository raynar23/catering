import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { XlsxExtractor } from "./xlsx";

describe("XlsxExtractor", () => {
  it("extracts headers, rows, and resolves merged cells across multiple rows", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Jadwal");

    // Header row
    sheet.getRow(1).values = ["No", "Tanggal", "Shift", "Vendor"];

    // Date "2026-10-01" merged across row 2, 3, 4
    sheet.getCell("A2").value = 1;
    sheet.getCell("B2").value = "2026-10-01";
    sheet.getCell("C2").value = "a. Siang";
    sheet.getCell("D2").value = "Aisya Catering";

    sheet.getCell("A3").value = 2;
    sheet.getCell("C3").value = "b. Sore";
    sheet.getCell("D3").value = "Catering IBU";

    sheet.getCell("A4").value = 3;
    sheet.getCell("C4").value = "c. Malam";
    sheet.getCell("D4").value = "Nikmat Rasa";

    // Merge date cell B2:B4
    sheet.mergeCells("B2:B4");

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extractor = new XlsxExtractor();
    const tables = await extractor.extract(buffer, "test_jadwal.xlsx");

    expect(tables.length).toBe(1);
    const table = tables[0];
    expect(table.sheetName).toBe("Jadwal");
    expect(table.headers).toEqual(["No", "Tanggal", "Shift", "Vendor"]);
    expect(table.rows.length).toBe(3);

    // Merged date B2:B4 should propagate "2026-10-01" to all 3 rows
    expect(table.rows[0][1]).toBe("2026-10-01");
    expect(table.rows[1][1]).toBe("2026-10-01");
    expect(table.rows[2][1]).toBe("2026-10-01");

    expect(table.rows[0][2]).toBe("a. Siang");
    expect(table.rows[1][2]).toBe("b. Sore");
    expect(table.rows[2][2]).toBe("c. Malam");
  });

  it("extracts stored value for formula cells", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Perhitungan");

    sheet.getRow(1).values = ["Item", "Jumlah", "Harga", "Total"];
    sheet.getCell("A2").value = "Porsi";
    sheet.getCell("B2").value = 50;
    sheet.getCell("C2").value = 20000;
    sheet.getCell("D2").value = {
      formula: "B2*C2",
      result: 1000000,
    };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extractor = new XlsxExtractor();
    const tables = await extractor.extract(buffer, "test_formula.xlsx");

    expect(tables[0].rows[0][3]).toBe(1000000);
  });

  it("extracts data from CSV buffers", async () => {
    const csvContent = "No,Nama Vendor,Kontak\n1,Aisya Catering,08123456789\n2,Catering IBU,08234567890\n";
    const buffer = Buffer.from(csvContent, "utf-8");

    const extractor = new XlsxExtractor();
    const tables = await extractor.extract(buffer, "vendors.csv");

    expect(tables.length).toBe(1);
    expect(tables[0].headers).toEqual(["No", "Nama Vendor", "Kontak"]);
    expect(tables[0].rows.length).toBe(2);
    expect(tables[0].rows[0][1]).toBe("Aisya Catering");
  });
});
