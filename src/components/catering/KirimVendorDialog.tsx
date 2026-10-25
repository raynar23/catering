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
            <div className="flex items-start gap-3 p-3.5 rounded-[10px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#D70015] text-sm">
              <AlertCircle className="w-5 h-5 text-[#FF3B30] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[#D70015] tracking-tight">
                  Terdapat {missingBagian.length} bagian yang belum diisi porsinya:
                </p>
                <p className="text-xs text-[#86868B]">
                  Pastikan semua bagian telah memiliki nilai porsi (isi angka 0 jika shift ini tidak ada jatah catering untuk bagian tersebut).
                </p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-[10px] border border-black/[0.08] p-2 bg-[#F5F5F7]/60 space-y-1">
              {missingBagian.map((nama) => (
                <div
                  key={nama}
                  className="px-2.5 py-1.5 rounded-[6px] bg-white border border-black/[0.06] text-xs text-text flex items-center justify-between shadow-xs"
                >
                  <span className="font-semibold text-[#1D1D1F]">{nama}</span>
                  <span className="text-[11px] text-[#FF3B30] font-semibold">
                    Belum diisi
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-8.5 px-4 text-xs font-semibold rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all cursor-pointer focus:outline-none focus:ring-3 focus:ring-primary/20"
              >
                Tutup & Lengkapi Data
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Shift & Vendor summary */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[10px] bg-[#F5F5F7]/70 border border-black/[0.06] text-xs">
              <div>
                <span className="text-[#86868B] block text-[11px]">Shift Operasional</span>
                <span className="font-bold text-text text-sm tracking-tight">
                  {shift.shiftNama} ({shift.shiftLabel})
                </span>
              </div>
              <div>
                <span className="text-[#86868B] block text-[11px]">Mitra Vendor</span>
                <span className="font-bold text-text text-sm tracking-tight">
                  {shift.vendorNama || "-"}
                </span>
              </div>
              <div className="pt-2 border-t border-black/[0.06]">
                <span className="text-[#86868B] block text-[11px]">Total Karyawan</span>
                <span className="font-mono font-bold text-text text-sm">
                  {totals.totalKaryawan} orang
                </span>
              </div>
              <div className="pt-2 border-t border-black/[0.06]">
                <span className="text-[#86868B] block text-[11px]">Total Porsi</span>
                <span className="font-mono font-bold text-primary text-sm">
                  {totals.totalPorsi} porsi
                </span>
              </div>
            </div>

            {/* Note input */}
            <div className="space-y-1.5">
              <label
                htmlFor="kirim-catatan"
                className="text-[12px] font-semibold text-[#1D1D1F] tracking-tight block"
              >
                Catatan Pengiriman (Opsional)
              </label>
              <textarea
                id="kirim-catatan"
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Misal: Tambahan air mineral untuk workshop atau instruksi antar..."
                className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#D1D1D6] bg-white text-text placeholder:text-[#86868B] shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all resize-none"
              />
            </div>

            {/* Warning callout */}
            <div className="flex items-start gap-2.5 p-3 rounded-[8px] bg-primary-50/30 border border-primary/20 text-[#1D1D1F] text-xs">
              <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-[#1D1D1F]">
                Setelah dikirim, data shift ini akan berstatus <strong>Final</strong> dan terkunci. Perubahan kuota setelahnya wajib diajukan melalui alur <strong>Ajukan Revisi</strong>.
              </span>
            </div>

            {/* Dialog actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
                className="h-8.5 px-4 text-xs font-semibold rounded-[8px] bg-[#E5E5EA]/80 hover:bg-[#DCDCE2] text-[#1D1D1F] transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 h-8.5 px-4 text-xs font-semibold rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all cursor-pointer focus:outline-none focus:ring-3 focus:ring-primary/20"
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
