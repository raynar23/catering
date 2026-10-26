// Extractor for text-based PDF documents using pdfjs-dist
import { ExtractorInterface, RawTableData } from "../types";
import { normalizeString } from "../match";

export class PdfNeedsOcrError extends Error {
  constructor(message = "PDF tidak memiliki lapisan teks, memerlukan pemindaian OCR") {
    super(message);
    this.name = "PdfNeedsOcrError";
  }
}

export class PdfExtractor implements ExtractorInterface {
  async extract(buffer: Buffer, _filename: string): Promise<RawTableData[]> {
    // Dynamic import to support various runtime environments
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const uint8 = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data: uint8,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      if (!content.items || content.items.length === 0) continue;

      // Group text items by line using Y-coordinate
      const lineMap = new Map<number, { x: number; text: string }[]>();

      for (const item of content.items as any[]) {
        if (!item.str || !item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        const x = Math.round(item.transform[4]);

        const list = lineMap.get(y) || [];
        list.push({ x, text: item.str });
        lineMap.set(y, list);
      }

      // Sort lines top-to-bottom (descending Y in PDF coordinate space)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      for (const y of sortedYs) {
        const itemsOnLine = lineMap.get(y)!;
        // Sort items left-to-right (ascending X)
        itemsOnLine.sort((a, b) => a.x - b.x);
        const lineText = itemsOnLine.map((i) => i.text).join(" ");
        const clean = normalizeString(lineText);
        if (clean) allLines.push(clean);
      }
    }

    // If PDF text layer is essentially empty, flag for OCR
    if (allLines.length === 0 || allLines.join("").length < 20) {
      throw new PdfNeedsOcrError();
    }

    // Convert extracted text lines into a table
    // If lines contain multiple columns separated by 2+ spaces or tabs
    const headers = ["Kolom 1", "Kolom 2", "Kolom 3", "Kolom 4"];
    const rows: (string | number | boolean | null)[][] = [];

    for (const line of allLines) {
      const parts = line.split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        rows.push(parts);
      } else {
        rows.push([line]);
      }
    }

    // If first row looks like a header (e.g. contains words like Tanggal, Shift, etc.)
    let actualHeaders = headers;
    let actualRows = rows;
    if (rows.length > 0 && rows[0].length > 1) {
      const firstRowStr = rows[0].join(" ").toLowerCase();
      if (
        firstRowStr.includes("tanggal") ||
        firstRowStr.includes("shift") ||
        firstRowStr.includes("vendor") ||
        firstRowStr.includes("no")
      ) {
        actualHeaders = rows[0].map((c) => String(c));
        actualRows = rows.slice(1);
      }
    }

    return [
      {
        sheetName: "PDF Lapisan Teks",
        headers: actualHeaders,
        rows: actualRows,
      },
    ];
  }
}
