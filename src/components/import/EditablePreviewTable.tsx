// Editable preview table for parsed import rows with pagination and bounded layout
import React, { useState, useMemo } from "react";
import { DocumentType, JadwalParsedRow, KonfirmasiOpsi, ParsedRow, RekapHarianParsedRow, RowStatus } from "@/lib/import/types";
import { calculateImportSummary } from "@/lib/import/validate";
import { formatNumber } from "@/lib/format";

// Map database codes and known seed UUIDs to concise section names
export const BAGIAN_DISPLAY_MAP: Record<string, string> = {
  CC_OP: "CC Ops",
  RTG_OP: "RTG Ops",
  MEK_CC: "Mek CC",
  MEK_RTG: "Mek RTG",
  CFS: "CFS",
  "fb7b4be2-a185-4d88-b4a0-7d1ba42b9415": "CC Ops",
  "29a5a1af-33c2-4735-878f-a19fcce2381c": "RTG Ops",
  "68b877da-2687-47cf-83bf-54eb51625fb5": "Mek CC",
  "13539827-a6eb-bf9a-b748e7c2e7f1": "Mek RTG",
  "cda2caab-744a-42aa-b408-c9067e421c47": "CFS",
};

// Normalize raw department portion keys into human-friendly badges
function getNormalizedBagianItems(items: Record<string, number> | undefined): [string, number][] {
  if (!items || Object.keys(items).length === 0) return [];
  const map = new Map<string, number>();
  for (const [key, val] of Object.entries(items)) {
    const cleanLabel = BAGIAN_DISPLAY_MAP[key] || (key.length > 15 ? key.slice(0, 8) : key);
    map.set(cleanLabel, (map.get(cleanLabel) || 0) + val);
  }
  return Array.from(map.entries());
}

interface EditablePreviewTableProps {
  rows: ParsedRow[];
  onRowsChange: (newRows: ParsedRow[]) => void;
  documentType: DocumentType;
  options: KonfirmasiOpsi;
  onOptionsChange: (newOptions: KonfirmasiOpsi) => void;
  onProceedToConfirmation: () => void;
  onReset: () => void;
}

export const EditablePreviewTable: React.FC<EditablePreviewTableProps> = ({
  rows,
  onRowsChange,
  documentType,
  options,
  onOptionsChange,
  onProceedToConfirmation,
  onReset,
}) => {
  const isRekap = documentType === "rekap_harian" || rows.some((r) => "total_porsi" in r || "items" in r);
  const [statusFilter, setStatusFilter] = useState<RowStatus | "semua">("semua");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number | "semua">(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const summary = calculateImportSummary(rows);
  const hasErrors = summary.error > 0;

  // Filter rows by status
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter === "semua") return true;
      return r.status === statusFilter;
    });
  }, [rows, statusFilter]);

  // Paginated rows slice
  const totalFiltered = filteredRows.length;
  const effectivePageSize = pageSize === "semua" ? Math.max(totalFiltered, 1) : pageSize;
  const totalPages = Math.ceil(totalFiltered / effectivePageSize) || 1;
  const validPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedRows = useMemo(() => {
    if (pageSize === "semua") return filteredRows;
    const startIdx = (validPage - 1) * pageSize;
    return filteredRows.slice(startIdx, startIdx + pageSize);
  }, [filteredRows, validPage, pageSize]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedRows.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Cell editing
  const handleUpdateRowField = (id: string, field: string, value: string) => {
    const nextRows = rows.map((r) => {
      if (r.id !== id) return r;

      const updated = { ...r, [field]: value } as any;

      if (field === "tanggal") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          updated.status = "error";
          updated.alasan = "Format tanggal harus YYYY-MM-DD";
        } else {
          updated.status = "perlu_cek";
          updated.alasan = "Diedit manual oleh pengguna";
        }
      } else if (field === "vendor_nama") {
        if (!value.trim()) {
          updated.status = "error";
          updated.alasan = "Nama vendor tidak boleh kosong";
        } else {
          updated.status = "perlu_cek";
          updated.alasan = "Diedit manual oleh pengguna";
        }
      } else if (field === "shift_nama") {
        updated.shift_nama = value;
        updated.shift_alias = value === "Shift 1" ? "siang" : value === "Shift 2" ? "sore" : "malam";
      }

      return updated;
    });

    onRowsChange(nextRows);
  };

  // Add new empty row
  const handleAddRow = () => {
    const newId = `manual-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    if (isRekap) {
      const newRow: RekapHarianParsedRow = {
        id: newId,
        tanggal: today,
        shift_id: null,
        shift_nama: "Shift 1",
        vendor_id: null,
        vendor_nama: "Aisya Catering",
        items: {},
        total_porsi: 0,
        status: "perlu_cek",
        alasan: "Baris ditambahkan manual oleh pengguna",
        sumber: { sheet: "Manual", cell: "Manual" },
      };
      onRowsChange([newRow, ...rows]);
      return;
    }

    const newRow: JadwalParsedRow = {
      id: newId,
      tanggal: today,
      shift_id: null,
      shift_nama: "Shift 1",
      shift_alias: "siang",
      vendor_id: null,
      vendor_nama: "Aisya Catering",
      vendor_kode: null,
      status: "perlu_cek",
      alasan: "Baris ditambahkan manual oleh pengguna",
      sumber: { sheet: "Manual", cell: "Manual" },
    };

    onRowsChange([newRow, ...rows]);
  };

  // Delete handlers
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const nextRows = rows.filter((r) => !selectedIds.has(r.id));
    onRowsChange(nextRows);
    setSelectedIds(new Set());
  };

  const handleDeleteRow = (id: string) => {
    const nextRows = rows.filter((r) => r.id !== id);
    onRowsChange(nextRows);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Metric KPI Cards in a single responsive row */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3 shrink-0 select-none">
        {/* Total Baris */}
        <div className="p-2 sm:p-3 bg-surface border border-border rounded-[10px] flex flex-col justify-between">
          <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate">
            Total
          </p>
          <p className="text-base sm:text-2xl font-bold text-text tabular-nums tracking-tight my-0.5 sm:my-1 leading-none">
            {summary.total}
          </p>
          <p className="hidden sm:block text-[10px] sm:text-[11px] text-text-muted truncate font-normal">
            {isRekap ? "Periode rekap" : "Baris jadwal"}
          </p>
        </div>

        {/* Cocok */}
        <div className="p-2 sm:p-3 bg-surface border border-border rounded-[10px] flex flex-col justify-between">
          <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate">
            Cocok
          </p>
          <p className="text-base sm:text-2xl font-bold text-primary tabular-nums tracking-tight my-0.5 sm:my-1 leading-none">
            {summary.cocok}
          </p>
          <p className="hidden sm:block text-[10px] sm:text-[11px] text-text-muted truncate font-normal">
            Ada di database
          </p>
        </div>

        {/* Baru */}
        <div className="p-2 sm:p-3 bg-surface border border-border rounded-[10px] flex flex-col justify-between">
          <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate">
            Baru
          </p>
          <p className="text-base sm:text-2xl font-bold text-text tabular-nums tracking-tight my-0.5 sm:my-1 leading-none">
            {summary.baru}
          </p>
          <p className="hidden sm:block text-[10px] sm:text-[11px] text-text-muted truncate font-normal">
            Vendor baru
          </p>
        </div>

        {/* Perlu Dicek */}
        <div className="p-2 sm:p-3 bg-surface border border-border rounded-[10px] flex flex-col justify-between">
          <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate">
            Perlu Cek
          </p>
          <p className="text-base sm:text-2xl font-bold text-text tabular-nums tracking-tight my-0.5 sm:my-1 leading-none">
            {summary.perlu_cek}
          </p>
          <p className="hidden sm:block text-[10px] sm:text-[11px] text-text-muted truncate font-normal">
            Verifikasi manual
          </p>
        </div>

        {/* Error */}
        <div className="p-2 sm:p-3 bg-surface border border-border rounded-[10px] flex flex-col justify-between">
          <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wider text-text-muted truncate">
            Error
          </p>
          <p className={`text-base sm:text-2xl font-bold tabular-nums tracking-tight my-0.5 sm:my-1 leading-none ${
            summary.error > 0 ? "text-danger" : "text-text"
          }`}>
            {summary.error}
          </p>
          <p className="hidden sm:block text-[10px] sm:text-[11px] text-text-muted truncate font-normal">
            {summary.error > 0 ? "Perlu perbaikan" : "Semua valid"}
          </p>
        </div>
      </div>

      {/* Comparison Toolbar & Actions */}
      <div className="p-2 sm:p-3 bg-surface border border-border rounded-[10px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs flex-nowrap shrink-0 overflow-x-auto">
          <span className="font-semibold text-text-muted uppercase tracking-wider text-[9px] sm:text-[11px] mr-0.5 shrink-0 whitespace-nowrap">
            Status DB:
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-[5px] bg-bg text-text font-medium border border-border shrink-0 whitespace-nowrap">
            Baru: <strong className="text-text tabular-nums">{summary.baru}</strong>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-[5px] bg-bg text-text font-medium border border-border shrink-0 whitespace-nowrap">
            Diubah: <strong className="text-text tabular-nums">{summary.perlu_cek}</strong>
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-[5px] bg-bg text-text font-medium border border-border shrink-0 whitespace-nowrap">
            Sama: <strong className="text-text tabular-nums">{summary.cocok}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex-1 sm:flex-none px-2.5 py-1 sm:px-3 sm:py-1.5 border border-primary/30 bg-surface hover:bg-primary-50 text-primary text-[11px] sm:text-xs font-semibold rounded-[6px] transition-colors cursor-pointer text-center"
          >
            + Tambah Baris
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-danger hover:bg-danger/90 text-white text-[11px] sm:text-xs font-semibold rounded-[6px] transition-colors cursor-pointer"
            >
              Hapus ({selectedIds.size})
            </button>
          )}
          <button
            type="button"
            id="btn-lanjut-konfirmasi-top"
            onClick={onProceedToConfirmation}
            disabled={hasErrors || rows.length === 0}
            title={hasErrors ? "Selesaikan seluruh baris error sebelum melanjutkan" : "Lanjut ke langkah konfirmasi"}
            className="flex-1 sm:flex-none px-3 py-1 sm:px-3.5 sm:py-1.5 bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] sm:text-xs font-semibold rounded-[6px] transition-colors shadow-xs cursor-pointer text-center"
          >
            Lanjut ke Konfirmasi
          </button>
        </div>
      </div>

      {/* Status Filter Tabs & Page Size Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border gap-2 shrink-0">
        <div className="flex">
          {(["semua", "cocok", "baru", "perlu_cek", "error"] as const).map((st) => {
            const isActive = statusFilter === st;
            const count =
              st === "semua"
                ? summary.total
                : st === "cocok"
                ? summary.cocok
                : st === "baru"
                ? summary.baru
                : st === "perlu_cek"
                ? summary.perlu_cek
                : summary.error;

            return (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                <span>{st === "semua" ? "Semua" : st.replace("_", " ")}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-primary-100 text-primary-900" : "bg-bg text-text-muted"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted pb-1 sm:pb-0">
          <span>Tampilkan:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const val = e.target.value === "semua" ? "semua" : Number(e.target.value);
              setPageSize(val);
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-surface text-text border border-border rounded text-xs focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value={25}>25 baris</option>
            <option value={50}>50 baris</option>
            <option value={100}>100 baris</option>
            <option value="semua">Semua ({totalFiltered})</option>
          </select>
        </div>
      </div>

      {/* Scrollable Table Container */}
      <div className="border border-border rounded-lg overflow-hidden bg-surface shadow-xs flex flex-col">
        <div className="overflow-y-auto overflow-x-auto max-h-[500px] min-h-[220px]">
          <table className={`w-full text-left text-xs border-collapse ${isRekap ? "min-w-[820px]" : "min-w-[680px]"} lg:min-w-full`}>
            <thead className="sticky top-0 z-10 bg-bg text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-text-muted border-b border-border shadow-xs">
              {isRekap ? (
                <tr>
                  <th className="p-2 sm:p-2.5 w-8 sm:w-10 text-center bg-bg whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={paginatedRows.length > 0 && selectedIds.size >= paginatedRows.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 w-28 sm:w-32 bg-bg whitespace-nowrap">Tanggal</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 w-28 sm:w-36 bg-bg whitespace-nowrap">Shift</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 bg-bg min-w-[130px] sm:min-w-[150px] whitespace-nowrap">Vendor Catering</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 w-24 sm:w-28 text-right bg-bg whitespace-nowrap">Total Porsi</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 bg-bg min-w-[190px] sm:min-w-[240px] whitespace-nowrap">Rincian Bagian</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 w-22 sm:w-28 bg-bg whitespace-nowrap">Status</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 bg-bg min-w-[110px] whitespace-nowrap">Alasan / Catatan</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 w-12 sm:w-14 text-center bg-bg whitespace-nowrap">Aksi</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-2 sm:p-2.5 w-8 sm:w-10 text-center bg-bg whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={paginatedRows.length > 0 && selectedIds.size >= paginatedRows.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 w-32 sm:w-36 bg-bg whitespace-nowrap">Tanggal</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 w-32 sm:w-40 bg-bg whitespace-nowrap">Shift</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 bg-bg min-w-[140px] whitespace-nowrap">Vendor Catering</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 w-22 sm:w-28 bg-bg whitespace-nowrap">Status</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 bg-bg min-w-[120px] whitespace-nowrap">Alasan / Catatan</th>
                  <th className="px-2 py-2 sm:px-3 sm:py-2.5 w-12 sm:w-14 text-center bg-bg whitespace-nowrap">Aksi</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={isRekap ? 9 : 7} className="p-8 text-center text-text-muted">
                    Tidak ada baris dengan filter status ini.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isPerluCek = row.status === "perlu_cek";
                  const isError = row.status === "error";

                  if (isRekap) {
                    const rRow = row as RekapHarianParsedRow;
                    const shiftVal =
                      rRow.shift_nama === "Shift 2"
                        ? "Shift 2"
                        : rRow.shift_nama === "Shift 3"
                        ? "Shift 3"
                        : "Shift 1";

                    const normalizedItems = getNormalizedBagianItems(rRow.items);

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          isError
                            ? "bg-rose-50/50"
                            : isPerluCek
                            ? "bg-amber-50/40"
                            : "hover:bg-bg/60"
                        }`}
                      >
                        <td className="p-1.5 sm:p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => handleToggleSelect(row.id)}
                            className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>
                        <td className="p-1.5 sm:p-2.5">
                          <input
                            type="date"
                            value={rRow.tanggal || ""}
                            onChange={(e) => handleUpdateRowField(row.id, "tanggal", e.target.value)}
                            className="w-[115px] sm:w-[125px] px-2 py-1 bg-surface text-text border border-border rounded text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono tabular-nums"
                          />
                        </td>
                        <td className="p-1.5 sm:p-2.5">
                          <select
                            value={shiftVal}
                            onChange={(e) => handleUpdateRowField(row.id, "shift_nama", e.target.value)}
                            className="w-[110px] sm:w-[125px] px-2 py-1 bg-surface text-text border border-border rounded text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                          >
                            <option value="Shift 1">Shift 1 (Siang)</option>
                            <option value="Shift 2">Shift 2 (Sore)</option>
                            <option value="Shift 3">Shift 3 (Malam)</option>
                          </select>
                        </td>
                        <td className="p-1.5 sm:p-2.5">
                          <input
                            type="text"
                            value={rRow.vendor_nama || ""}
                            onChange={(e) => handleUpdateRowField(row.id, "vendor_nama", e.target.value)}
                            className="w-full px-2 py-1 bg-surface text-text border border-border rounded text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                        </td>
                        <td className="p-1.5 sm:p-2.5 text-right whitespace-nowrap">
                          <span className="font-bold text-[11px] sm:text-xs text-text tabular-nums bg-bg px-2 py-0.5 rounded border border-border inline-block">
                            {formatNumber(rRow.total_porsi)} porsi
                          </span>
                        </td>
                        <td className="p-1.5 sm:p-2.5">
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {normalizedItems.length === 0 ? (
                              <span className="text-text-muted text-[11px]">-</span>
                            ) : (
                              normalizedItems.map(([label, val]) => (
                                <span
                                  key={label}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-bg text-text border border-border/80 whitespace-nowrap"
                                >
                                  <span className="text-text-muted font-normal">{label}:</span>
                                  <strong className="text-text tabular-nums">{val}</strong>
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-1.5 sm:p-2.5 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[10px] sm:text-[11px] font-bold tracking-tight capitalize ${
                              row.status === "cocok"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : row.status === "baru"
                                ? "bg-blue-50 text-blue-800 border-blue-300"
                                : row.status === "perlu_cek"
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : "bg-rose-50 text-rose-800 border-rose-300"
                            }`}
                          >
                            {row.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-1.5 sm:p-2.5 text-[11px] sm:text-xs text-text-muted">
                          {row.alasan || "-"}
                        </td>
                        <td className="p-1.5 sm:p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="text-text-muted hover:text-danger text-xs font-bold p-1 rounded transition-colors"
                            title="Hapus Baris"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  const jRow = row as JadwalParsedRow;

                  const shiftVal =
                    jRow.shift_nama === "Shift 2" || jRow.shift_alias === "sore"
                      ? "Shift 2"
                      : jRow.shift_nama === "Shift 3" || jRow.shift_alias === "malam"
                      ? "Shift 3"
                      : "Shift 1";

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isError
                          ? "bg-rose-50/50"
                          : isPerluCek
                          ? "bg-amber-50/40"
                          : "hover:bg-bg/60"
                      }`}
                    >
                      <td className="p-1.5 sm:p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => handleToggleSelect(row.id)}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>

                      {/* Editable Date */}
                      <td className="p-1.5 sm:p-2.5">
                        <input
                          type="date"
                          value={jRow.tanggal || ""}
                          onChange={(e) => handleUpdateRowField(row.id, "tanggal", e.target.value)}
                          className="w-[115px] sm:w-[125px] px-2 py-1 bg-surface text-text border border-border rounded text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono tabular-nums"
                        />
                      </td>

                      {/* Editable Shift */}
                      <td className="p-1.5 sm:p-2.5">
                        <select
                          value={shiftVal}
                          onChange={(e) => handleUpdateRowField(row.id, "shift_nama", e.target.value)}
                          className="w-[110px] sm:w-[125px] px-2 py-1 bg-surface text-text border border-border rounded text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                        >
                          <option value="Shift 1">Shift 1 (Siang)</option>
                          <option value="Shift 2">Shift 2 (Sore)</option>
                          <option value="Shift 3">Shift 3 (Malam)</option>
                        </select>
                      </td>

                      {/* Editable Vendor */}
                      <td className="p-1.5 sm:p-2.5">
                        <input
                          type="text"
                          value={jRow.vendor_nama || ""}
                          onChange={(e) => handleUpdateRowField(row.id, "vendor_nama", e.target.value)}
                          className="w-full px-2 py-1 bg-surface text-text border border-border rounded text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </td>

                      {/* Status Badge */}
                      <td className="p-1.5 sm:p-2.5 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[10px] sm:text-[11px] font-bold tracking-tight capitalize ${
                            row.status === "cocok"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : row.status === "baru"
                              ? "bg-blue-50 text-blue-800 border-blue-300"
                              : row.status === "perlu_cek"
                              ? "bg-amber-50 text-amber-900 border-amber-300"
                              : "bg-rose-50 text-rose-800 border-rose-300"
                          }`}
                        >
                          {row.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Reason / Notes */}
                      <td className="p-1.5 sm:p-2.5 text-[11px] sm:text-xs text-text-muted">
                        {row.alasan || "-"}
                      </td>

                      {/* Action */}
                      <td className="p-1.5 sm:p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          className="text-text-muted hover:text-danger text-xs font-bold p-1 rounded transition-colors"
                          title="Hapus Baris"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-2 sm:p-2.5 bg-bg/60 border-t border-border flex items-center justify-between text-[10px] sm:text-xs text-text-muted gap-1.5 sm:gap-2 flex-nowrap shrink-0">
          <span className="truncate whitespace-nowrap">
            <span className="hidden sm:inline">Menampilkan </span>
            <strong>
              {totalFiltered === 0
                ? 0
                : pageSize === "semua"
                ? `1-${totalFiltered}`
                : `${(validPage - 1) * pageSize + 1}-${Math.min(
                    validPage * pageSize,
                    totalFiltered
                  )}`}
            </strong>{" "}
            dari <strong>{totalFiltered}</strong> baris
          </span>

          {pageSize !== "semua" && totalPages > 1 && (
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={validPage <= 1}
                className="h-6.5 sm:h-7 px-1.5 sm:px-2.5 border border-border bg-surface hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed text-text rounded text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap"
              >
                ‹ Sebelumnya
              </button>

              <span className="px-1.5 py-0.5 font-semibold text-text tabular-nums text-[9px] sm:text-xs bg-surface border border-border rounded whitespace-nowrap">
                {validPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={validPage >= totalPages}
                className="h-6.5 sm:h-7 px-1.5 sm:px-2.5 border border-border bg-surface hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed text-text rounded text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap"
              >
                Selanjutnya ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Options Checkboxes */}
      <div className="p-3 bg-bg border border-border rounded-lg space-y-2 shrink-0">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!options.buat_vendor_baru}
            onChange={(e) => onOptionsChange({ ...options, buat_vendor_baru: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <span className="text-xs font-medium text-text">
            Buat vendor baru otomatis bila belum terdaftar di database
          </span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!options.timpa_periode}
            onChange={(e) => onOptionsChange({ ...options, timpa_periode: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <span className="text-xs font-medium text-text">
            Timpa periode yang sudah terisi (termasuk pesanan yang bukan berstatus draft)
          </span>
        </label>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-2 border-t border-border shrink-0">
        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-4 py-2 border border-border hover:bg-bg text-text text-sm font-medium rounded-lg transition-colors cursor-pointer text-center"
        >
          Unggah Ulang
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {hasErrors && (
            <span className="text-xs text-danger font-semibold bg-danger-soft border border-danger/30 px-3 py-1.5 rounded-md text-center">
              Terdapat {summary.error} baris Error. Selesaikan atau hapus seluruh baris Error sebelum melanjutkan.
            </span>
          )}

          <button
            type="button"
            id="btn-lanjut-konfirmasi-bottom"
            onClick={onProceedToConfirmation}
            disabled={hasErrors || rows.length === 0}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-xs cursor-pointer text-center"
          >
            Lanjut ke Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
};
