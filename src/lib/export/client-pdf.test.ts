// Unit tests for client-side PDF export utility
import { describe, it, expect } from "vitest";
import { exportTableToPdf } from "./client-pdf";

describe("client-pdf.ts", () => {
  it("generates a valid PDF buffer with columns, data, and logo in landscape A4", async () => {
    const columns = [
      { header: "Kode", key: "kode" },
      { header: "Nama Bagian", key: "nama" },
      { header: "Kelompok", key: "kelompok" },
      { header: "Urutan", key: "urutan", align: "center" as const },
      { header: "Status", key: "aktif", format: (r: any) => (r.aktif ? "Aktif" : "Nonaktif") },
    ];

    const data = [
      { kode: "OPS", nama: "Operasional", kelompok: "Operasi", urutan: 1, aktif: true },
      { kode: "TKN", nama: "Teknik", kelompok: "Teknik", urutan: 2, aktif: false },
    ];

    const result = await exportTableToPdf({
      filename: "Test_Bagian.pdf",
      title: "DATA BAGIAN TEST",
      subtitle: "Total: 2 Bagian",
      columns,
      data,
      catatan: "Catatan pengujian unit test.",
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(1000);
    // PDF magic number %PDF-
    const header = String.fromCharCode(...result.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("handles portrait orientation and empty data gracefully", async () => {
    const result = await exportTableToPdf({
      filename: "Empty_Report.pdf",
      title: "LAPORAN KOSONG",
      columns: [{ header: "Kolom 1", key: "col1" }],
      data: [],
      orientation: "portrait",
    });

    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(500);
  });
});
