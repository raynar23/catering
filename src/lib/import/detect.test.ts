// Unit tests for document type and confidence detection
import { describe, it, expect } from "vitest";
import { detectDocumentType, detectFormatFromFilename } from "./detect";
import { RawTableData } from "./types";

describe("detect.ts", () => {
  it("detects file format correctly from filename extensions", () => {
    expect(detectFormatFromFilename("jadwal.xlsx")).toBe("xlsx");
    expect(detectFormatFromFilename("data.csv")).toBe("csv");
    expect(detectFormatFromFilename("laporan.docx")).toBe("docx");
    expect(detectFormatFromFilename("pindai.pdf")).toBe("pdf");
    expect(detectFormatFromFilename("foto.jpg")).toBe("image");
  });

  it("detects jadwal document type with high confidence from schedule headers", () => {
    const table: RawTableData = {
      headers: ["No", "Tanggal", "Shift", "Vendor Catering"],
      rows: [
        ["1", "2026-10-01", "a. Siang", "Aisya Catering"],
        ["2", "2026-10-01", "b. Sore", "Catering IBU"],
      ],
    };

    const res = detectDocumentType([table], { filename: "jadwal_oktober.xlsx" });
    expect(res.jenis).toBe("jadwal");
    expect(res.keyakinan).toBeGreaterThanOrEqual(0.8);
    expect(res.format).toBe("xlsx");
  });

  it("detects vendor document type with contact and address headers", () => {
    const table: RawTableData = {
      headers: ["Kode Vendor", "Nama Vendor", "Kontak / WA", "Alamat Perusahaan"],
      rows: [["V001", "Aisya Catering", "08123456789", "Surabaya"]],
    };

    const res = detectDocumentType([table], { filename: "data_vendor.xlsx" });
    expect(res.jenis).toBe("vendor");
    expect(res.keyakinan).toBeGreaterThanOrEqual(0.7);
  });

  it("detects bagian document type with department headers", () => {
    const table: RawTableData = {
      headers: ["Kode", "Nama Bagian", "Kelompok Kerja", "Lokasi Antar"],
      rows: [["CC_OP", "CC Operator", "Operasional", "Dermaga CC"]],
    };

    const res = detectDocumentType([table], { filename: "master_bagian.xlsx" });
    expect(res.jenis).toBe("bagian");
    expect(res.keyakinan).toBeGreaterThanOrEqual(0.7);
  });

  it("detects rekap_harian document type from matrix headers", () => {
    const table: RawTableData = {
      headers: ["Bagian", "Shift 3", "Shift 1", "Shift 2", "Total Porsi"],
      rows: [["Rekapitulasi Pembagian Jatah Makan", "", "", "", ""]],
    };

    const res = detectDocumentType([table], { filename: "rekap_update_porsi.xlsx" });
    expect(res.jenis).toBe("rekap_harian");
    expect(res.keyakinan).toBeGreaterThanOrEqual(0.7);
  });

  it("honors user forced type override with 1.0 confidence", () => {
    const table: RawTableData = {
      headers: ["Kolom A", "Kolom B"],
      rows: [["1", "2"]],
    };

    const res = detectDocumentType([table], {
      filename: "ambiguous.xlsx",
      forceType: "bagian",
    });

    expect(res.jenis).toBe("bagian");
    expect(res.keyakinan).toBe(1.0);
    expect(res.alasan).toContain("Dipaksa oleh pengguna");
  });
});
