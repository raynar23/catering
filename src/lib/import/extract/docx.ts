// Extractor for DOCX documents using mammoth
import mammoth from "mammoth";
import { ExtractorInterface, RawTableData } from "../types";
import { normalizeString } from "../match";

export class DocxExtractor implements ExtractorInterface {
  async extract(buffer: Buffer, _filename: string): Promise<RawTableData[]> {
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;

    const tables: RawTableData[] = [];

    // Simple HTML table parser without external DOM dependencies
    const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) || [];

    for (let t = 0; t < tableMatches.length; t++) {
      const tableHtml = tableMatches[t];
      const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];

      if (rowMatches.length === 0) continue;

      const headers: string[] = [];
      const rows: (string | number | boolean | null)[][] = [];

      for (let r = 0; r < rowMatches.length; r++) {
        const rowHtml = rowMatches[r];
        // Match td or th cells
        const cellMatches = rowHtml.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
        const cells: string[] = [];

        for (const cellHtml of cellMatches) {
          // Strip inner HTML tags
          const text = cellHtml
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .trim();
          cells.push(normalizeString(text));
        }

        if (r === 0) {
          headers.push(...cells);
        } else {
          rows.push(cells);
        }
      }

      if (headers.length > 0) {
        tables.push({
          sheetName: `Tabel-${t + 1}`,
          headers,
          rows,
        });
      }
    }

    // Fallback: If no HTML table was found, extract paragraphs
    if (tables.length === 0) {
      const pMatches = html.match(/<p[\s\S]*?<\/p>/gi) || [];
      const lines: string[] = [];

      for (const pHtml of pMatches) {
        const text = pHtml.replace(/<[^>]+>/g, " ").trim();
        const clean = normalizeString(text);
        if (clean) lines.push(clean);
      }

      if (lines.length > 0) {
        // Treat as a single column list
        tables.push({
          sheetName: "Paragraf",
          headers: ["Teks"],
          rows: lines.map((l) => [l]),
        });
      }
    }

    return tables;
  }
}
