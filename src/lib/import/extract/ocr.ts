// Client-side OCR extractor using tesseract.js Web Worker
import { createWorker } from "tesseract.js";
import { RawTableData } from "../types";
import { normalizeString } from "../match";

export type OcrProgressCallback = (progress: number, message: string) => void;

/**
 * Performs OCR recognition on an image or canvas blob using Indonesian language worker
 */
export async function runBrowserOcr(
  imageSource: Blob | File | HTMLCanvasElement | string,
  onProgress?: OcrProgressCallback
): Promise<string> {
  const worker = await createWorker("ind", 1, {
    logger: (m) => {
      if (onProgress && m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress(Math.round(m.progress * 100), m.status);
      }
    },
  });

  try {
    const ret = await worker.recognize(imageSource);
    return ret.data.text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Converts OCR recognized text lines into structured raw table data
 */
export function convertOcrTextToTable(ocrText: string): RawTableData {
  const rawLines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const headers = ["No", "Tanggal", "Shift", "Vendor"];
  const rows: (string | number | boolean | null)[][] = [];

  for (const rawLine of rawLines) {
    // Attempt to split by 2+ spaces, tabs, or pipe delimiter before collapsing spaces
    const parts = rawLine
      .split(/\s{2,}|\t|\|/)
      .map((p) => normalizeString(p))
      .filter(Boolean);

    if (parts.length > 1) {
      rows.push(parts);
    } else {
      rows.push([null, normalizeString(rawLine), null, null]);
    }
  }

  return {
    sheetName: "Hasil Pindaian OCR",
    headers,
    rows,
  };
}
