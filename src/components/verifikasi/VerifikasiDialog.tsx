"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { VerificationRevisionItem } from "@/lib/actions/revisi";
import { formatDelta } from "@/lib/catering/log-formatter";
import { formatDateIndonesian } from "@/lib/date";
import { AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifikasiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VerificationRevisionItem | null;
  onVerify: (
    revisionId: string,
    setuju: boolean,
    catatan?: string
  ) => Promise<void>;
  isProcessing: boolean;
}

// Verification dialog for approving or rejecting portion revisions with vendor status warning
export function VerifikasiDialog({
  open,
  onOpenChange,
  item,
  onVerify,
  isProcessing,
}: VerifikasiDialogProps) {
  if (!open || !item) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Verifikasi Pengajuan Revisi"
      description={`Tinjau pengajuan perubahan kuota porsi untuk ${item.bagianNama}.`}
      maxWidth="md"
    >
      <VerifikasiForm
        key={item.id}
        item={item}
        onClose={() => onOpenChange(false)}
        onVerify={onVerify}
        isProcessing={isProcessing}
      />
    </Dialog>
  );
}

function VerifikasiForm({
  item,
  onClose,
  onVerify,
  isProcessing,
}: {
  item: VerificationRevisionItem;
  onClose: () => void;
  onVerify: (
    revisionId: string,
    setuju: boolean,
    catatan?: string
  ) => Promise<void>;
  isProcessing: boolean;
}) {
  const [actionType, setActionType] = useState<"setujui" | "batalkan">("setujui");
  const [catatan, setCatatan] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isVendorBelumSanggup = item.responVendor !== "disanggupi";

  const handleConfirm = async () => {
    if (actionType === "batalkan" && !catatan.trim()) {
      setErrorMsg("Catatan penolakan wajib diisi saat membatalkan revisi.");
      return;
    }

    setErrorMsg(null);
    await onVerify(item.id, actionType === "setujui", catatan.trim());
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-2.5 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-900 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Warning banner if vendor has not agreed yet */}
      {isVendorBelumSanggup && (
        <div className="flex items-start gap-2.5 p-3 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-950 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-900">
              Peringatan: Vendor belum menyanggupi
            </p>
            <p className="text-amber-800 leading-relaxed">
              Status respons vendor saat ini: <strong>{item.responVendor}</strong>. Anda tetap dapat menyetujui jika telah melakukan koordinasi langsung dengan vendor.
            </p>
          </div>
        </div>
      )}

      {/* Revision summary details */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-[8px] bg-slate-50 border border-border text-xs">
        <div>
          <span className="text-muted block">Tanggal & Shift</span>
          <span className="font-semibold text-text">
            {formatDateIndonesian(item.tanggal)}, {item.shiftNama}
          </span>
        </div>
        <div>
          <span className="text-muted block">Mitra Vendor</span>
          <span className="font-semibold text-text">{item.vendorNama}</span>
        </div>
        <div>
          <span className="text-muted block">Bagian</span>
          <span className="font-semibold text-text text-sm">
            {item.bagianNama}
          </span>
        </div>
        <div>
          <span className="text-muted block">Pengaju</span>
          <span className="font-semibold text-text">{item.diajukanOlehNama}</span>
        </div>
      </div>

      {/* Values change card */}
      <div className="p-3 rounded-[8px] border border-border bg-white space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted font-medium">Perubahan Karyawan:</span>
          <span className="font-mono text-text">
            <span className="line-through text-slate-400 mr-1.5 font-normal">{item.karyawanAwal}</span>
            <strong>{item.karyawanBaru}</strong>
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border/50 pt-2">
          <span className="text-muted font-medium">Perubahan Porsi:</span>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-text">
              <span className="line-through text-slate-400 mr-1.5 font-normal">{item.porsiAwal}</span>
              <strong className="text-primary text-sm">{item.porsiBaru}</strong>
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded font-bold text-[11px]",
                item.selisihPorsi > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              )}
            >
              {formatDelta(item.selisihPorsi)}
            </span>
          </div>
        </div>
        <div className="border-t border-border/50 pt-2">
          <span className="text-muted block text-[11px]">Alasan Pengajuan:</span>
          <p className="text-text font-medium mt-0.5 italic">
            &quot;{item.alasan}&quot;
          </p>
        </div>
      </div>

      {/* Decision Toggle */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-text block">
          Tindakan Verifikasi
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setActionType("setujui");
              setErrorMsg(null);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-[8px] border transition-all cursor-pointer",
              actionType === "setujui"
                ? "bg-emerald-50 border-emerald-400 text-emerald-900 ring-1 ring-emerald-300"
                : "bg-white border-border text-muted hover:text-text hover:bg-slate-50"
            )}
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Setujui Revisi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActionType("batalkan");
              setErrorMsg(null);
            }}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-[8px] border transition-all cursor-pointer",
              actionType === "batalkan"
                ? "bg-rose-50 border-rose-400 text-rose-900 ring-1 ring-rose-300"
                : "bg-white border-border text-muted hover:text-text hover:bg-slate-50"
            )}
          >
            <X className="w-4 h-4 text-rose-600" />
            <span>Batalkan / Tolak</span>
          </button>
        </div>
      </div>

      {/* Notes Input */}
      <div className="space-y-1">
        <label
          htmlFor="verifikasi-catatan"
          className="text-xs font-medium text-text flex items-center justify-between"
        >
          <span>
            {actionType === "setujui"
              ? "Catatan Verifikator (Opsional)"
              : "Alasan Pembatalan / Penolakan *"}
          </span>
          {actionType === "batalkan" && (
            <span className="text-[11px] text-rose-600 font-semibold">
              Wajib diisi
            </span>
          )}
        </label>
        <textarea
          id="verifikasi-catatan"
          rows={2}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          disabled={isProcessing}
          placeholder={
            actionType === "setujui"
              ? "Catatan verifikasi atau instruksi tambahan..."
              : "Alasan pembatalan (misal: kuota pesanan sudah tidak memungkinkan diubah)..."
          }
          className="w-full px-3 py-2 text-xs rounded-[8px] border border-border bg-white text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="px-4 py-2 text-xs font-medium rounded-[8px] border border-border bg-white text-text hover:bg-slate-50"
        >
          Tutup
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={
            isProcessing || (actionType === "batalkan" && !catatan.trim())
          }
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-[8px] text-white shadow-xs select-none transition-colors",
            actionType === "setujui"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-rose-600 hover:bg-rose-700",
            isProcessing && "opacity-60 cursor-not-allowed"
          )}
        >
          <span>
            {isProcessing
              ? "Memproses..."
              : actionType === "setujui"
              ? "Konfirmasi Setujui"
              : "Konfirmasi Batalkan"}
          </span>
        </button>
      </div>
    </div>
  );
}
