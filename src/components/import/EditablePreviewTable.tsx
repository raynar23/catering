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
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg text-center">
          <p className="text-xs text-neutral-500 uppercase font-medium">Total Baris</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{summary.total}</p>
        </div>

        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-center">
          <p className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-medium">Cocok</p>
          <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{summary.cocok}</p>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
          <p className="text-xs text-blue-700 dark:text-blue-400 uppercase font-medium">Baru</p>
          <p className="text-xl font-bold text-blue-800 dark:text-blue-300">{summary.baru}</p>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
          <p className="text-xs text-amber-700 dark:text-amber-400 uppercase font-medium">Perlu Dicek</p>
          <p className="text-xl font-bold text-amber-800 dark:text-amber-300">{summary.perlu_cek}</p>
        </div>

        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-center col-span-2 sm:col-span-1">
          <p className="text-xs text-red-700 dark:text-red-400 uppercase font-medium">Error</p>
          <p className="text-xl font-bold text-red-800 dark:text-red-300">{summary.error}</p>
        </div>
      </div>

      {/* Comparison Panel */}
      <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            Perbandingan Basis Data:
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium">
            Baru: <strong>{countBaru}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium">
            Diubah: <strong>{countDiubah}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
            Sama: <strong>{countSama}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium rounded-md transition-colors"
          >
            + Tambah Baris
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300 text-xs font-medium rounded-md transition-colors"
            >
              Hapus ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        {(["semua", "cocok", "baru", "perlu_cek", "error"] as const).map((st) => {
          const isActive = statusFilter === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {st === "semua" ? "Semua Status" : st.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* Editable Table */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-x-auto bg-white dark:bg-neutral-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-xs font-semibold uppercase text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
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
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                          row.status === "cocok"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : row.status === "baru"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                            : row.status === "perlu_cek"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
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
      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 rounded-lg space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!options.buat_vendor_baru}
            onChange={(e) => onOptionsChange({ ...options, buat_vendor_baru: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Buat vendor baru otomatis bila belum terdaftar di database
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!options.timpa_periode}
            onChange={(e) => onOptionsChange({ ...options, timpa_periode: e.target.checked })}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Timpa periode yang sudah terisi (termasuk pesanan yang bukan berstatus draft)
          </span>
        </label>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium rounded-lg transition-colors"
        >
          Unggah Ulang
        </button>

        <div className="flex items-center gap-3">
          {hasErrors && (
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              Selesaikan atau hapus seluruh baris Error sebelum melanjutkan.
            </span>
          )}

          <button
            type="button"
            onClick={onProceedToConfirmation}
            disabled={hasErrors || rows.length === 0}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Lanjut ke Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
};
