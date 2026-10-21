import { describe, it, expect } from "vitest";
import {
  normalizePhoneNumber,
  waLink,
  buildRevisionWaMessage,
  buildVendorFollowUpWaMessage,
} from "./whatsapp";

describe("whatsapp helper", () => {
  it("normalizes Indonesian phone numbers correctly", () => {
    expect(normalizePhoneNumber("081234567890")).toBe("6281234567890");
    expect(normalizePhoneNumber("+62 812-3456-7890")).toBe("6281234567890");
    expect(normalizePhoneNumber("81234567890")).toBe("6281234567890");
    expect(normalizePhoneNumber("6281234567890")).toBe("6281234567890");
  });

  it("generates wa.me link with encoded message", () => {
    const link = waLink("081234567890", "Halo Vendor TPS");
    expect(link).toBe("https://wa.me/6281234567890?text=Halo%20Vendor%20TPS");
  });

  it("generates wa.me link without message when text is empty", () => {
    const link = waLink("081234567890");
    expect(link).toBe("https://wa.me/6281234567890");
  });

  it("returns empty string when phone number is blank", () => {
    expect(waLink("")).toBe("");
  });

  it("builds revision WhatsApp message with delta and reason", () => {
    const msg = buildRevisionWaMessage({
      vendorNama: "Aisya Catering",
      tanggal: "2026-10-22",
      shiftNama: "Shift 1",
      bagianNama: "Operasional",
      porsiAwal: 20,
      porsiBaru: 23,
      selisih: 3,
      alasan: "Tambahan 3 personil lembur kapal",
    });

    expect(msg).toContain("Halo Tim Aisya Catering");
    expect(msg).toContain("Kamis, 22 Oktober 2026");
    expect(msg).toContain("Shift 1");
    expect(msg).toContain("Bagian: Operasional");
    expect(msg).toContain("20 menjadi 23 porsi (+3)");
    expect(msg).toContain("Alasan: Tambahan 3 personil lembur kapal");
  });

  it("builds vendor follow-up WhatsApp message", () => {
    const msg = buildVendorFollowUpWaMessage({
      vendorNama: "Nurina Catering",
      tanggal: "2026-10-22",
      shiftNama: "Shift 2",
      catatan: "Vendor merespon tidak sanggup",
    });

    expect(msg).toContain("Halo Tim Nurina Catering");
    expect(msg).toContain("Kamis, 22 Oktober 2026");
    expect(msg).toContain("Shift 2");
    expect(msg).toContain("Catatan: Vendor merespon tidak sanggup");
  });
});

