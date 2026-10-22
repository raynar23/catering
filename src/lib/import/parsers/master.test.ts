// Unit tests for vendor and bagian parsers
import { describe, it, expect } from "vitest";
import { parseVendor } from "./vendor";
import { parseBagian } from "./bagian";
import { RawTableData } from "../types";

describe("parsers/vendor.ts and parsers/bagian.ts", () => {
  it("parses vendor table with varied headers and recognizes existing vs new vendors", () => {
    const table: RawTableData = {
      sheetName: "Data Vendor",
      headers: ["Kode", "Nama Catering", "No Telepon / WhatsApp", "Alamat Kantor", "Penanggung Jawab"],
      rows: [
        ["V001", "Aisya Catering", "08123456701", "Surabaya", "Ibu Siti"],
        ["", "Berkah Barokah Baru", "08199988877", "Sidoarjo", "Pak Budi"],
      ],
    };

    const knownVendors = [
      { id: "v1", nama: "Aisya Catering", kode: "V001" },
    ];

    const results = parseVendor([table], { knownVendors });
    expect(results.length).toBe(2);

    expect(results[0].status).toBe("cocok");
    expect(results[0].nama).toBe("Aisya Catering");
    expect(results[0].kode).toBe("V001");
    expect(results[0].penanggung_jawab).toBe("Ibu Siti");

    expect(results[1].status).toBe("baru");
    expect(results[1].nama).toBe("Berkah Barokah Baru");
    expect(results[1].kode).toMatch(/^V\d{3}$/);
  });

  it("parses bagian table with varied headers and generates codes if absent", () => {
    const table: RawTableData = {
      sheetName: "Master Bagian",
      headers: ["Divisi Kerja", "Kategori Grup", "Titik Antar", "Catatan"],
      rows: [
        ["CC Operator", "Operasional", "Dermaga CC", "Sebelum shift mulai"],
        ["Seksi Baru Khusus", "Teknik", "Gedung Kantor", "Lantai 2"],
      ],
    };

    const knownBagian = [
      { id: "b1", nama: "CC Operator", kode: "CC_OP", kelompok: "Operasional" },
    ];

    const results = parseBagian([table], { knownBagian });
    expect(results.length).toBe(2);

    expect(results[0].status).toBe("cocok");
    expect(results[0].nama).toBe("CC Operator");
    expect(results[0].lokasi_antar).toBe("Dermaga CC");

    expect(results[1].status).toBe("baru");
    expect(results[1].nama).toBe("Seksi Baru Khusus");
    expect(results[1].kelompok).toBe("Teknik");
  });
});
