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

  it("sorts rows ascending and descending by column key", () => {
    const htmlAsc = renderToString(
      <DataTable
        columns={COLUMNS}
        data={SAMPLE_DATA}
        defaultSortKey="name"
        defaultSortOrder="asc"
        keyExtractor={(item) => item.id}
      />
    );
    // In asc alphabetical order, Bengkel comes before CC Operator
    const bengkelIdxAsc = htmlAsc.indexOf("Bengkel");
    const ccIdxAsc = htmlAsc.indexOf("CC Operator");
    expect(bengkelIdxAsc).toBeGreaterThan(-1);
    expect(ccIdxAsc).toBeGreaterThan(-1);
    expect(bengkelIdxAsc).toBeLessThan(ccIdxAsc);

    const htmlDesc = renderToString(
      <DataTable
        columns={COLUMNS}
        data={SAMPLE_DATA}
        defaultSortKey="name"
        defaultSortOrder="desc"
        keyExtractor={(item) => item.id}
      />
    );
    // In desc alphabetical order, RTG Operator comes first before Mekanik CC
    const rtgIdxDesc = htmlDesc.indexOf("RTG Operator");
    const mekanikIdxDesc = htmlDesc.indexOf("Mekanik CC");
    expect(rtgIdxDesc).toBeGreaterThan(-1);
    expect(mekanikIdxDesc).toBeGreaterThan(-1);
    expect(rtgIdxDesc).toBeLessThan(mekanikIdxDesc);
  });
});
