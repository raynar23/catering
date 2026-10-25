"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { resetOperationalDataAction } from "@/lib/actions/periode";
import { useToast } from "@/components/ui/Toast";
import { AlertTriangle, Trash2 } from "lucide-react";

interface ResetOperationalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Modal dialog to purge all operational catering transactions for client handover
export function ResetOperationalModal({
  open,
  onOpenChange,
  onSuccess,
}: ResetOperationalModalProps) {
  const { toast } = useToast();
  const [confirmationText, setConfirmationText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isConfirmed = confirmationText.trim().toUpperCase() === "HAPUS";

  const handleReset = async () => {
    if (!isConfirmed) return;
    setIsSubmitting(true);
    try {
      const res = await resetOperationalDataAction(confirmationText.trim());
      if (res.success) {
        toast({
          title: "Pembersihan Berhasil",
          description: res.message ?? "Seluruh data operasional berhasil dibersihkan",
          variant: "success",
        });
        setConfirmationText("");
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: "Pembersihan Gagal",
          description: res.error ?? "Terjadi kesalahan saat membersihkan data",
          variant: "danger",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setConfirmationText("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      title="Hapus Semua Data Operasional"
      description="Pembersihan seluruh data transaksi katering untuk persiapan serah terima sistem ke client"
      maxWidth="md"
    >
      <div className="space-y-4 pt-2">
        <div className="p-3.5 rounded-[8px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800 dark:text-red-300 space-y-1">
            <p className="font-semibold">Tindakan ini bersifat permanen dan tidak dapat dibatalkan!</p>
            <p>
              Seluruh jadwal periode, pesanan katering, kuota porsi per bagian, riwayat revisi,
              dan log transaksi audit akan dihapus secara menyeluruh agar database kembali bersih.
            </p>
            <p className="text-[11px] text-red-700/80 dark:text-red-400/80">
              Catatan: Data master (Shift, Bagian, Vendor Mitra, dan Akun Pengguna) tetap aman dan tidak terhapus.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-reset-input" className="block text-xs font-medium text-text">
            Ketik kata <span className="font-bold text-red-600 dark:text-red-400">HAPUS</span> untuk konfirmasi:
          </label>
          <input
            id="confirm-reset-input"
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Ketik HAPUS di sini..."
            disabled={isSubmitting}
            autoComplete="off"
            className="w-full h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            className="h-9 px-4 rounded-[8px] border border-border text-xs font-medium text-text hover:bg-bg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!isConfirmed || isSubmitting}
            onClick={handleReset}
            className="h-9 px-4 rounded-[8px] bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Membersihkan Data..." : "Hapus Semua Data Operasional"}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
