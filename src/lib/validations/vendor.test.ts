import { describe, it, expect } from "vitest";
import { vendorSchema } from "./vendor";

describe("vendorSchema", () => {
  it("validates correct vendor input", () => {
    const valid = {
      kode: "V001",
      nama: "Aisya Catering",
      nama_kontak: "Ibu Aisya",
      no_wa: "081234567890",
      no_telp: "0313551234",
      alamat: "Tanjung Perak, Surabaya",
      urutan_rotasi: 0,
      aktif: true,
    };
    const result = vendorSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("fails when kode or nama is missing", () => {
    const invalid = { kode: "", nama: "" };
    const result = vendorSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates phone number regex if provided", () => {
    const invalidPhone = {
      kode: "V002",
      nama: "Catering Berkah",
      no_wa: "abc-invalid",
    };
    const result = vendorSchema.safeParse(invalidPhone);
    expect(result.success).toBe(false);
  });
});
