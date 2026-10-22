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
      <div className="max-w-xl mx-auto p-8 bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>

        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Impor Data Berhasil Dikonfirmasi
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Sebanyak <strong>{totalRowsCount}</strong> baris data dari berkas{" "}
            <strong>{analysis.namaFile}</strong> telah disimpan ke basis data.
          </p>
        </div>

        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg text-xs space-y-1 text-left text-neutral-600 dark:text-neutral-400">
          <p>
            Nomor Batch: <strong>{analysis.nomorBatch}</strong>
          </p>
          <p>
            Jenis Dokumen: <strong>{analysis.jenisDokumen.toUpperCase()}</strong>
          </p>
          <p>
            Mesin Pemroses: <strong>{analysis.mesin.toUpperCase()}</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/admin/periode"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors text-center"
          >
            Lihat Periode Catering
          </Link>
          <Link
            href="/admin/vendor"
            className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-sm font-semibold rounded-lg transition-colors text-center"
          >
            Lihat Data Vendor
          </Link>
        </div>

        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 font-medium"
          >
            Impor Berkas Lainnya
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Konfirmasi Penyimpanan Data
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Harap periksa ringkasan perubahan di bawah ini sebelum menyimpan data ke sistem.
          </p>
        </div>

        {/* Change Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg space-y-2">
            <span className="text-xs uppercase font-semibold text-neutral-500 tracking-wider">
              Identitas Berkas
            </span>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {analysis.namaFile}
            </p>
            <p className="text-xs text-neutral-500">
              Batch: {analysis.nomorBatch} • Mesin: {analysis.mesin.toUpperCase()}
            </p>
          </div>

          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg space-y-2">
            <span className="text-xs uppercase font-semibold text-neutral-500 tracking-wider">
              Total Baris
            </span>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {totalRowsCount} <span className="text-xs font-normal text-neutral-500">baris</span>
            </p>
            <p className="text-xs text-neutral-500">
              Jenis: {analysis.jenisDokumen.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Option Status Warning */}
        <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs space-y-2 text-neutral-700 dark:text-neutral-300">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">Status Opsi Konfirmasi:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Buat vendor baru otomatis:{" "}
              <strong>{options.buat_vendor_baru ? "Aktif" : "Nonaktif"}</strong>
              {options.buat_vendor_baru && newVendorsCount > 0 && (
                <span className="text-blue-600 dark:text-blue-400 ml-1">
                  ({newVendorsCount} vendor baru akan didaftarkan)
                </span>
              )}
            </li>
            <li>
              Timpa periode yang sudah terisi:{" "}
              <strong>{options.timpa_periode ? "Aktif" : "Nonaktif (Aman)"}</strong>
            </li>
          </ul>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onBackToPeriksa}
            disabled={isConfirming}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium rounded-lg transition-colors"
          >
            Kembali ke Periksa
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
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
