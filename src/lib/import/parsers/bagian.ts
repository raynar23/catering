// Parser for department master data tables (bagian)
import { BagianParsedRow, RawTableData } from "../types";
import { KnownBagian, normalizeString } from "../match";
import { bagianRowZodSchema } from "../validate";

export interface ParseBagianOptions {
  knownBagian?: KnownBagian[];
}

interface ColumnMap {
  nama: number;
  kode: number;
  kelompok: number;
  lokasi_antar: number;
  catatan_antar: number;
  urutan: number;
}

function mapBagianHeaders(headers: string[]): ColumnMap {
  const map: ColumnMap = {
    nama: -1,
    kode: -1,
    kelompok: -1,
    lokasi_antar: -1,
    catatan_antar: -1,
    urutan: -1,
  };

  for (let i = 0; i < headers.length; i++) {
    const h = normalizeString(headers[i]).toLowerCase();
    if (h.includes("nama") || h.includes("bagian") || h.includes("divisi") || h.includes("seksi")) {
      if (map.nama === -1) map.nama = i;
    } else if (h.includes("kode") || h.includes("code") || h.includes("kd")) {
      if (map.kode === -1) map.kode = i;
    } else if (h.includes("kelompok") || h.includes("group") || h.includes("kategori")) {
      if (map.kelompok === -1) map.kelompok = i;
    } else if (h.includes("lokasi") || h.includes("titik serah") || h.includes("antar")) {
      if (map.lokasi_antar === -1) map.lokasi_antar = i;
    } else if (h.includes("catatan") || h.includes("keterangan")) {
      if (map.catatan_antar === -1) map.catatan_antar = i;
    } else if (h.includes("urutan") || h.includes("no")) {
      if (map.urutan === -1) map.urutan = i;
    }
  }

  // Fallbacks if not recognized
  if (map.nama === -1) map.nama = 0;
  if (map.kode === -1 && headers.length > 1) map.kode = 1;
  if (map.kelompok === -1 && headers.length > 2) map.kelompok = 2;

  return map;
}

export function parseBagian(
  tables: RawTableData[],
  options: ParseBagianOptions = {}
): BagianParsedRow[] {
  const known = options.knownBagian || [];
  const rows: BagianParsedRow[] = [];
  let seq = 1;

  for (const table of tables) {
    const sheetName = table.sheetName || "Sheet1";
    const colMap = mapBagianHeaders(table.headers);

    for (let r = 0; r < table.rows.length; r++) {
      const rawRow = table.rows[r];
      if (!rawRow || rawRow.length === 0) continue;

      const rawNama = normalizeString(String(rawRow[colMap.nama] ?? ""));
      const rawKode = colMap.kode !== -1 ? normalizeString(String(rawRow[colMap.kode] ?? "")) : "";
      const rawKelompok = colMap.kelompok !== -1 ? normalizeString(String(rawRow[colMap.kelompok] ?? "")) : "Operasional";
      const rawLokasi = colMap.lokasi_antar !== -1 ? normalizeString(String(rawRow[colMap.lokasi_antar] ?? "")) : undefined;
      const rawCatatan = colMap.catatan_antar !== -1 ? normalizeString(String(rawRow[colMap.catatan_antar] ?? "")) : undefined;

      let rawUrutan: number | undefined = undefined;
      if (colMap.urutan !== -1) {
        const num = parseInt(String(rawRow[colMap.urutan] ?? ""), 10);
        if (!isNaN(num)) rawUrutan = num;
      }

      if (!rawNama && !rawKode) continue;

      const generatedKode =
        rawKode ||
        rawNama
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "_")
          .slice(0, 10);

      const rowCandidate: BagianParsedRow = {
        id: `bagian-${seq++}`,
        nama: rawNama,
        kode: generatedKode,
        kelompok: rawKelompok || "Operasional",
        lokasi_antar: rawLokasi,
        catatan_antar: rawCatatan,
        urutan: rawUrutan ?? seq,
        status: "cocok",
        sumber: {
          sheet: sheetName,
          cell: `R${r + 2}`,
          line: r + 2,
        },
      };

      // Zod validation
      const val = bagianRowZodSchema.safeParse(rowCandidate);
      if (!val.success) {
        rowCandidate.status = "error";
        rowCandidate.alasan = val.error.issues.map((i) => i.message).join(", ");
        rows.push(rowCandidate);
        continue;
      }

      // Check against known bagian
      const existing = known.find(
        (k) =>
          normalizeString(k.nama).toLowerCase() === rawNama.toLowerCase() ||
          (rawKode && normalizeString(k.kode).toLowerCase() === rawKode.toLowerCase())
      );

      if (existing) {
        rowCandidate.status = "cocok";
        rowCandidate.alasan = `Bagian sudah terdaftar (${existing.kode})`;
      } else {
        rowCandidate.status = "baru";
        rowCandidate.alasan = "Bagian baru akan ditambahkan";
      }

      rows.push(rowCandidate);
    }
  }

  return rows;
}
