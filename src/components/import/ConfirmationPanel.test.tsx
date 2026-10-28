// Unit test for ConfirmationPanel friendly beginner-oriented labels
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ConfirmationPanel } from "./ConfirmationPanel";
import { AnalysisResult, ParsedRow } from "@/lib/import/types";

describe("ConfirmationPanel Component", () => {
  const dummyAnalysis: AnalysisResult = {
    nomorBatch: "IMP-20261028-4513",
    namaFile: "Jadwal Catering TPS Tahun 2026.xlsx",
    tipeFile: "xlsx",
    ukuranBytes: 15400,
    jenisDokumen: "jadwal",
    mesin: "aturan",
    keyakinan: 0.95,
    ringkasan: {
      total: 276,
      cocok: 56,
      baru: 220,
      perlu_cek: 0,
      error: 0,
    },
    rows: [],
  };

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
      sumber: { sheet: "Jadwal", cell: "B5" },
    },
  ];

  it("renders friendly file format and category without technical batch or engine jargon", () => {
    const html = renderToString(
      <ConfirmationPanel
        analysis={dummyAnalysis}
        rows={dummyRows}
        options={{ buat_vendor_baru: false, timpa_periode: false }}
        onBackToPeriksa={vi.fn()}
        onConfirm={vi.fn()}
        isConfirming={false}
        isSuccess={false}
        onReset={vi.fn()}
      />
    );

    // Friendly labels should exist
    expect(html).toMatch(/Berkas Excel \(\.xlsx\).*• Siap disimpan/);
    expect(html).toMatch(/Kategori:.*Jadwal Catering/);
    expect(html).toContain("Jadwal Catering TPS Tahun 2026.xlsx");

    // Technical jargon should NOT appear in confirmation breakdown
    expect(html).not.toContain("Batch: IMP-20261028-4513 — Mesin: ATURAN");
    expect(html).not.toContain("Mesin: ATURAN");
  });

  it("renders clear friendly labels on success screen", () => {
    const html = renderToString(
      <ConfirmationPanel
        analysis={dummyAnalysis}
        rows={dummyRows}
        options={{ buat_vendor_baru: false, timpa_periode: false }}
        onBackToPeriksa={vi.fn()}
        onConfirm={vi.fn()}
        isConfirming={false}
        isSuccess={true}
        onReset={vi.fn()}
      />
    );

    expect(html).toContain("Kategori Data:");
    expect(html).toContain("Jadwal Catering");
    expect(html).toContain("Format Berkas:");
    expect(html).toContain("Berkas Excel (.xlsx)");
    expect(html).toContain("ID Riwayat:");
    expect(html).not.toContain("Mesin Pemroses:");
  });
});
