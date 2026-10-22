// Unit tests for PDF text extractor
import { describe, it, expect, vi } from "vitest";
import { PdfExtractor, PdfNeedsOcrError } from "./pdf";

// Mock pdfjs-dist
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument: vi.fn(),
}));

describe("extract/pdf.ts", () => {
  it("extracts text layer and parses table columns", async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const mockGetTextContent = vi.fn().mockResolvedValue({
      items: [
        { str: "No", transform: [1, 0, 0, 1, 10, 500] },
        { str: "Tanggal", transform: [1, 0, 0, 1, 50, 500] },
        { str: "Shift", transform: [1, 0, 0, 1, 150, 500] },
        { str: "Vendor", transform: [1, 0, 0, 1, 250, 500] },
        { str: "1", transform: [1, 0, 0, 1, 10, 480] },
        { str: "2026-10-01", transform: [1, 0, 0, 1, 50, 480] },
        { str: "a. Siang", transform: [1, 0, 0, 1, 150, 480] },
        { str: "Aisya Catering", transform: [1, 0, 0, 1, 250, 480] },
      ],
    });

    vi.mocked(pdfjs.getDocument).mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: mockGetTextContent,
        }),
      }),
    } as any);

    const extractor = new PdfExtractor();
    const result = await extractor.extract(Buffer.from("dummy pdf"), "schedule.pdf");

    expect(result.length).toBe(1);
    expect(result[0].headers.length).toBeGreaterThanOrEqual(1);
    expect(result[0].rows.length).toBeGreaterThanOrEqual(1);
  });

  it("throws PdfNeedsOcrError when text layer is empty", async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    vi.mocked(pdfjs.getDocument).mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({ items: [] }),
        }),
      }),
    } as any);

    const extractor = new PdfExtractor();
    await expect(
      extractor.extract(Buffer.from("scanned pdf"), "scan.pdf")
    ).rejects.toThrow(PdfNeedsOcrError);
  });
});
