// Unit tests for rekap-harian matrix parser
import { describe, it, expect } from "vitest";
import { parseRekapHarian } from "./rekap-harian";
import { RawTableData } from "../types";

describe("parsers/rekap-harian.ts", () => {
  it("parses shift 3, 1, 2 subcolumns and maps department rows with trailing annotations", () => {
    const table: RawTableData = {
      sheetName: "Oktober 2026",
      headers: ["Bagian", "1", "1", "1"],
      rows: [
        // Date row
        ["Tanggal", "1", "1", "1"],
        // Shift row (ordered 3, 1, 2)
        ["Shift", "Shift 3", "Shift 1", "Shift 2"],
        // Department rows
        ["CC Operator (Mengikuti update jadwal manning)", "10", "15", "-"],
        ["RTG Operator", "8", "12", "14"],
        ["Mekanik CC", "4", "5", "0"],
      ],
    };

    const results = parseRekapHarian([table], { year: 2026, month: 10 });

    expect(results.length).toBe(3);

    // Shift 3 row
    const shift3 = results.find((r) => r.shift_nama === "Shift 3");
    expect(shift3).toBeDefined();
    expect(shift3?.tanggal).toBe("2026-10-01");
    expect(shift3?.items["CC_OP"]).toBe(10);
    expect(shift3?.items["RTG_OP"]).toBe(8);
    expect(shift3?.items["MEK_CC"]).toBe(4);
    expect(shift3?.total_porsi).toBe(22);

    // Shift 2 row with '-' parsed as 0
    const shift2 = results.find((r) => r.shift_nama === "Shift 2");
    expect(shift2).toBeDefined();
    expect(shift2?.items["CC_OP"]).toBe(0);
    expect(shift2?.items["RTG_OP"]).toBe(14);
  });
});
