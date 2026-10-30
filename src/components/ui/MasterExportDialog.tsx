"use client";

import React, { useState } from "react";
import { FileSpreadsheet, FileText, Download, Loader2 } from "lucide-react";

export interface MasterExportDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onExport: (format: "excel" | "pdf", catatan?: string) => Promise<void> | void;
  isExporting?: boolean;
}

// Dialog allowing users to select export format (Excel or PDF) with optional notes
export function MasterExportDialog({
  open,
  onClose,
  title,
  subtitle,
  onExport,
  isExporting = false,
}: MasterExportDialogProps) {
  const [formatType, setFormatType] = useState<"excel" | "pdf">("excel");
  const [catatan, setCatatan] = useState("");
  const [localLoading, setLocalLoading] = useState(false);

  if (!open) return null;

  const loading = isExporting || localLoading;

  const handleConfirm = async () => {
    setLocalLoading(true);
    try {
      await onExport(formatType, catatan.trim() || undefined);
      onClose();
    } catch {
      // Errors handled by parent component toast
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-[2px] transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white border border-black/[0.08] rounded-[14px] shadow-[0_24px_48px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.06)] p-5 z-10 animate-in fade-in zoom-in-95">
        <h2 className="text-sm font-bold text-[#1D1D1F] tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-[#86868B] mt-0.5">{subtitle}</p>}

        {/* Format Selection - 1 Row */}
        <div className="mt-4 space-y-1.5">
          <label className="text-[12px] font-semibold text-[#1D1D1F] tracking-tight">
            Pilih Format Berkas
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setFormatType("excel")}
              className={`h-10 px-3.5 rounded-[8px] border flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                formatType === "excel"
                  ? "border-primary bg-primary/5 text-primary font-semibold shadow-xs ring-1 ring-primary/20"
                  : "border-[#E5E5EA] bg-[#F5F5F7]/60 text-text hover:bg-[#E5E5EA]/40 font-medium"
              }`}
            >
              <FileSpreadsheet
                className={`w-4 h-4 shrink-0 ${
                  formatType === "excel" ? "text-primary" : "text-[#48484A]"
                }`}
              />
              <span className="text-xs whitespace-nowrap">
                Microsoft Excel (.xlsx)
              </span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => setFormatType("pdf")}
              className={`h-10 px-3.5 rounded-[8px] border flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                formatType === "pdf"
                  ? "border-primary bg-primary/5 text-primary font-semibold shadow-xs ring-1 ring-primary/20"
                  : "border-[#E5E5EA] bg-[#F5F5F7]/60 text-text hover:bg-[#E5E5EA]/40 font-medium"
              }`}
            >
              <FileText
                className={`w-4 h-4 shrink-0 ${
                  formatType === "pdf" ? "text-primary" : "text-[#48484A]"
                }`}
              />
              <span className="text-xs whitespace-nowrap">
                Dokumen PDF (.pdf)
              </span>
            </button>
          </div>
        </div>

        {/* Optional Notes */}
        <div className="mt-3.5 space-y-1.5">
          <label className="text-[12px] font-semibold text-[#1D1D1F] tracking-tight">
            Catatan Tambahan (Opsional)
          </label>
          <textarea
            rows={2}
            value={catatan}
            disabled={loading}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Catatan khusus yang akan dicantumkan di bawah dokumen..."
            className="w-full text-xs rounded-[8px] border border-[#D1D1D6] p-2.5 text-text placeholder:text-[#8A8A90] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06]">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="h-8.5 px-3.5 rounded-[8px] border border-[#D1D1D6] bg-white hover:bg-[#F2F2F7] active:bg-[#E5E5EA] text-[#1C1C1E] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleConfirm}
            className="h-8.5 px-4 rounded-[8px] bg-primary hover:bg-[#007BB8] active:bg-[#006CA2] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.08)] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyiapkan...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Dokumen</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
