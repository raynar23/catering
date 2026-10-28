// Unit test for EditablePreviewTable confirmation buttons and behavior
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { EditablePreviewTable } from "./EditablePreviewTable";
import { ParsedRow } from "@/lib/import/types";

describe("EditablePreviewTable Component", () => {
  const dummyRows: ParsedRow[] = [
    {
      id: "row-1",
      tanggal: "2026-10-16",
      shift_id: null,
      shift_nama: "Shift 1",
      shift_alias: "siang",
      vendor_id: "vendor-1",
      vendor_nama: "Aisya Catering",
      vendor_kode: "AISYA",
      status: "cocok",
      alasan: "-",
      sumber: { sheet: "Jadwal", cell: "B5" },
    },
    {
      id: "row-2",
      tanggal: "2026-10-16",
      shift_id: null,
      shift_nama: "Shift 2",
      shift_alias: "sore",
      vendor_id: null,
      vendor_nama: "Catering IBU",
      vendor_kode: null,
      status: "baru",
      alasan: "Vendor baru (belum terdaftar di database)",
      sumber: { sheet: "Jadwal", cell: "C5" },
    },
  ];

  it("renders both top and bottom confirmation buttons with correct labels and enabled state", () => {
    const html = renderToString(
      <EditablePreviewTable
        rows={dummyRows}
        onRowsChange={vi.fn()}
        documentType="jadwal"
        options={{ buat_vendor_baru: false, timpa_periode: false }}
        onOptionsChange={vi.fn()}
        onProceedToConfirmation={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(html).toContain('id="btn-lanjut-konfirmasi-top"');
    expect(html).toContain('id="btn-lanjut-konfirmasi-bottom"');
    expect(html).toContain("Lanjut ke Konfirmasi");
    expect(html).not.toContain("→");
  });

  it("disables both confirmation buttons when rows contain errors", () => {
    const errorRows: ParsedRow[] = [
      ...dummyRows,
      {
        id: "row-err",
        tanggal: "invalid-date",
        shift_id: null,
        shift_nama: "Shift 3",
        shift_alias: "malam",
        vendor_id: null,
        vendor_nama: "",
        vendor_kode: null,
        status: "error",
        alasan: "Format tanggal tidak valid",
        sumber: { sheet: "Jadwal", cell: "D5" },
      },
    ];

    const html = renderToString(
      <EditablePreviewTable
        rows={errorRows}
        onRowsChange={vi.fn()}
        documentType="jadwal"
        options={{ buat_vendor_baru: false, timpa_periode: false }}
        onOptionsChange={vi.fn()}
        onProceedToConfirmation={vi.fn()}
        onReset={vi.fn()}
      />
    );

    // Both buttons should be disabled
    expect(html).toContain('id="btn-lanjut-konfirmasi-top" disabled=""');
    expect(html).toContain('id="btn-lanjut-konfirmasi-bottom" disabled=""');
    expect(html).toMatch(/Terdapat.*1.*baris Error/);
  });
});
