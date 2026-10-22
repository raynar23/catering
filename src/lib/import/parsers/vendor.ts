// Parser for vendor master data tables
import { RawTableData, VendorParsedRow } from "../types";
import { KnownVendor, normalizeString } from "../match";
import { vendorRowZodSchema } from "../validate";

export interface ParseVendorOptions {
  knownVendors?: KnownVendor[];
}

interface ColumnMap {
  nama: number;
  kode: number;
  kontak: number;
  penanggung_jawab: number;
  alamat: number;
}

function mapVendorHeaders(headers: string[]): ColumnMap {
  const map: ColumnMap = {
    nama: -1,
    kode: -1,
    kontak: -1,
    penanggung_jawab: -1,
    alamat: -1,
  };

  for (let i = 0; i < headers.length; i++) {
    const h = normalizeString(headers[i]).toLowerCase();

    // Check Penanggung Jawab first before generic kontak/wa to prevent matching 'ja-wa-b'
    if (
      h.includes("penanggung jawab") ||
      h.includes("pic") ||
      h.includes("contact person") ||
      /\bpj\b/i.test(h)
    ) {
      if (map.penanggung_jawab === -1) map.penanggung_jawab = i;
    } else if (
      h.includes("nama") ||
      h.includes("vendor") ||
      h.includes("catering") ||
      h.includes("perusahaan")
    ) {
      if (map.nama === -1) map.nama = i;
    } else if (h.includes("kode") || h.includes("code") || /\bkd\b/i.test(h)) {
      if (map.kode === -1) map.kode = i;
    } else if (
      h.includes("kontak") ||
      h.includes("whatsapp") ||
      h.includes("telepon") ||
      h.includes("telp") ||
      h.includes("phone") ||
      /\b(wa|hp)\b/i.test(h)
    ) {
      if (map.kontak === -1) map.kontak = i;
    } else if (h.includes("alamat") || h.includes("domisili") || h.includes("lokasi")) {
      if (map.alamat === -1) map.alamat = i;
    }
  }

  // Fallbacks if not recognized
  if (map.nama === -1) map.nama = 0;
  if (map.kode === -1 && headers.length > 1) map.kode = 1;
  if (map.kontak === -1 && headers.length > 2) map.kontak = 2;

  return map;
}

export function parseVendor(
  tables: RawTableData[],
  options: ParseVendorOptions = {}
): VendorParsedRow[] {
  const known = options.knownVendors || [];
  const rows: VendorParsedRow[] = [];
  let seq = 1;

  for (const table of tables) {
    const sheetName = table.sheetName || "Sheet1";
    const colMap = mapVendorHeaders(table.headers);

    for (let r = 0; r < table.rows.length; r++) {
      const rawRow = table.rows[r];
      if (!rawRow || rawRow.length === 0) continue;

      const rawNama = normalizeString(String(rawRow[colMap.nama] ?? ""));
      const rawKode = colMap.kode !== -1 ? normalizeString(String(rawRow[colMap.kode] ?? "")) : "";
      const rawKontak = colMap.kontak !== -1 ? normalizeString(String(rawRow[colMap.kontak] ?? "")) : undefined;
      const rawPj = colMap.penanggung_jawab !== -1 ? normalizeString(String(rawRow[colMap.penanggung_jawab] ?? "")) : undefined;
      const rawAlamat = colMap.alamat !== -1 ? normalizeString(String(rawRow[colMap.alamat] ?? "")) : undefined;

      if (!rawNama && !rawKode) continue;

      const generatedKode = rawKode || `V${String(seq + known.length).padStart(3, "0")}`;

      const rowCandidate: VendorParsedRow = {
        id: `vendor-${seq++}`,
        nama: rawNama,
        kode: generatedKode,
        kontak: rawKontak,
        penanggung_jawab: rawPj,
        alamat: rawAlamat,
        status: "cocok",
        sumber: {
          sheet: sheetName,
          cell: `R${r + 2}`,
          line: r + 2,
        },
      };

      // Zod validation
      const val = vendorRowZodSchema.safeParse(rowCandidate);
      if (!val.success) {
        rowCandidate.status = "error";
        rowCandidate.alasan = val.error.issues.map((i) => i.message).join(", ");
        rows.push(rowCandidate);
        continue;
      }

      // Check against known vendors
      const existing = known.find(
        (k) =>
          normalizeString(k.nama).toLowerCase() === rawNama.toLowerCase() ||
          (rawKode && normalizeString(k.kode).toLowerCase() === rawKode.toLowerCase())
      );

      if (existing) {
        rowCandidate.status = "cocok";
        rowCandidate.alasan = `Vendor sudah terdaftar (${existing.kode})`;
      } else {
        rowCandidate.status = "baru";
        rowCandidate.alasan = "Vendor baru akan ditambahkan";
      }

      rows.push(rowCandidate);
    }
  }

  return rows;
}
