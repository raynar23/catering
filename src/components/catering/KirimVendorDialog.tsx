"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { ShiftColumnState } from "@/lib/catering/grid-reducer";
import { AlertCircle, Send, Lock } from "lucide-react";


interface KirimVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: ShiftColumnState | null;
  missingBagian: string[];
  totals: { totalKaryawan: number; totalPorsi: number };
  onConfirm: (catatan: string) => Promise<void>;
  isProcessing: boolean;
}

// Confirmation dialog validating full department coverage before finalizing order
export function KirimVendorDialog({
  open,
  onOpenChange,
  shift,
  missingBagian,
  totals,
  onConfirm,
  isProcessing,
}: KirimVendorDialogProps) {
  const [catatan, setCatatan] = useState("");

  if (!shift) return null;

  const hasMissing = missingBagian.length > 0;

  const handleConfirm = async () => {
    if (hasMissing) return;
    await onConfirm(catatan);
    setCatatan("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        hasMissing
          ? "Pengiriman Ditolak: Data Belum Lengkap"
          : "Konfirmasi Pengiriman ke Vendor"
      }
      description={
        hasMissing
          ? "Seluruh bagian aktif wajib diisi kuota porsinya sebelum pesanan dapat dikirim ke vendor."
          : `Pesanan kebutuhan catering ${shift.shiftNama} akan difinalisasi dan diteruskan ke vendor terkait.`
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        {hasMissing ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 rounded-[8px] bg-rose-50 border border-rose-200 text-rose-900 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-950">
                  Terdapat {missingBagian.length} bagian yang belum diisi porsinya:
                </p>
                <p className="text-xs text-rose-800">
                  Pastikan semua bagian telah memiliki nilai porsi (isi angka 0 jika shift ini tidak ada jatah catering untuk bagian tersebut).
                </p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-[8px] border border-border p-2 bg-slate-50 space-y-1">
              {missingBagian.map((nama) => (
                <div
                  key={nama}
                  className="px-2.5 py-1.5 rounded-[6px] bg-white border border-border/80 text-xs text-text flex items-center justify-between"
                >
                  <span className="font-medium">{nama}</span>
                  <span className="text-[11px] text-rose-600 font-medium">
                    Belum diisi
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm font-medium rounded-[8px] bg-primary text-white hover:bg-[#0E63A1]"
              >
                Tutup & Lengkapi Data
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Shift & Vendor summary */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[8px] bg-slate-50 border border-border text-xs">
              <div>
                <span className="text-muted block">Shift Operasional</span>
                <span className="font-semibold text-text text-sm">
                  {shift.shiftNama} ({shift.shiftLabel})
                </span>
              </div>
              <div>
                <span className="text-muted block">Mitra Vendor</span>
                <span className="font-semibold text-text text-sm">
                  {shift.vendorNama || "-"}
                </span>
              </div>
              <div className="pt-2 border-t border-border/60">
                <span className="text-muted block">Total Karyawan</span>
                <span className="font-mono font-semibold text-text text-sm">
                  {totals.totalKaryawan} orang
                </span>
              </div>
              <div className="pt-2 border-t border-border/60">
                <span className="text-muted block">Total Porsi</span>
                <span className="font-mono font-bold text-primary text-sm">
                  {totals.totalPorsi} porsi
                </span>
              </div>
            </div>

            {/* Note input */}
            <div className="space-y-1.5">
              <label
                htmlFor="kirim-catatan"
                className="text-xs font-medium text-text block"
              >
                Catatan Pengiriman (Opsional)
              </label>
              <textarea
                id="kirim-catatan"
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Misal: Tambahan air mineral untuk workshop atau instruksi antar..."
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-border bg-white text-text placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Warning callout */}
            <div className="flex items-start gap-2.5 p-3 rounded-[8px] bg-blue-50/70 border border-blue-200 text-blue-950 text-xs">
              <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Setelah dikirim, data shift ini akan berstatus <strong>Final</strong> dan terkunci. Perubahan kuota setelahnya wajib diajukan melalui alur <strong>Ajukan Revisi</strong>.
              </span>
            </div>

            {/* Dialog actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-medium rounded-[8px] border border-border bg-white text-text hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isProcessing ? "Mengirim..." : "Konfirmasi & Kirim ke Vendor"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
