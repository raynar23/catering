// Unit tests for OCR conversion and runner
import { describe, it, expect, vi } from "vitest";
import { convertOcrTextToTable, runBrowserOcr } from "./ocr";
import * as tesseract from "tesseract.js";

vi.mock("tesseract.js", () => ({
  createWorker: vi.fn(),
}));

describe("extract/ocr.ts", () => {
  it("converts OCR text output into raw table rows", () => {
    const rawOcr = `
1   2026-10-01   a. Siang   Aisya Catering
2   2026-10-01   b. Sore    Catering IBU
3   2026-10-01   c. Malam   Nikmat Rasa
    `;

    const table = convertOcrTextToTable(rawOcr);
    expect(table.headers).toEqual(["No", "Tanggal", "Shift", "Vendor"]);
    expect(table.rows.length).toBe(3);
    expect(table.rows[0][1]).toBe("2026-10-01");
    expect(table.rows[0][3]).toBe("Aisya Catering");
  });

  it("runs browser OCR with tesseract worker and progress callback", async () => {
    const mockTerminate = vi.fn().mockResolvedValue(undefined);
    const mockRecognize = vi.fn().mockResolvedValue({
      data: { text: "2026-10-01 a. Siang Aisya Catering" },
    });

    vi.mocked(tesseract.createWorker).mockImplementation(async (_lang, _oem, options) => {
      // Simulate progress callback
      if (options?.logger) {
        options.logger({ status: "recognizing text", progress: 0.5 } as any);
      }
      return {
        recognize: mockRecognize,
        terminate: mockTerminate,
      } as any;
    });

    let reportedProgress = 0;
    const text = await runBrowserOcr("image-data-url", (prog) => {
      reportedProgress = prog;
    });

    expect(reportedProgress).toBe(50);
    expect(text).toContain("Aisya Catering");
    expect(mockTerminate).toHaveBeenCalled();
  });
});
