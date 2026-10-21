import { describe, it, expect } from "vitest";
import { formatDelta, formatLogChange } from "./log-formatter";

describe("log-formatter", () => {
  it("formats positive, negative, and zero delta correctly", () => {
    expect(formatDelta(3)).toBe("+3");
    expect(formatDelta(-2)).toBe("-2");
    expect(formatDelta(0)).toBe("0");
    expect(formatDelta(null)).toBe("");
    expect(formatDelta(undefined)).toBe("");
  });

  it("formats revisi_diajukan with initial, new portion, and signed delta", () => {
    const text = formatLogChange({
      aksi: "revisi_diajukan",
      jumlah_awal: 20,
      selisih: 3,
      jumlah_baru: 23,
      bagian_nama: "Operasional",
    });
    expect(text).toBe("[Operasional] 20 menjadi 23 (+3)");
  });

  it("formats revisi_diajukan reduction correctly", () => {
    const text = formatLogChange({
      aksi: "revisi_diajukan",
      jumlah_awal: 15,
      selisih: -5,
      jumlah_baru: 10,
      bagian_nama: "Gudang CFS",
    });
    expect(text).toBe("[Gudang CFS] 15 menjadi 10 (-5)");
  });

  it("formats revisi_disetujui with approval note and values", () => {
    const text = formatLogChange({
      aksi: "revisi_disetujui",
      jumlah_awal: 20,
      selisih: 3,
      jumlah_baru: 23,
      bagian_nama: "Operasional",
    });
    expect(text).toBe("[Operasional] Disetujui: 20 menjadi 23 (+3)");
  });

  it("formats revisi_ditolak showing initial value unchanged", () => {
    const text = formatLogChange({
      aksi: "revisi_ditolak",
      jumlah_awal: 20,
      selisih: 0,
      jumlah_baru: 20,
      bagian_nama: "Operasional",
    });
    expect(text).toBe("[Operasional] Ditolak: tetap 20 porsi");
  });

  it("formats standard order lifecycle steps", () => {
    expect(
      formatLogChange({ aksi: "input_awal", jumlah_baru: 50 })
    ).toBe("Pembuatan draft awal (50 porsi)");

    expect(
      formatLogChange({ aksi: "kirim_ke_vendor", jumlah_baru: 50 })
    ).toBe("Pesanan difinalisasi (50 porsi)");

    expect(
      formatLogChange({ aksi: "respon_disanggupi" })
    ).toBe("Vendor menyanggupi pesanan");

    expect(
      formatLogChange({ aksi: "respon_tidak_sanggup" })
    ).toBe("Vendor tidak menyanggupi pesanan");

    expect(
      formatLogChange({ aksi: "progres_sampai" })
    ).toBe("Pesanan telah sampai di lokasi antar");
  });
});
