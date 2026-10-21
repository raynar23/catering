// src/lib/jadwal/rotasi.test.ts
import { describe, it, expect } from 'vitest';
import {
  hitungSelisihHari,
  hitungIndeksVendorRotasi,
  getNamaVendorRotasi,
  VENDOR_ROTATION_NAMES,
} from './rotasi';

describe('Vendor Rotation Algorithm (Formula PT Terminal Petikemas Surabaya)', () => {
  it('correctly calculates day differences from base date 2026-10-01', () => {
    expect(hitungSelisihHari('2026-10-01')).toBe(0);
    expect(hitungSelisihHari('2026-10-02')).toBe(1);
    expect(hitungSelisihHari('2026-10-05')).toBe(4);
    expect(hitungSelisihHari('2026-09-30')).toBe(-1);
    expect(hitungSelisihHari(new Date(2026, 9, 1))).toBe(0);
  });

  it('assigns correct vendor rotation sequence on base date 2026-10-01', () => {
    // Siang (0): (3*0 + 0) mod 5 = 0 -> Aisya Catering
    expect(hitungIndeksVendorRotasi('2026-10-01', 0)).toBe(0);
    expect(getNamaVendorRotasi('2026-10-01', 0)).toBe('Aisya Catering');

    // Sore (1): (3*0 + 1) mod 5 = 1 -> Catering IBU
    expect(hitungIndeksVendorRotasi('2026-10-01', 1)).toBe(1);
    expect(getNamaVendorRotasi('2026-10-01', 1)).toBe('Catering IBU');

    // Malam (2): (3*0 + 2) mod 5 = 2 -> Nikmat Rasa
    expect(hitungIndeksVendorRotasi('2026-10-01', 2)).toBe(2);
    expect(getNamaVendorRotasi('2026-10-01', 2)).toBe('Nikmat Rasa');
  });

  it('assigns correct vendor rotation sequence on day 1 (2026-10-02)', () => {
    // Siang (0): (3*1 + 0) mod 5 = 3 -> Adhi Hidayah
    expect(hitungIndeksVendorRotasi('2026-10-02', 0)).toBe(3);
    expect(getNamaVendorRotasi('2026-10-02', 0)).toBe('Adhi Hidayah');

    // Sore (1): (3*1 + 1) mod 5 = 4 -> Nurina Catering
    expect(hitungIndeksVendorRotasi('2026-10-02', 1)).toBe(4);
    expect(getNamaVendorRotasi('2026-10-02', 1)).toBe('Nurina Catering');

    // Malam (2): (3*1 + 2) mod 5 = 5 mod 5 = 0 -> Aisya Catering
    expect(hitungIndeksVendorRotasi('2026-10-02', 2)).toBe(0);
    expect(getNamaVendorRotasi('2026-10-02', 2)).toBe('Aisya Catering');
  });

  it('assigns correct vendor rotation sequence on day 2 (2026-10-03)', () => {
    // Siang (0): (3*2 + 0) mod 5 = 6 mod 5 = 1 -> Catering IBU
    expect(hitungIndeksVendorRotasi('2026-10-03', 0)).toBe(1);
    expect(getNamaVendorRotasi('2026-10-03', 0)).toBe('Catering IBU');

    // Sore (1): (3*2 + 1) mod 5 = 7 mod 5 = 2 -> Nikmat Rasa
    expect(hitungIndeksVendorRotasi('2026-10-03', 1)).toBe(2);
    expect(getNamaVendorRotasi('2026-10-03', 1)).toBe('Nikmat Rasa');

    // Malam (2): (3*2 + 2) mod 5 = 8 mod 5 = 3 -> Adhi Hidayah
    expect(hitungIndeksVendorRotasi('2026-10-03', 2)).toBe(3);
    expect(getNamaVendorRotasi('2026-10-03', 2)).toBe('Adhi Hidayah');
  });

  it('handles dates prior to base date without negative index results', () => {
    // 2026-09-30 (selisih -1):
    // Siang: (3 * -1 + 0) = -3 -> mod 5 is 2 (Nikmat Rasa)
    expect(hitungIndeksVendorRotasi('2026-09-30', 0)).toBe(2);
    expect(getNamaVendorRotasi('2026-09-30', 0)).toBe('Nikmat Rasa');

    // Sore: (3 * -1 + 1) = -2 -> mod 5 is 3 (Adhi Hidayah)
    expect(hitungIndeksVendorRotasi('2026-09-30', 1)).toBe(3);
    expect(getNamaVendorRotasi('2026-09-30', 1)).toBe('Adhi Hidayah');

    // Malam: (3 * -1 + 2) = -1 -> mod 5 is 4 (Nurina Catering)
    expect(hitungIndeksVendorRotasi('2026-09-30', 2)).toBe(4);
    expect(getNamaVendorRotasi('2026-09-30', 2)).toBe('Nurina Catering');
  });

  it('contains all 5 designated vendor names', () => {
    expect(VENDOR_ROTATION_NAMES).toHaveLength(5);
    expect(VENDOR_ROTATION_NAMES).toEqual([
      'Aisya Catering',
      'Catering IBU',
      'Nikmat Rasa',
      'Adhi Hidayah',
      'Nurina Catering',
    ]);
  });
});
