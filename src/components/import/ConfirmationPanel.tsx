// Confirmation step panel presenting change summary, RPC execution, and success links
import React from "react";
import Link from "next/link";
import { AnalysisResult, KonfirmasiOpsi, ParsedRow } from "@/lib/import/types";

export interface ProvisionedVendorAccount {
  vendorId: string;
  nama: string;
  kode: string;
  username: string;
  email: string;
}

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
  provisionedUsers?: ProvisionedVendorAccount[];
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
  provisionedUsers,
}) => {
  // Count actions to be committed
  const newVendorsCount = rows.filter((r) => r.status === "baru").length;
  const totalRowsCount = rows.length;

  if (isSuccess) {
    return (
      <div className="w-full p-4 sm:p-6 md:p-8 bg-surface border border-border rounded-xl text-center space-y-4 sm:space-y-5">
        {/* Main single success checkmark indicator */}
        <div className="w-14 h-14 bg-primary-50 text-primary rounded-full flex items-center justify-center mx-auto text-2xl font-bold border border-primary/20">
          ✓
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-bold text-text">
            Impor Data Berhasil Dikonfirmasi
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1.5 leading-relaxed">
            Sebanyak <strong>{totalRowsCount}</strong> baris data dari berkas{" "}
            <strong className="text-text">{analysis.namaFile}</strong> telah disimpan ke basis data.
          </p>
        </div>

        {/* Compact, clean provisioned vendor accounts list */}
        {provisionedUsers && provisionedUsers.length > 0 && (
          <div className="p-3.5 sm:p-4 bg-bg rounded-lg border border-border text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text">
                {provisionedUsers.length} Akun Vendor Dibuat
              </span>
              <Link
                href="/admin/manajemen-user"
                className="text-[11px] text-primary font-medium hover:underline"
              >
                Manajemen User &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {provisionedUsers.map((u) => (
                <div
                  key={u.vendorId}
                  className="flex items-center justify-between px-3 py-2 bg-surface border border-border rounded-md text-xs"
                >
                  <span className="font-medium text-text truncate max-w-[170px]">{u.nama}</span>
                  <span className="font-mono text-[11px] text-text-muted">{u.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-3 sm:p-4 bg-bg rounded-lg text-xs space-y-1 text-left text-text-muted border border-border">
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

        {/* Compact action buttons row: prominent primary + responsive 2-col secondary */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center pt-1 sm:pt-2">
          <Link
            href="/admin/master/periode"
            className="w-full sm:w-auto px-4 py-2.5 bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors text-center shadow-xs"
          >
            Lihat Periode Catering
          </Link>
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Link
              href="/admin/master/vendor"
              className="px-3 sm:px-4 py-2.5 border border-border bg-surface hover:bg-bg text-text text-xs sm:text-sm font-semibold rounded-lg transition-colors text-center truncate"
            >
              Data Vendor
            </Link>
            <Link
              href="/admin/manajemen-user"
              className="px-3 sm:px-4 py-2.5 border border-border bg-surface hover:bg-bg text-text text-xs sm:text-sm font-semibold rounded-lg transition-colors text-center truncate"
            >
              Manajemen User
            </Link>
          </div>
        </div>

        <div className="pt-2 sm:pt-3 border-t border-border">
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
    <div className="w-full space-y-4 sm:space-y-5">
      <div className="p-4 sm:p-6 bg-surface border border-border rounded-xl space-y-4 sm:space-y-5">
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
