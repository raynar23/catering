// Verification CLI script for inspecting real client and synthetic test files
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, basename, extname } from "path";
import { XlsxExtractor } from "../src/lib/import/extract/xlsx.ts";
import { DocxExtractor } from "../src/lib/import/extract/docx.ts";
import { PdfExtractor } from "../src/lib/import/extract/pdf.ts";
import { detectDocumentType } from "../src/lib/import/detect.ts";
import { parseJadwal } from "../src/lib/import/parsers/jadwal.ts";
import { parseVendor } from "../src/lib/import/parsers/vendor.ts";
import { parseBagian } from "../src/lib/import/parsers/bagian.ts";
import { parseRekapHarian } from "../src/lib/import/parsers/rekap-harian.ts";
import { calculateImportSummary } from "../src/lib/import/validate.ts";

async function main() {
  const args = process.argv.slice(2);
  let targetFile = args[0];

  // If no file path given, look into data-real/ directory
  if (!targetFile) {
    const dataRealDir = resolve(process.cwd(), "data-real");
    if (existsSync(dataRealDir)) {
      const files = readdirSync(dataRealDir).filter((f) => !f.startsWith("."));
      if (files.length > 0) {
        targetFile = resolve(dataRealDir, files[0]);
      }
    }
  }

  if (!targetFile || !existsSync(targetFile)) {
    console.log(`
Penggunaan:
  npm run import:check -- <jalur-berkas>

Contoh:
  npm run import:check -- data-real/jadwal_q4_2026.xlsx
  npm run import:check -- test-fixtures/jadwal_sintetis.xlsx
`);
    process.exit(1);
  }

  const filename = basename(targetFile);
  const ext = extname(targetFile).toLowerCase().replace(".", "");
  const buffer = readFileSync(targetFile);

  console.log("\n=======================================================");
  console.log("       VERIFIKASI BERKAS IMPOR CERDAS (CATERING TPS)");
  console.log("=======================================================\n");

  console.log(`Berkas      : ${filename}`);
  console.log(`Ukuran      : ${(buffer.length / 1024).toFixed(1)} KB`);

  // 1. Extract raw tables
  let tables = [];
  if (ext === "xlsx" || ext === "csv" || ext === "xls") {
    const extractor = new XlsxExtractor();
    tables = await extractor.extract(buffer, filename);
  } else if (ext === "docx" || ext === "doc") {
    const extractor = new DocxExtractor();
    tables = await extractor.extract(buffer, filename);
  } else if (ext === "pdf") {
    const extractor = new PdfExtractor();
    tables = await extractor.extract(buffer, filename);
  } else {
    console.error(`Format berkas '.${ext}' tidak didukung oleh ekstraktor aturan.`);
    process.exit(1);
  }

  // 2. Detect document type
  const detected = detectDocumentType(tables, { filename });
  console.log(`Format      : ${detected.format.toUpperCase()}`);
  console.log(`Jenis Dokumen: ${detected.jenis.toUpperCase()} (Keyakinan: ${(detected.keyakinan * 100).toFixed(0)}%)`);
  console.log(`Alasan Deteksi: ${detected.alasan}\n`);

  // 3. Parse rows based on document type
  let rows = [];
  if (detected.jenis === "jadwal") {
    rows = parseJadwal(tables);
  } else if (detected.jenis === "vendor") {
    rows = parseVendor(tables);
  } else if (detected.jenis === "bagian") {
    rows = parseBagian(tables);
  } else if (detected.jenis === "rekap_harian") {
    rows = parseRekapHarian(tables);
  } else {
    rows = parseJadwal(tables);
  }

  const summary = calculateImportSummary(rows);

  console.log("----------------- RINGKASAN METRIK -----------------");
  console.log(`Total Baris     : ${summary.total}`);
  console.log(`Status Cocok    : ${summary.cocok}`);
  console.log(`Status Baru     : ${summary.baru}`);
  console.log(`Perlu Dicek     : ${summary.perlu_cek}`);
  console.log(`Status Error    : ${summary.error}\n`);

  if (detected.jenis === "jadwal") {
    const dates = Array.from(new Set(rows.map((r) => r.tanggal).filter(Boolean))).sort();
    const vendors = Array.from(new Set(rows.map((r) => r.vendor_nama).filter(Boolean)));

    console.log("----------------- ANALISIS JADWAL -----------------");
    console.log(`Jumlah Hari     : ${dates.length} hari`);
    if (dates.length > 0) {
      console.log(`Rentang Tanggal : ${dates[0]} s/d ${dates[dates.length - 1]}`);
    }

    console.log(`\nVendor Unik (${vendors.length}):`);
    for (const v of vendors) {
      const rowCount = rows.filter((r) => r.vendor_nama === v).length;
      console.log(`  • "${v}" (${rowCount} shift)`);
    }

    // Benchmark criteria check (e.g. 276 rows = 92 days x 3 shifts, 5 vendors)
    console.log("\n---------------- KRITERIA PENILAIAN ---------------");
    const is276 = summary.total === 276;
    const is92Days = dates.length === 92;
    const is5Vendors = vendors.length === 5;
    const hasNoErrors = summary.error === 0;

    console.log(`Target 276 Baris (92 hari x 3 shift): ${is276 ? "[SESUAI]" : `[${summary.total} baris]`}`);
    console.log(`Target 92 Hari Tanpa Celah          : ${is92Days ? "[SESUAI]" : `[${dates.length} hari]`}`);
    console.log(`Target Tepat 5 Vendor Tanpa Spasi   : ${is5Vendors ? "[SESUAI]" : `[${vendors.length} vendor]`}`);
    console.log(`Nol Kesalahan Kritis (Error = 0)    : ${hasNoErrors ? "[SESUAI]" : `[${summary.error} error]`}`);
  }

  // 4. Print anomalies if any
  const anomalies = rows.filter((r) => r.status === "perlu_cek" || r.status === "error");
  if (anomalies.length > 0) {
    console.log(`\n---------------- DAFTAR ANOMALI (${anomalies.length}) ---------------`);
    for (let i = 0; i < Math.min(anomalies.length, 10); i++) {
      const a = anomalies[i];
      console.log(`- [${a.status.toUpperCase()}] ${a.sumber?.cell || a.sumber?.line || ""}: ${a.alasan || "Perlu verifikasi"}`);
    }
    if (anomalies.length > 10) {
      console.log(`  ... dan ${anomalies.length - 10} baris lainnya.`);
    }
  }

  console.log("\n=======================================================\n");
}

main().catch((err) => {
  console.error("Terjadi kegagalan saat memeriksa berkas:", err);
  process.exit(1);
});
