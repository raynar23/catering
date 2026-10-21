import { describe, it, expect } from "vitest";
import { periodSchema, gantiVendorSchema } from "./periode";

describe("period validation schemas", () => {
  it("validates correct period input", () => {
    const valid = {
      tanggal: "2026-10-19",
      shift_id: "00000000-0000-0000-0000-000000000001",
      vendor_id: "00000000-0000-0000-0000-000000000002",
      keterangan: "Jadwal reguler",
    };
    const result = periodSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("fails when tanggal format is invalid", () => {
    const invalid = {
      tanggal: "19-10-2026",
      shift_id: "00000000-0000-0000-0000-000000000001",
      vendor_id: "00000000-0000-0000-0000-000000000002",
    };
    const result = periodSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("requires alasan for ganti vendor with min 5 characters", () => {
    const invalid = {
      period_id: "00000000-0000-0000-0000-000000000001",
      vendor_baru_id: "00000000-0000-0000-0000-000000000002",
      alasan: "rus",
    };
    expect(gantiVendorSchema.safeParse(invalid).success).toBe(false);

    const valid = { ...invalid, alasan: "Kapasitas dapur penuh" };
    expect(gantiVendorSchema.safeParse(valid).success).toBe(true);
  });
});
