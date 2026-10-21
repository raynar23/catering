import { describe, it, expect } from "vitest";
import { bagianSchema } from "./bagian";

describe("bagianSchema", () => {
  it("validates correct bagian input", () => {
    const valid = {
      nama: "CC Operator",
      kode: "CC_OP",
      kelompok: "Operasional",
      lokasi_antar: "Dermaga Internasional",
      urutan: 1,
      aktif: true,
    };
    const result = bagianSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("fails when nama is empty or too short", () => {
    const invalid = { nama: " " };
    const result = bagianSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("applies defaults for urutan and aktif", () => {
    const result = bagianSchema.safeParse({ nama: "RTG Operator" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.urutan).toBe(0);
      expect(result.data.aktif).toBe(true);
    }
  });
});
