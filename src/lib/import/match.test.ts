import { describe, it, expect } from "vitest";
import {
  normalizeString,
  levenshteinDistance,
  stringSimilarity,
  parseFlexibleDate,
  matchVendor,
  matchShift,
  KnownVendor,
  KnownShift,
} from "./match";

describe("match and normalization utilities", () => {
  it("normalizes strings and trims irregular and multiple whitespaces", () => {
    expect(normalizeString("  Nikmat   Rasa   ")).toBe("Nikmat Rasa");
    expect(normalizeString("Adhi   Hidayah \u200B")).toBe("Adhi Hidayah");
  });

  it("calculates Levenshtein distance and similarity accurately", () => {
    expect(levenshteinDistance("Aisya", "Aisya")).toBe(0);
    expect(levenshteinDistance("Aisya", "Aisyah")).toBe(1);
    expect(stringSimilarity("Nikmat Rasa", "Nikmat Rasa")).toBe(1.0);
    expect(stringSimilarity("Nikmat Rsa", "Nikmat Rasa")).toBeGreaterThan(0.85);
  });

  it("parses diverse flexible date representations to ISO format", () => {
    expect(parseFlexibleDate("2026-10-01")).toBe("2026-10-01");
    expect(parseFlexibleDate("01/10/2026")).toBe("2026-10-01");
    expect(parseFlexibleDate("1-10-2026")).toBe("2026-10-01");
    expect(parseFlexibleDate("Kamis, 01 Oktober 2026")).toBe("2026-10-01");
    expect(parseFlexibleDate("15 Okt 2026")).toBe("2026-10-15");
    expect(parseFlexibleDate(new Date(Date.UTC(2026, 9, 21)))).toBe("2026-10-21");
    expect(parseFlexibleDate("invalid date")).toBeNull();
  });

  const mockVendors: KnownVendor[] = [
    { id: "v1", kode: "V001", nama: "Aisya Catering" },
    { id: "v2", kode: "V002", nama: "Catering IBU" },
    { id: "v3", kode: "V003", nama: "Nikmat Rasa" },
    { id: "v4", kode: "V004", nama: "Adhi Hidayah" },
    { id: "v5", kode: "V005", nama: "Nurina Catering" },
  ];

  it("matches vendors by exact name, trimmed trailing spaces, and code", () => {
    const res1 = matchVendor("Nikmat Rasa   ", mockVendors);
    expect(res1.status).toBe("cocok");
    expect(res1.vendor_id).toBe("v3");

    const res2 = matchVendor("V001", mockVendors);
    expect(res2.status).toBe("cocok");
    expect(res2.vendor_id).toBe("v1");
  });

  it("flags close typos as perlu_cek and unknown vendors as baru", () => {
    const resFuzzy = matchVendor("Nikmat Rsa", mockVendors);
    expect(resFuzzy.status).toBe("perlu_cek");
    expect(resFuzzy.vendor_id).toBe("v3");

    const resNew = matchVendor("Vendor Baru Sejahtera", mockVendors);
    expect(resNew.status).toBe("baru");
    expect(resNew.vendor_id).toBeNull();
  });

  const mockShifts: KnownShift[] = [
    { id: "s1", nama: "Shift 1", label: "Siang", alias: ["siang", "pagi"] },
    { id: "s2", nama: "Shift 2", label: "Sore", alias: ["sore"] },
    { id: "s3", nama: "Shift 3", label: "Malam", alias: ["malam"] },
  ];

  it("maps shift with letter prefix and alias correctly", () => {
    const s1 = matchShift("a. Siang", mockShifts);
    expect(s1.status).toBe("cocok");
    expect(s1.shift_nama).toBe("Shift 1");

    const s2 = matchShift("b. Sore", mockShifts);
    expect(s2.status).toBe("cocok");
    expect(s2.shift_nama).toBe("Shift 2");

    const s3 = matchShift("c. Malam", mockShifts);
    expect(s3.status).toBe("cocok");
    expect(s3.shift_nama).toBe("Shift 3");

    const direct = matchShift("Malam", mockShifts);
    expect(direct.status).toBe("cocok");
    expect(direct.shift_nama).toBe("Shift 3");
  });
});
