import { describe, it, expect } from "vitest";
import { shiftSchema } from "./shift";

describe("shiftSchema", () => {
  it("validates valid shift with standard time", () => {
    const valid = {
      nama: "Shift 1",
      label: "Siang",
      alias: "Siang",
      jam_mulai: "08:00",
      jam_selesai: "16:00",
      batas_tiba: "10:00",
      urutan: 1,
      urutan_laporan: 1,
      aktif: true,
    };
    const result = shiftSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("permits 24:00 as valid end time", () => {
    const valid = {
      nama: "Shift 2",
      label: "Sore",
      alias: "Sore",
      jam_mulai: "16:00",
      jam_selesai: "24:00",
      batas_tiba: "18:00",
      urutan: 2,
      urutan_laporan: 2,
      aktif: true,
    };
    const result = shiftSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("fails when time format is invalid", () => {
    const invalid = {
      nama: "Shift 3",
      label: "Malam",
      alias: "Malam",
      jam_mulai: "invalid-time",
      jam_selesai: "08:00",
      batas_tiba: "02:00",
    };
    const result = shiftSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
