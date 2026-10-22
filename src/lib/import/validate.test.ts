// Unit tests for domain validation engine
import { describe, it, expect } from "vitest";
import {
  calculateImportSummary,
  getUrutanShiftFromAlias,
  validateJadwalRows,
} from "./validate";
import { JadwalParsedRow } from "./types";
import { getNamaVendorRotasi } from "../jadwal/rotasi";

describe("validate.ts", () => {
  it("calculates import batch summary metrics accurately", () => {
    const rows: JadwalParsedRow[] = [
      {
        id: "1",
        tanggal: "2026-10-01",
        shift_id: "s1",
        shift_nama: "Shift 1",
        shift_alias: "siang",
        vendor_id: "v1",
        vendor_nama: "Aisya Catering",
        vendor_kode: "AISYA",
        status: "cocok",
        sumber: { cell: "A1" },
      },
      {
        id: "2",
        tanggal: "2026-10-01",
        shift_id: "s2",
        shift_nama: "Shift 2",
        shift_alias: "sore",
        vendor_id: "v2",
        vendor_nama: "Catering IBU",
        vendor_kode: "IBU",
        status: "baru",
        sumber: { cell: "A2" },
      },
      {
        id: "3",
        tanggal: "2026-10-01",
        shift_id: "s3",
        shift_nama: "Shift 3",
        shift_alias: "malam",
        vendor_id: "v3",
        vendor_nama: "Nikmat Rasa",
        vendor_kode: "NIKMAT",
        status: "perlu_cek",
        sumber: { cell: "A3" },
      },
      {
        id: "4",
        tanggal: "2026-10-02",
        shift_id: null,
        shift_nama: "Shift 1",
        shift_alias: "siang",
        vendor_id: null,
        vendor_nama: "",
        vendor_kode: null,
        status: "error",
        sumber: { cell: "A4" },
      },
    ];

    const summary = calculateImportSummary(rows);
    expect(summary).toEqual({
      total: 4,
      cocok: 1,
      baru: 1,
      perlu_cek: 1,
      error: 1,
    });
  });

  it("maps shift aliases to rotation urutanShift index", () => {
    expect(getUrutanShiftFromAlias("siang")).toBe(0);
    expect(getUrutanShiftFromAlias("sore")).toBe(1);
    expect(getUrutanShiftFromAlias("malam")).toBe(2);
    expect(getUrutanShiftFromAlias("unknown")).toBeNull();
  });

  it("marks rows matching patent rotation as cocok when no issues exist", () => {
    // 2026-10-01 rotation:
    // siang: Aisya Catering (index 0)
    // sore: Catering IBU (index 1)
    // malam: Nikmat Rasa (index 2)
    const rows: JadwalParsedRow[] = [
      {
        id: "1",
        tanggal: "2026-10-01",
        shift_id: "s1",
        shift_nama: "Shift 1",
        shift_alias: "siang",
        vendor_id: "v1",
        vendor_nama: getNamaVendorRotasi("2026-10-01", 0),
        vendor_kode: "AISYA",
        status: "cocok",
        sumber: { cell: "B2" },
      },
      {
        id: "2",
        tanggal: "2026-10-01",
        shift_id: "s2",
        shift_nama: "Shift 2",
        shift_alias: "sore",
        vendor_id: "v2",
        vendor_nama: getNamaVendorRotasi("2026-10-01", 1),
        vendor_kode: "IBU",
        status: "cocok",
        sumber: { cell: "B3" },
      },
      {
        id: "3",
        tanggal: "2026-10-01",
        shift_id: "s3",
        shift_nama: "Shift 3",
        shift_alias: "malam",
        vendor_id: "v3",
        vendor_nama: getNamaVendorRotasi("2026-10-01", 2),
        vendor_kode: "NIKMAT",
        status: "cocok",
        sumber: { cell: "B4" },
      },
    ];

    const validated = validateJadwalRows(rows);
    expect(validated.every((r) => r.status === "cocok")).toBe(true);
  });

  it("warns with perlu_cek for rotation mismatches without treating them as error", () => {
    const rows: JadwalParsedRow[] = [
      {
        id: "1",
        tanggal: "2026-10-01",
        shift_id: "s1",
        shift_nama: "Shift 1",
        shift_alias: "siang",
        vendor_id: "v1",
        // Expected is Aisya Catering, but actual is Catering IBU
        vendor_nama: "Catering IBU",
        vendor_kode: "IBU",
        status: "cocok",
        sumber: { cell: "B2" },
      },
      {
        id: "2",
        tanggal: "2026-10-01",
        shift_id: "s2",
        shift_nama: "Shift 2",
        shift_alias: "sore",
        vendor_id: "v2",
        vendor_nama: getNamaVendorRotasi("2026-10-01", 1),
        vendor_kode: "IBU",
        status: "cocok",
        sumber: { cell: "B3" },
      },
      {
        id: "3",
        tanggal: "2026-10-01",
        shift_id: "s3",
        shift_nama: "Shift 3",
        shift_alias: "malam",
        vendor_id: "v3",
        vendor_nama: getNamaVendorRotasi("2026-10-01", 2),
        vendor_kode: "NIKMAT",
        status: "cocok",
        sumber: { cell: "B4" },
      },
    ];

    const validated = validateJadwalRows(rows);
    expect(validated[0].status).toBe("perlu_cek");
    expect(validated[0].alasan).toContain("Peringatan rotasi");
  });

  it("flags duplicate shifts on the same date as error", () => {
    const rows: JadwalParsedRow[] = [
      {
        id: "1",
        tanggal: "2026-10-01",
        shift_id: "s1",
        shift_nama: "Shift 1",
        shift_alias: "siang",
        vendor_id: "v1",
        vendor_nama: "Aisya Catering",
        vendor_kode: "AISYA",
        status: "cocok",
        sumber: { cell: "B2" },
      },
      {
        id: "2",
        tanggal: "2026-10-01",
        shift_id: "s1_dup",
        shift_nama: "Shift 1",
        shift_alias: "siang",
        vendor_id: "v1",
        vendor_nama: "Aisya Catering",
        vendor_kode: "AISYA",
        status: "cocok",
        sumber: { cell: "B3" },
      },
    ];

    const validated = validateJadwalRows(rows);
    expect(validated[1].status).toBe("error");
    expect(validated[1].alasan).toContain("Duplikat shift");
  });

  it("detects date gaps and flags warning perlu_cek", () => {
    const rows: JadwalParsedRow[] = [
      // Date 2026-10-01 (3 shifts)
      {
        id: "1",
        tanggal: "2026-10-01",
        shift_id: "s1",
        shift_nama: "Shift 1",
        shift_alias: "siang",
        vendor_id: "v1",
        vendor_nama: getNamaVendorRotasi("2026-10-01", 0),
        vendor_kode: "AISYA",
        status: "cocok",
        sumber: { cell: "B2" },
      },
      {
        id: "2",
        tanggal: "2026-10-01",
        shift_id: "s2",
        shift_nama: "Shift 2",
        shift_alias: "sore",
        vendor_id: "v2",
        vendor_nama: getNamaVendorRotasi("2026-10-01", 1),
        vendor_kode: "IBU",
        status: "cocok",
        sumber: { cell: "B3" },
      },
      {
        id: "3",
        tanggal: "2026-10-01",
        shift_id: "s3",
        shift_nama: "Shift 3",
        shift_alias: "malam",
        vendor_id: "v3",
        vendor_nama: getNamaVendorRotasi("2026-10-01", 2),
        vendor_kode: "NIKMAT",
        status: "cocok",
        sumber: { cell: "B4" },
      },
      // Skip 2026-10-02, jumps to 2026-10-03 (3 shifts)
      {
        id: "4",
        tanggal: "2026-10-03",
        shift_id: "s1",
        shift_nama: "Shift 1",
        shift_alias: "siang",
        vendor_id: "v1",
        vendor_nama: getNamaVendorRotasi("2026-10-03", 0),
        vendor_kode: "AISYA",
        status: "cocok",
        sumber: { cell: "B5" },
      },
      {
        id: "5",
        tanggal: "2026-10-03",
        shift_id: "s2",
        shift_nama: "Shift 2",
        shift_alias: "sore",
        vendor_id: "v2",
        vendor_nama: getNamaVendorRotasi("2026-10-03", 1),
        vendor_kode: "IBU",
        status: "cocok",
        sumber: { cell: "B6" },
      },
      {
        id: "6",
        tanggal: "2026-10-03",
        shift_id: "s3",
        shift_nama: "Shift 3",
        shift_alias: "malam",
        vendor_id: "v3",
        vendor_nama: getNamaVendorRotasi("2026-10-03", 2),
        vendor_kode: "NIKMAT",
        status: "cocok",
        sumber: { cell: "B7" },
      },
    ];

    const validated = validateJadwalRows(rows);
    expect(validated[0].status).toBe("perlu_cek");
    expect(validated[0].alasan).toContain("Celah tanggal terdeteksi");
  });
});
