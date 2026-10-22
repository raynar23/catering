// Pure validation and domain rule checker for imported rows
import { z } from "zod";
import {
  JadwalParsedRow,
  VendorParsedRow,
  BagianParsedRow,
  RekapHarianParsedRow,
  ParsedRow,
  ImportBatchSummary,
} from "./types";
import { getNamaVendorRotasi, UrutanShift } from "../jadwal/rotasi";

export const jadwalRowZodSchema = z.object({
  tanggal: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  shift_nama: z.string().trim().min(1, "Shift tidak boleh kosong"),
  shift_alias: z.string().trim().min(1, "Alias shift tidak boleh kosong"),
  vendor_nama: z.string().trim().min(1, "Nama vendor tidak boleh kosong"),
});

export const vendorRowZodSchema = z.object({
  nama: z.string().trim().min(2, "Nama vendor minimal 2 karakter"),
  kode: z.string().trim().optional(),
  kontak: z.string().trim().optional(),
  penanggung_jawab: z.string().trim().optional(),
  alamat: z.string().trim().optional(),
});

export const bagianRowZodSchema = z.object({
  nama: z.string().trim().min(2, "Nama bagian minimal 2 karakter"),
  kode: z.string().trim().min(1, "Kode bagian minimal 1 karakter"),
  kelompok: z.string().trim().min(1, "Kelompok bagian minimal 1 karakter"),
  lokasi_antar: z.string().trim().optional(),
  catatan_antar: z.string().trim().optional(),
});

export const rekapHarianRowZodSchema = z.object({
  tanggal: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  shift_nama: z.string().trim().min(1, "Shift tidak boleh kosong"),
  vendor_nama: z.string().trim().min(1, "Nama vendor tidak boleh kosong"),
  total_porsi: z.number().int().min(0, "Total porsi tidak boleh negatif"),
});

/**
 * Calculates summary metrics from parsed rows
 */
export function calculateImportSummary(rows: ParsedRow[]): ImportBatchSummary {
  const summary: ImportBatchSummary = {
    total: rows.length,
    cocok: 0,
    baru: 0,
    perlu_cek: 0,
    error: 0,
  };

  for (const row of rows) {
    if (row.status === "cocok") summary.cocok += 1;
    else if (row.status === "baru") summary.baru += 1;
    else if (row.status === "perlu_cek") summary.perlu_cek += 1;
    else if (row.status === "error") summary.error += 1;
  }

  return summary;
}

/**
 * Helper to convert shift alias to rotation index
 */
export function getUrutanShiftFromAlias(alias: string): UrutanShift | null {
  const norm = alias.toLowerCase().trim();
  if (norm === "siang" || norm === "shift 1" || norm === "1") return 0;
  if (norm === "sore" || norm === "shift 2" || norm === "2") return 1;
  if (norm === "malam" || norm === "shift 3" || norm === "3") return 2;
  return null;
}

/**
 * Validates domain rules on parsed jadwal rows
 */
export function validateJadwalRows(rows: JadwalParsedRow[]): JadwalParsedRow[] {
  const result: JadwalParsedRow[] = rows.map((r) => ({ ...r }));

  // 1. Check basic format using Zod
  for (const row of result) {
    const parsed = jadwalRowZodSchema.safeParse(row);
    if (!parsed.success) {
      row.status = "error";
      row.alasan = parsed.error.issues.map((i) => i.message).join(", ");
    }
  }

  // 2. Group by date to check shift completeness and duplicates
  const dateMap = new Map<string, number[]>();
  for (let i = 0; i < result.length; i++) {
    const row = result[i];
    if (row.status === "error") continue;

    const list = dateMap.get(row.tanggal) || [];
    list.push(i);
    dateMap.set(row.tanggal, list);
  }

  for (const [date, indices] of dateMap.entries()) {
    // Check duplicate shifts within the same date
    const shiftAliasesSeen = new Map<string, number>();
    for (const idx of indices) {
      const alias = result[idx].shift_alias.toLowerCase();
      if (shiftAliasesSeen.has(alias)) {
        result[idx].status = "error";
        result[idx].alasan = `Duplikat shift '${alias}' pada tanggal ${date}`;
      } else {
        shiftAliasesSeen.set(alias, idx);
      }
    }

    // Check count of shifts for the date
    if (indices.length < 3) {
      for (const idx of indices) {
        if (result[idx].status !== "error") {
          result[idx].status = "perlu_cek";
          result[idx].alasan =
            (result[idx].alasan ? result[idx].alasan + "; " : "") +
            `Shift tidak lengkap untuk tanggal ${date} (${indices.length} dari 3 shift)`;
        }
      }
    }
  }

  // 3. Chronological continuity check (detect date gaps)
  const uniqueDates = Array.from(dateMap.keys()).sort();
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const curr = new Date(uniqueDates[i] + "T00:00:00Z");
    const next = new Date(uniqueDates[i + 1] + "T00:00:00Z");
    const diffDays = Math.round(
      (next.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > 1) {
      const rowIndices = dateMap.get(uniqueDates[i]) || [];
      for (const idx of rowIndices) {
        if (result[idx].status !== "error") {
          result[idx].status = "perlu_cek";
          result[idx].alasan =
            (result[idx].alasan ? result[idx].alasan + "; " : "") +
            `Celah tanggal terdeteksi setelah ${uniqueDates[i]} (${diffDays - 1} hari terlewat)`;
        }
      }
    }
  }

  // 4. Vendor rotation check (warning perlu_cek, not an error)
  for (const row of result) {
    if (row.status === "error" || row.status === "baru") continue;

    const urutan = getUrutanShiftFromAlias(row.shift_alias);
    if (urutan !== null && row.tanggal) {
      try {
        const expectedVendor = getNamaVendorRotasi(row.tanggal, urutan);
        const actualVendor = row.vendor_nama.trim().toLowerCase();
        const expectedLower = expectedVendor.toLowerCase();

        if (actualVendor !== expectedLower) {
          row.status = "perlu_cek";
          row.alasan =
            (row.alasan ? row.alasan + "; " : "") +
            `Peringatan rotasi: sistem menghitung '${expectedVendor}', dokumen berisi '${row.vendor_nama}'`;
        }
      } catch {
        // Ignore rotation calculation failure on invalid dates
      }
    }
  }

  return result;
}
