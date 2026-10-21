// src/lib/jadwal/rotasi.ts
// Pure helper implementing the PT Terminal Petikemas Surabaya vendor rotation algorithm

export const BASE_DATE_ROTASI = '2026-10-01';

export const VENDOR_ROTATION_NAMES = [
  'Aisya Catering',
  'Catering IBU',
  'Nikmat Rasa',
  'Adhi Hidayah',
  'Nurina Catering',
] as const;

export type UrutanShift = 0 | 1 | 2; // 0 = Siang, 1 = Sore, 2 = Malam

/**
 * Calculates calendar day difference from base date 2026-10-01 (Asia/Jakarta)
 */
export function hitungSelisihHari(tanggal: Date | string): number {
  let targetYear: number;
  let targetMonth: number;
  let targetDay: number;

  if (typeof tanggal === 'string') {
    const parts = tanggal.split('T')[0].split('-');
    targetYear = parseInt(parts[0], 10);
    targetMonth = parseInt(parts[1], 10) - 1;
    targetDay = parseInt(parts[2], 10);
  } else {
    targetYear = tanggal.getFullYear();
    targetMonth = tanggal.getMonth();
    targetDay = tanggal.getDate();
  }

  const targetUtc = Date.UTC(targetYear, targetMonth, targetDay);
  const baseUtc = Date.UTC(2026, 9, 1); // 2026-10-01 (Month index 9 is October)

  const diffMs = targetUtc - baseUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Computes vendor index (0..4) using the patent rotation formula:
 * index = ((3 * selisihHari + urutanShift) mod 5 + 5) mod 5
 */
export function hitungIndeksVendorRotasi(
  tanggal: Date | string,
  urutanShift: UrutanShift
): number {
  if (urutanShift < 0 || urutanShift > 2) {
    throw new Error('urutanShift harus bernilai 0 (Siang), 1 (Sore), atau 2 (Malam)');
  }
  const selisihHari = hitungSelisihHari(tanggal);
  const raw = 3 * selisihHari + urutanShift;
  return ((raw % 5) + 5) % 5;
}

/**
 * Returns the assigned vendor name from rotation for a given date and shift
 */
export function getNamaVendorRotasi(
  tanggal: Date | string,
  urutanShift: UrutanShift
): string {
  const index = hitungIndeksVendorRotasi(tanggal, urutanShift);
  return VENDOR_ROTATION_NAMES[index];
}
