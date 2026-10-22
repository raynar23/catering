// Optional AI fallback parser using Google Gemini SDK behind IMPORT_AI_ENABLED flag
import { GoogleGenAI } from "@google/genai";
import { JadwalParsedRow, RawTableData } from "../types";
import { validateJadwalRows } from "../validate";

export function isAiFallbackEnabled(): boolean {
  return process.env.IMPORT_AI_ENABLED === "true" && !!process.env.GEMINI_API_KEY;
}

export async function parseWithGeminiFallback(
  tables: RawTableData[],
  filename: string
): Promise<JadwalParsedRow[]> {
  if (!isAiFallbackEnabled()) {
    throw new Error(
      "AI Fallback tidak diaktifkan pada konfigurasi server (IMPORT_AI_ENABLED=false)."
    );
  }

  const apiKey = process.env.GEMINI_API_KEY!;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const ai = new GoogleGenAI({ apiKey });

  // Convert raw table lines to plain text representation
  const textChunks = tables.flatMap((t) => [
    `Sheet: ${t.sheetName || "Sheet1"}`,
    `Headers: ${t.headers.join(" | ")}`,
    ...t.rows.slice(0, 100).map((r) => r.join(" | ")),
  ]);

  const prompt = `Anda adalah sistem parser data jadwal catering. Ekstrak data tabel berikut menjadi array JSON objek jadwal catering.
Setiap objek harus memiliki kolom:
- tanggal (format YYYY-MM-DD)
- shift_nama ("Shift 1", "Shift 2", atau "Shift 3")
- shift_alias ("siang", "sore", atau "malam")
- vendor_nama (nama vendor catering)

Data dokumen:
${textChunks.join("\n")}`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const responseText = response.text || "[]";
  let extracted: any[] = [];

  try {
    extracted = JSON.parse(responseText);
    if (!Array.isArray(extracted)) {
      extracted = [extracted];
    }
  } catch {
    throw new Error("Gagal mengurai respons terstruktur dari layanan AI.");
  }

  const rows: JadwalParsedRow[] = extracted.map((item, idx) => ({
    id: `ai-${idx + 1}`,
    tanggal: String(item.tanggal || ""),
    shift_id: null,
    shift_nama: String(item.shift_nama || "Shift 1"),
    shift_alias: String(item.shift_alias || "siang").toLowerCase(),
    vendor_id: null,
    vendor_nama: String(item.vendor_nama || ""),
    vendor_kode: null,
    status: "perlu_cek",
    alasan: "Dihasilkan melalui AI Fallback (Gemini) - wajib verifikasi visual",
    sumber: { sheet: filename, line: idx + 1 },
  }));

  return validateJadwalRows(rows);
}
