// Unit tests for magic number validation
import { describe, it, expect } from "vitest";
import { validateMagicNumber } from "./magic";

describe("extract/magic.ts", () => {
  it("validates zip signature for xlsx and docx", () => {
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    expect(validateMagicNumber(zipHeader, "xlsx")).toBe(true);
    expect(validateMagicNumber(zipHeader, "docx")).toBe(true);
    expect(validateMagicNumber(zipHeader, "pdf")).toBe(false);
  });

  it("validates pdf signature", () => {
    const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    expect(validateMagicNumber(pdfHeader, "pdf")).toBe(true);
    expect(validateMagicNumber(pdfHeader, "xlsx")).toBe(false);
  });

  it("validates csv plain text format and rejects binary files", () => {
    const csvBuffer = Buffer.from("No,Tanggal,Shift,Vendor\n1,2026-10-01,Siang,Aisya");
    expect(validateMagicNumber(csvBuffer, "csv")).toBe(true);

    const binaryBuffer = Buffer.from([0x01, 0x02, 0x00, 0x04, 0x05]);
    expect(validateMagicNumber(binaryBuffer, "csv")).toBe(false);
  });

  it("validates png and jpeg headers", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateMagicNumber(png, "png")).toBe(true);

    const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(validateMagicNumber(jpg, "jpg")).toBe(true);
    expect(validateMagicNumber(jpg, "jpeg")).toBe(true);
  });
});
