// Confirmation step panel presenting change summary, RPC execution, and success links
import React from "react";
import Link from "next/link";
import { AnalysisResult, KonfirmasiOpsi, ParsedRow } from "@/lib/import/types";

interface ConfirmationPanelProps {
  analysis: AnalysisResult;
  rows: ParsedRow[];
  options: KonfirmasiOpsi;
  onBackToPeriksa: () => void;
  onConfirm: () => Promise<void>;
  isConfirming: boolean;
  isSuccess: boolean;
  error?: string | null;
  onReset: () => void;
}

const getFriendlyFormat = (filename: string, tipe?: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || tipe?.toLowerCase() || "";
  if (ext === "xlsx" || ext === "xls") return "Berkas Excel (.xlsx)";
  if (ext === "csv") return "Berkas CSV (.csv)";
  if (ext === "pdf") return "Dokumen PDF (.pdf)";
  if (ext === "docx" || ext === "doc") return "Dokumen Word (.docx)";
  return "Berkas Dokumen";
};

const getFriendlyCategory = (type: string): string => {
  switch (type) {
    case "jadwal":
      return "Jadwal Catering";
    case "vendor":
      return "Daftar Vendor";
    case "bagian":
      return "Daftar Bagian";
    case "rekap_harian":
      return "Rekap Porsi Harian";
    default:
      return "Dokumen Catering";
  }
};

export const ConfirmationPanel: React.FC<ConfirmationPanelProps> = ({
  analysis,
  rows,
  options,
  onBackToPeriksa,
  onConfirm,
  isConfirming,
  isSuccess,
  error,
  onReset,
}) => {
  // Count actions to be committed
  const newVendorsCount = rows.filter((r) => r.status === "baru").length;
  const totalRowsCount = rows.length;

  if (isSuccess) {
    return (
      <div className="w-full p-8 bg-surface border border-border rounded-[10px] text-center space-y-6">
        {/* Success indicator using primary blue */}
        <div className="w-16 h-16 bg-primary-50 text-primary rounded-full flex items-center justify-center mx-auto text-2xl font-bold border border-primary/20">
          ✓
        </div>

        <div>
          <h2 className="text-xl font-bold text-text">
            Impor Data Berhasil Dikonfirmasi
          </h2>
          <p className="text-sm text-text-muted mt-2">
            Sebanyak <strong>{totalRowsCount}</strong> baris data dari berkas{" "}
            <strong>{analysis.namaFile}</strong> telah disimpan ke basis data.
          </p>
        </div>

        <div className="p-4 bg-bg rounded-[8px] text-xs space-y-1.5 text-left text-text-muted border border-border">
          <p>
            Kategori Data: <strong className="text-text">{getFriendlyCategory(analysis.jenisDokumen)}</strong>
          </p>
          <p>
            Format Berkas: <strong className="text-text">{getFriendlyFormat(analysis.namaFile, analysis.tipeFile)}</strong>
          </p>
          <p>
            ID Riwayat: <span className="text-text font-mono text-[11px]">{analysis.nomorBatch}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/admin/periode"
            className="px-4 py-2.5 bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-sm font-semibold rounded-[8px] transition-colors text-center"
          >
            Lihat Periode Catering
          </Link>
          <Link
            href="/admin/vendor"
            className="px-4 py-2.5 border border-border bg-surface hover:bg-bg text-text text-sm font-semibold rounded-[8px] transition-colors text-center"
          >
            Lihat Data Vendor
          </Link>
        </div>

        <div className="pt-4 border-t border-border">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-text-muted hover:text-primary font-medium transition-colors cursor-pointer"
          >
            Impor Berkas Lainnya
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="p-6 bg-surface border border-border rounded-[10px] space-y-5">
        <div>
          <h2 className="text-base font-semibold text-text">
            Konfirmasi Penyimpanan Data
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Harap periksa ringkasan perubahan di bawah ini sebelum menyimpan data ke sistem.
          </p>
        </div>

        {/* Change Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-bg border border-border rounded-[8px] space-y-1.5">
            <span className="text-xs uppercase font-semibold text-text-muted tracking-wider">
              Identitas Berkas
            </span>
            <p className="text-sm font-medium text-text truncate" title={analysis.namaFile}>
              {analysis.namaFile}
            </p>
            <p className="text-xs text-text-muted">
              {getFriendlyFormat(analysis.namaFile, analysis.tipeFile)} • Siap disimpan
            </p>
          </div>

          <div className="p-4 bg-bg border border-border rounded-[8px] space-y-1.5">
            <span className="text-xs uppercase font-semibold text-text-muted tracking-wider">
              Total Baris
            </span>
            <p className="text-xl font-bold text-text tabular-nums">
              {totalRowsCount} <span className="text-xs font-normal text-text-muted">baris valid</span>
            </p>
            <p className="text-xs text-text-muted">
              Kategori: {getFriendlyCategory(analysis.jenisDokumen)}
            </p>
          </div>
        </div>

        {/* Option Status */}
        <div className="p-4 border border-border rounded-[8px] text-xs space-y-2 text-text-muted">
          <p className="font-semibold text-text">Status Opsi Konfirmasi:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Buat vendor baru otomatis:{" "}
              <strong className="text-text">{options.buat_vendor_baru ? "Aktif" : "Nonaktif"}</strong>
              {options.buat_vendor_baru && newVendorsCount > 0 && (
                <span className="text-primary ml-1">
                  ({newVendorsCount} vendor baru akan didaftarkan)
                </span>
              )}
            </li>
            <li>
              Timpa periode yang sudah terisi:{" "}
              <strong className="text-text">{options.timpa_periode ? "Aktif" : "Nonaktif (Aman)"}</strong>
            </li>
          </ul>
        </div>

        {error && (
          <div className="p-4 bg-danger-soft border border-danger/20 text-danger rounded-[8px] text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            type="button"
            onClick={onBackToPeriksa}
            disabled={isConfirming}
            className="px-4 py-2 border border-border hover:bg-bg text-text text-sm font-medium rounded-[8px] transition-colors"
          >
            Kembali ke Periksa
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="px-6 py-2.5 bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-[8px] transition-colors flex items-center gap-2"
          >
            {isConfirming ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan ke Sistem...</span>
              </>
            ) : (
              <span>Konfirmasi dan Simpan</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
