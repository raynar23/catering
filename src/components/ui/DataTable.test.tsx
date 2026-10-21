import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { DataTable, ColumnDef } from "./DataTable";

interface MockRow {
  id: string;
  name: string;
  count: number;
}

const COLUMNS: ColumnDef<MockRow>[] = [
  { key: "name", header: "Nama Bagian" },
  { key: "count", header: "Jumlah Porsi", align: "right" },
];

const SAMPLE_DATA: MockRow[] = [
  { id: "1", name: "CC Operator", count: 20 },
  { id: "2", name: "RTG Operator", count: 18 },
  { id: "3", name: "Mekanik CC", count: 12 },
  { id: "4", name: "Mekanik RTG", count: 10 },
  { id: "5", name: "Gudang CFS", count: 20 },
  { id: "6", name: "Bengkel", count: 15 },
];

describe("DataTable", () => {
  it("renders headers and initial records correctly", () => {
    const html = renderToString(
      <DataTable
        columns={COLUMNS}
        data={SAMPLE_DATA}
        keyExtractor={(item) => item.id}
      />
    );

    expect(html).toContain("Nama Bagian");
    expect(html).toContain("Jumlah Porsi");
    expect(html).toContain("CC Operator");
    expect(html).toContain("Gudang CFS");
    expect(html).toContain("Menampilkan 1-5 dari 6 data");
  });

  it("renders empty state when data is empty", () => {
    const html = renderToString(
      <DataTable
        columns={COLUMNS}
        data={[]}
        keyExtractor={(item) => item.id}
        emptyTitle="Tidak Ada Data Karyawan"
      />
    );

    expect(html).toContain("Tidak Ada Data Karyawan");
    expect(html).toContain("Menampilkan 0-0 dari 0 data");
  });

  it("renders skeleton rows when loading", () => {
    const html = renderToString(
      <DataTable
        columns={COLUMNS}
        data={SAMPLE_DATA}
        isLoading={true}
        keyExtractor={(item) => item.id}
      />
    );

    expect(html).toContain("animate-pulse");
    expect(html).not.toContain("CC Operator");
  });
});
