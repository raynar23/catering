"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { generateExportFilename } from "@/lib/rekap";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  dari: string;
  sampai: string;
  vendorId?: string;
  bagianId?: string;
  shiftId?: string;
}

// Modal dialog configuring export format (Excel/PDF) and optional notes before file download
export function ExportDialog({
  open,
  onClose,
  dari,
  sampai,
  vendorId,
  bagianId,
  shiftId,
}: ExportDialogProps) {
  const { toast } = useToast();
  const [formatType, setFormatType] = useState<"excel" | "pdf">("excel");
  const [catatan, setCatatan] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  if (!open) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const endpoint = formatType === "excel" ? "/api/ekspor/excel" : "/api/ekspor/pdf";
      const params = new URLSearchParams({
        dari,
        sampai,
        catatan,
      });

      if (vendorId) params.set("vendorId", vendorId);
      if (bagianId) params.set("bagianId", bagianId);
      if (shiftId) params.set("shiftId", shiftId);

      const res = await fetch(`${endpoint}?${params.toString()}`, {
        method: "GET",
      });

      if (!res.ok) {
        let errMessage = "Gagal mengunduh dokumen";
        try {
          const json = await res.json();
          if (json.error) errMessage = json.error;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      const blob = await res.blob();
      const filename =
        res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") ||
        generateExportFilename(formatType, dari, sampai);

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Ekspor Berhasil",
        description: `Berkas ${filename} telah berhasil diunduh.`,
        variant: "success",
      });

      onClose();
    } catch (err: unknown) {
      toast({
        title: "Gagal Ekspor",
        description: err instanceof Error ? err.message : "Terjadi kesalahan saat mengekspor dokumen",
        variant: "danger",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={!isExporting ? onClose : undefined}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-surface border border-border rounded-[12px] shadow-2xl p-5 z-10 animate-in fade-in zoom-in-95">
        <h2 className="text-sm font-semibold text-text">Ekspor Rekapitulasi & Laporan</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Rentang: <strong className="text-text">{dari}</strong> s/d{" "}
          <strong className="text-text">{sampai}</strong>
        </p>

        {/* Format Selection Cards */}
        <div className="mt-4 space-y-2">
          <label className="text-xs font-medium text-text">Pilih Format Berkas</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setFormatType("excel")}
              className={`p-3 rounded-[8px] border text-left transition-colors cursor-pointer ${
                formatType === "excel"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-surface text-text hover:bg-bg"
              }`}
            >
              <p className="text-xs font-semibold">Microsoft Excel (.xlsx)</p>
              <p className="text-[11px] text-text-muted mt-1 leading-snug">
                Format matriks split 1-15 & 16-akhir, multi-sheet, dan rumus SUM dinamis.
              </p>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => setFormatType("pdf")}
              className={`p-3 rounded-[8px] border text-left transition-colors cursor-pointer ${
                formatType === "pdf"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-surface text-text hover:bg-bg"
              }`}
            >
              <p className="text-xs font-semibold">Dokumen PDF (.pdf)</p>
              <p className="text-[11px] text-text-muted mt-1 leading-snug">
                A4 Landscape ber-kop resmi, rincian per bagian, dan tabel ringkasan shift & vendor.
              </p>
            </button>
          </div>
        </div>

        {/* Optional Notes Input for Document Footer */}
        <div className="mt-4 space-y-1.5">
          <label htmlFor="catatan-ekspor" className="text-xs font-medium text-text">
            Catatan Tambahan (Opsional)
          </label>
          <textarea
            id="catatan-ekspor"
            rows={3}
            disabled={isExporting}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Tuliskan catatan atau keterangan khusus yang akan dicetak pada footer dokumen..."
            className="w-full text-xs rounded-[8px] border border-border bg-surface p-2.5 text-text focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-muted/60"
          />
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            className="h-8 px-3 rounded-[6px] border border-border text-xs text-text hover:bg-bg transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={handleDownload}
            className="h-8 px-4 rounded-[6px] bg-primary text-white text-xs font-semibold hover:bg-primary/95 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isExporting ? "Sedang Menyiapkan..." : "Unduh Dokumen"}
          </button>
        </div>
      </div>
    </div>
  );
}
