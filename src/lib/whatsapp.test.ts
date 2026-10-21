import { describe, it, expect } from "vitest";
import { normalizePhoneNumber, waLink } from "./whatsapp";

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
});
