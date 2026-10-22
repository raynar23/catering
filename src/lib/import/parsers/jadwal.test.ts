// Unit tests for jadwal table parser
import { describe, it, expect } from "vitest";
import { parseJadwal } from "./jadwal";
import { RawTableData } from "../types";
import { getNamaVendorRotasi } from "../../jadwal/rotasi";

describe("parsers/jadwal.ts", () => {
  it("parses schedule table with merged date cells, shift letter prefixes, and trailing spaces", () => {
    // 3 days x 3 shifts = 9 rows
    const mockTable: RawTableData = {
      sheetName: "Jadwal Catering",
      headers: ["No", "Hari/Tanggal", "Waktu Shift", "Nama Vendor"],
      rows: [
        // Day 1: 2026-10-01 (date only in first row, simulates merged cell)
        [1, "2026-10-01", "a. Siang", "Aisya Catering "],
        ["", null, "b. Sore", "Catering IBU"],
        ["", null, "c. Malam", "Nikmat Rasa  "],

        // Day 2: 2026-10-02 (date formatted in Indonesian text)
        [2, "02 Oktober 2026", "a. Siang", "Adhi Hidayah   "],
        ["", null, "b. Sore", "Nurina Catering"],
        ["", null, "c. Malam", "Aisya Catering"],

        // Day 3: 2026-10-03 (Date object)
        [3, new Date("2026-10-03T00:00:00Z"), "Shift 1", "Catering IBU"],
        ["", null, "Shift 2", "Nikmat Rasa"],
        ["", null, "Shift 3", "Adhi Hidayah"],
      ],
    };

    const results = parseJadwal([mockTable]);

    expect(results.length).toBe(9);

    // Day 1 Shift 1
    expect(results[0].tanggal).toBe("2026-10-01");
    expect(results[0].shift_alias).toBe("siang");
    expect(results[0].vendor_nama).toBe("Aisya Catering");
    expect(results[0].status).toBe("cocok");

    // Day 1 Shift 2 (inherited date from merged master)
    expect(results[1].tanggal).toBe("2026-10-01");
    expect(results[1].shift_alias).toBe("sore");
    expect(results[1].vendor_nama).toBe("Catering IBU");
    expect(results[1].status).toBe("cocok");

    // Day 1 Shift 3 (trimmed whitespace "Nikmat Rasa  ")
    expect(results[2].tanggal).toBe("2026-10-01");
    expect(results[2].shift_alias).toBe("malam");
    expect(results[2].vendor_nama).toBe("Nikmat Rasa");
    expect(results[2].status).toBe("cocok");

    // Day 2 Date text parsing
    expect(results[3].tanggal).toBe("2026-10-02");
    expect(results[3].vendor_nama).toBe("Adhi Hidayah");

    // Day 3 Date object parsing
    expect(results[6].tanggal).toBe("2026-10-03");
  });

  it("accurately parses a 10-day synthetic schedule with rotation conformity", () => {
    const rows: (string | number | boolean | null)[][] = [];

    for (let day = 1; day <= 10; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateIso = `2026-10-${dayStr}`;

      const vSiang = getNamaVendorRotasi(dateIso, 0);
      const vSore = getNamaVendorRotasi(dateIso, 1);
      const vMalam = getNamaVendorRotasi(dateIso, 2);

      rows.push([day, dateIso, "a. Siang", `  ${vSiang}  `]);
      rows.push(["", "", "b. Sore", ` ${vSore} `]);
      rows.push(["", "", "c. Malam", `${vMalam}`]);
    }

    const table: RawTableData = {
      sheetName: "Oktober 2026",
      headers: ["No.", "Tanggal", "Shift", "Vendor"],
      rows,
    };

    const parsed = parseJadwal([table]);

    // 10 days * 3 shifts = 30 rows
    expect(parsed.length).toBe(30);

    // All should be cocok because vendors follow patent rotation exactly
    const nonCocok = parsed.filter((r) => r.status !== "cocok");
    expect(nonCocok.length).toBe(0);

    // Verify 5 unique vendors
    const uniqueVendors = Array.from(new Set(parsed.map((r) => r.vendor_nama)));
    expect(uniqueVendors.length).toBe(5);
    expect(uniqueVendors).toEqual(
      expect.arrayContaining([
        "Aisya Catering",
        "Catering IBU",
        "Nikmat Rasa",
        "Adhi Hidayah",
        "Nurina Catering",
      ])
    );
  });

  it("flags unknown vendors as baru and fuzzy match as perlu_cek", () => {
    const table: RawTableData = {
      sheetName: "Jadwal",
      headers: ["Tanggal", "Shift", "Vendor"],
      rows: [
        ["2026-10-01", "a. Siang", "Aisya Catering"],
        ["2026-10-01", "b. Sore", "Catering Barokah Solo"], // Unknown
        ["2026-10-01", "c. Malam", "Nikmat Rassa"], // Typo fuzzy
      ],
    };

    const parsed = parseJadwal([table]);
    expect(parsed[1].status).toBe("baru");
    expect(parsed[1].is_new_vendor).toBe(true);

    expect(parsed[2].status).toBe("perlu_cek");
    expect(parsed[2].alasan).toContain("Kemiripan");
  });
});
