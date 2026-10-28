// Document type and confidence detection based on structure, headers, and keyword frequencies
import { DetectionResult, DocumentType, RawTableData } from "./types";
import { normalizeString } from "./match";

export interface DetectOptions {
  filename?: string;
  forceType?: DocumentType;
}

const EXT_FORMAT_MAP: Record<string, DetectionResult["format"]> = {
  xlsx: "xlsx",
  xls: "xlsx",
  csv: "csv",
  docx: "docx",
  doc: "docx",
  pdf: "pdf",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
};

/**
 * Determines file format from extension
 */
export function detectFormatFromFilename(filename: string): DetectionResult["format"] {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return EXT_FORMAT_MAP[ext] || "xlsx";
}

/**
 * Detects document type and confidence score from extracted tables and filename
 */
export function detectDocumentType(
  tables: RawTableData[],
  options: DetectOptions = {}
): DetectionResult {
  const filename = options.filename || "";
  const format = detectFormatFromFilename(filename);

  // If user forcefully specified the document type (except 'otomatis')
  if (options.forceType && options.forceType !== "otomatis") {
    return {
      jenis: options.forceType,
      keyakinan: 1.0,
      alasan: `Dipaksa oleh pengguna sebagai '${options.forceType}'`,
      format,
    };
  }

  // Combine headers and sample rows to evaluate keyword signals
  const allHeaders: string[] = [];
  const sampleValues: string[] = [];

  for (const table of tables) {
    for (const h of table.headers) {
      const clean = normalizeString(h).toLowerCase();
      if (clean) allHeaders.push(clean);
    }
    // Inspect up to 15 rows
    const limit = Math.min(table.rows.length, 15);
    for (let r = 0; r < limit; r++) {
      for (const cell of table.rows[r]) {
        const clean = normalizeString(String(cell ?? "")).toLowerCase();
        if (clean) sampleValues.push(clean);
      }
    }
  }

  const combinedText = [...allHeaders, ...sampleValues].join(" ");

  // 1. Evaluate Rekap Harian signals
  // Look for 1-15, 16-31, porsi, rekapitulasi, or multiple shift subcolumns
  let rekapScore = 0;
  if (combinedText.includes("rekapitulasi") || combinedText.includes("rekap harian")) rekapScore += 0.5;
  if (combinedText.includes("porsi") || combinedText.includes("jatah makan")) rekapScore += 0.3;
  if (allHeaders.some((h) => h.includes("shift 3") || h.includes("shift 1") || h.includes("shift 2"))) rekapScore += 0.3;
  if (filename.toLowerCase().includes("rekap") || filename.toLowerCase().includes("update")) rekapScore += 0.3;

  // 2. Evaluate Jadwal signals
  // Look for tanggal + shift + vendor
  let jadwalScore = 0;
  const hasTanggal = allHeaders.some((h) => h.includes("tanggal") || h.includes("tgl") || h.includes("hari") || h.includes("date"));
  const hasShift = allHeaders.some((h) => h.includes("shift") || h.includes("waktu"));
  const hasVendor = allHeaders.some((h) => h.includes("vendor") || h.includes("catering") || h.includes("penyedia"));

  if (hasTanggal) jadwalScore += 0.35;
  if (hasShift) jadwalScore += 0.35;
  if (hasVendor) jadwalScore += 0.3;

  // Check sample rows for shift names or letters like "a. siang"
  const sampleHasShifts = sampleValues.some((v) => /siang|sore|malam|shift/i.test(v));
  const sampleHasDates = sampleValues.some((v) => /^\d{4}-\d{2}-\d{2}/.test(v) || /(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)/i.test(v));
  if (sampleHasShifts) {
    jadwalScore += 0.25;
  }
  if (sampleHasDates && sampleHasShifts) {
    jadwalScore += 0.4;
  }
  if (filename.toLowerCase().includes("jadwal")) jadwalScore += 0.25;

  // 3. Evaluate Vendor signals
  let vendorScore = 0;
  const hasKontak = allHeaders.some((h) => h.includes("kontak") || h.includes("telp") || h.includes("wa") || h.includes("phone"));
  const hasAlamat = allHeaders.some((h) => h.includes("alamat") || h.includes("lokasi"));
  const hasPIC = allHeaders.some((h) => h.includes("penanggung jawab") || h.includes("pic"));
  if (hasVendor && (hasKontak || hasAlamat || hasPIC)) vendorScore += 0.6;
  if (hasKontak) vendorScore += 0.2;
  if (hasAlamat) vendorScore += 0.2;
  if (filename.toLowerCase().includes("vendor")) vendorScore += 0.3;

  // Suppress vendor score if row content is clearly schedule data
  if (sampleHasDates && sampleHasShifts) {
    vendorScore = Math.min(vendorScore, 0.2);
  }

  // 4. Evaluate Bagian signals
  let bagianScore = 0;
  const hasDivisi = allHeaders.some((h) => h.includes("bagian") || h.includes("divisi") || h.includes("departemen") || h.includes("unit"));
  const hasKelompok = allHeaders.some((h) => h.includes("kelompok") || h.includes("group"));
  const hasLokasiAntar = allHeaders.some((h) => h.includes("lokasi antar") || h.includes("titik serah"));
  if (hasDivisi) bagianScore += 0.4;
  if (hasKelompok) bagianScore += 0.3;
  if (hasLokasiAntar) bagianScore += 0.3;
  if (filename.toLowerCase().includes("bagian") || filename.toLowerCase().includes("departemen")) bagianScore += 0.3;

  // Select highest score
  const scores: { jenis: DocumentType; score: number; alasan: string }[] = [
    {
      jenis: "jadwal",
      score: Math.min(jadwalScore, 1.0),
      alasan: "Ditemukan kolom tanggal, shift, dan nama vendor catering",
    },
    {
      jenis: "rekap_harian",
      score: Math.min(rekapScore, 1.0),
      alasan: "Ditemukan struktur rekapitulasi porsi per shift dan bagian",
    },
    {
      jenis: "vendor",
      score: Math.min(vendorScore, 1.0),
      alasan: "Ditemukan kolom data vendor, kontak, dan alamat",
    },
    {
      jenis: "bagian",
      score: Math.min(bagianScore, 1.0),
      alasan: "Ditemukan kolom nama bagian, kelompok kerja, atau lokasi antar",
    },
  ];

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  if (best.score >= 0.4) {
    return {
      jenis: best.jenis,
      keyakinan: Number(best.score.toFixed(2)),
      alasan: best.alasan,
      format,
    };
  }

  // Ambiguous fallback
  return {
    jenis: "jadwal",
    keyakinan: 0.3,
    alasan: "Struktur tidak sepenuhnya cocok, diasumsikan sebagai jadwal standar",
    format,
  };
}
