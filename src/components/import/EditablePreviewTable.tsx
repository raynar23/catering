// Editable preview table for parsed import rows with status filters, add/delete, and options
import React, { useState } from "react";
import { DocumentType, JadwalParsedRow, KonfirmasiOpsi, ParsedRow, RowStatus } from "@/lib/import/types";
import { calculateImportSummary } from "@/lib/import/validate";

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
  const [statusFilter, setStatusFilter] = useState<RowStatus | "semua">("semua");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const summary = calculateImportSummary(rows);
  const hasErrors = summary.error > 0;

  // Filter rows based on statusFilter
  const filteredRows = rows.filter((r) => {
    if (statusFilter === "semua") return true;
    return r.status === statusFilter;
  });

  // Calculate comparison counts against database
  const countBaru = summary.baru;
  const countSama = summary.cocok;
  const countDiubah = summary.perlu_cek;

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredRows.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Cell editing
  const handleUpdateRowField = (id: string, field: string, value: string) => {
    const nextRows = rows.map((r) => {
      if (r.id !== id) return r;

      const updated = { ...r, [field]: value } as any;

      // Realtime lightweight re-validation for manual edit
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
        updated.shift_alias = value.toLowerCase().replace(/shift\s*/i, "").trim();
      }

      return updated;
    });

    onRowsChange(nextRows);
  };

  // Add new empty row
  const handleAddRow = () => {
    const newId = `manual-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

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

  // Delete selected rows
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const nextRows = rows.filter((r) => !selectedIds.has(r.id));
    onRowsChange(nextRows);
    setSelectedIds(new Set());
  };

  // Delete single row
  const handleDeleteRow = (id: string) => {
    const nextRows = rows.filter((r) => r.id !== id);
    onRowsChange(nextRows);
  };

  return (
    <div className="space-y-5">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-bg border border-border rounded-[8px] text-center">
          <p className="text-xs text-text-muted uppercase font-medium">Total Baris</p>
          <p className="text-xl font-bold text-text tabular-nums">{summary.total}</p>
        </div>

        <div className="p-3 bg-[#EBF7EE] border border-[#C8E9D0] rounded-[8px] text-center">
          <p className="text-xs text-success uppercase font-medium">Cocok</p>
          <p className="text-xl font-bold text-success tabular-nums">{summary.cocok}</p>
        </div>

        <div className="p-3 bg-primary-50 border border-primary/20 rounded-[8px] text-center">
          <p className="text-xs text-primary uppercase font-medium">Baru</p>
          <p className="text-xl font-bold text-primary tabular-nums">{summary.baru}</p>
        </div>

        <div className="p-3 bg-[#FFF8E6] border border-[#FFE2A4] rounded-[8px] text-center">
          <p className="text-xs text-warning uppercase font-medium">Perlu Dicek</p>
          <p className="text-xl font-bold text-warning tabular-nums">{summary.perlu_cek}</p>
        </div>

        <div className="p-3 bg-danger-soft border border-danger/20 rounded-[8px] text-center col-span-2 sm:col-span-1">
          <p className="text-xs text-danger uppercase font-medium">Error</p>
          <p className="text-xl font-bold text-danger tabular-nums">{summary.error}</p>
        </div>
      </div>

      {/* Comparison Panel */}
      <div className="p-4 bg-surface border border-border rounded-[8px] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-text-muted uppercase tracking-wider">
            Perbandingan Basis Data:
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-primary-50 text-primary font-medium border border-primary/20">
            Baru: <strong>{countBaru}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#FFF8E6] text-warning font-medium border border-[#FFE2A4]">
            Diubah: <strong>{countDiubah}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-bg text-text-muted font-medium border border-border">
            Sama: <strong>{countSama}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3 py-1.5 border border-primary/30 bg-primary-50 hover:bg-primary/10 text-primary text-xs font-medium rounded-[6px] transition-colors"
          >
            + Tambah Baris
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 bg-danger-soft hover:bg-danger/10 text-danger border border-danger/20 text-xs font-medium rounded-[6px] transition-colors"
            >
              Hapus ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex border-b border-border">
        {(["semua", "cocok", "baru", "perlu_cek", "error"] as const).map((st) => {
          const isActive = statusFilter === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {st === "semua" ? "Semua Status" : st.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* Editable Table */}
      <div className="border border-border rounded-[8px] overflow-x-auto bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-xs font-semibold uppercase text-text-muted border-b border-border">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="p-3">Tanggal</th>
              <th className="p-3">Shift</th>
              <th className="p-3">Vendor</th>
              <th className="p-3">Status</th>
              <th className="p-3">Alasan / Catatan</th>
              <th className="p-3 w-16 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-neutral-400">
                  Tidak ada baris dengan filter status ini.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const jRow = row as JadwalParsedRow;
                const isPerluCek = row.status === "perlu_cek";
                const isError = row.status === "error";

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      isError
                        ? "bg-red-50/70 dark:bg-red-950/20"
                        : isPerluCek
                        ? "bg-amber-50/70 dark:bg-amber-950/20"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => handleToggleSelect(row.id)}
                        className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Editable Tanggal */}
                    <td className="p-3">
                      <input
                        type="date"
                        value={jRow.tanggal || ""}
                        onChange={(e) => handleUpdateRowField(row.id, "tanggal", e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Editable Shift */}
                    <td className="p-3">
                      <select
                        value={jRow.shift_nama || "Shift 1"}
                        onChange={(e) => handleUpdateRowField(row.id, "shift_nama", e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Shift 1">Shift 1 (Siang)</option>
                        <option value="Shift 2">Shift 2 (Sore)</option>
                        <option value="Shift 3">Shift 3 (Malam)</option>
                      </select>
                    </td>

                    {/* Editable Vendor */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={jRow.vendor_nama || ""}
                        onChange={(e) => handleUpdateRowField(row.id, "vendor_nama", e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Status Badge */}
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-[5px] border text-[11px] font-medium tracking-tight capitalize ${
                          row.status === "cocok"
                            ? "bg-[#34C759]/10 text-[#1B7F39] border-[#34C759]/25"
                            : row.status === "baru"
                            ? "bg-[#007AFF]/10 text-[#0066CC] border-[#007AFF]/25"
                            : row.status === "perlu_cek"
                            ? "bg-[#FF9500]/10 text-[#B25E00] border-[#FF9500]/25"
                            : "bg-[#FF3B30]/10 text-[#D70015] border-[#FF3B30]/25"
                        }`}
                      >
                        {row.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Alasan / Catatan */}
                    <td className="p-3 text-xs text-neutral-600 dark:text-neutral-400">
                      {row.alasan || "-"}
                    </td>

                    {/* Action */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-neutral-400 hover:text-red-600 text-xs font-bold"
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

      {/* Options checkboxes */}
      <div className="p-4 bg-bg border border-border rounded-[8px] space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!options.buat_vendor_baru}
            onChange={(e) => onOptionsChange({ ...options, buat_vendor_baru: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-text">
            Buat vendor baru otomatis bila belum terdaftar di database
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!options.timpa_periode}
            onChange={(e) => onOptionsChange({ ...options, timpa_periode: e.target.checked })}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-text">
            Timpa periode yang sudah terisi (termasuk pesanan yang bukan berstatus draft)
          </span>
        </label>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 border border-border hover:bg-bg text-text text-sm font-medium rounded-[8px] transition-colors"
        >
          Unggah Ulang
        </button>

        <div className="flex items-center gap-3">
          {hasErrors && (
            <span className="text-xs text-danger font-medium">
              Selesaikan atau hapus seluruh baris Error sebelum melanjutkan.
            </span>
          )}

          <button
            type="button"
            onClick={onProceedToConfirmation}
            disabled={hasErrors || rows.length === 0}
            className="px-5 py-2 bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-[8px] transition-colors"
          >
            Lanjut ke Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
};
