"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { formatDelta } from "@/lib/catering/log-formatter";
import { History, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AjukanRevisiTarget {
  itemId: string;
  bagianId: string;
  bagianNama: string;
  shiftId: string;
  shiftNama: string;
  vendorNama?: string | null;
  karyawanAwal: number;
  porsiAwal: number;
}

interface AjukanRevisiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: AjukanRevisiTarget | null;
  onSubmit: (params: {
    itemId: string;
    karyawanBaru: number;
    porsiBaru: number;
    alasan: string;
  }) => Promise<void>;
  isProcessing: boolean;
}

// Dialog for submitting portion and employee count revisions with automatic delta calculation
export function AjukanRevisiDialog({
  open,
  onOpenChange,
  target,
  onSubmit,
  isProcessing,
}: AjukanRevisiDialogProps) {
  if (!open || !target) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Ajukan Revisi: ${target.bagianNama}`}
      description={`Pengajuan perubahan kuota porsi pada ${target.shiftNama} yang telah berstatus Final.`}
      maxWidth="md"
    >
      <AjukanRevisiForm
        key={target.itemId}
        target={target}
        onCancel={() => onOpenChange(false)}
        onSubmit={onSubmit}
        isProcessing={isProcessing}
      />
    </Dialog>
  );
}

function AjukanRevisiForm({
  target,
  onCancel,
  onSubmit,
  isProcessing,
}: {
  target: AjukanRevisiTarget;
  onCancel: () => void;
  onSubmit: (params: {
    itemId: string;
    karyawanBaru: number;
    porsiBaru: number;
    alasan: string;
  }) => Promise<void>;
  isProcessing: boolean;
}) {
  const [karyawanBaru, setKaryawanBaru] = useState<number>(target.karyawanAwal);
  const [porsiBaru, setPorsiBaru] = useState<number>(target.porsiAwal);
  const [isCustomPorsi, setIsCustomPorsi] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selisihKaryawan = karyawanBaru - target.karyawanAwal;
  const selisihPorsi = porsiBaru - target.porsiAwal;
  const isNoChange =
    karyawanBaru === target.karyawanAwal && porsiBaru === target.porsiAwal;

  const handleKaryawanChange = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    const val = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setKaryawanBaru(val);
    if (!isCustomPorsi) {
      setPorsiBaru(val);
    }
  };

  const handlePorsiChange = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    const val = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setPorsiBaru(val);
    setIsCustomPorsi(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alasan.trim()) {
      setErrorMsg("Alasan revisi wajib diisi.");
      return;
    }
    if (isNoChange) {
      setErrorMsg("Jumlah karyawan atau porsi revisi harus berbeda dari data saat ini.");
      return;
    }

    setErrorMsg(null);
    await onSubmit({
      itemId: target.itemId,
      karyawanBaru,
      porsiBaru,
      alasan: alasan.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="flex items-start gap-2 p-2.5 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-900 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Target summary badge */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-[8px] bg-slate-50 border border-border text-xs">
        <div>
          <span className="text-muted block">Bagian & Shift</span>
          <span className="font-semibold text-text">
            {target.bagianNama} - {target.shiftNama}
          </span>
        </div>
        <div>
          <span className="text-muted block">Mitra Vendor</span>
          <span className="font-semibold text-text">
            {target.vendorNama || "-"}
          </span>
        </div>
      </div>

      {/* Counts & Delta Comparison Grid */}
      <div className="border border-border rounded-[8px] overflow-hidden text-xs">
        <div className="grid grid-cols-3 bg-slate-100 font-semibold text-text p-2 border-b border-border text-center">
          <span>Metrik</span>
          <span>Saat Ini</span>
          <span>Revisi Baru</span>
        </div>

        {/* Karyawan row */}
        <div className="grid grid-cols-3 items-center p-2.5 border-b border-border/60">
          <span className="font-medium text-text">Karyawan</span>
          <span className="text-center font-mono text-muted">
            {target.karyawanAwal} orang
          </span>
          <div className="flex items-center justify-center gap-1.5">
            <input
              type="number"
              min={0}
              value={karyawanBaru}
              onChange={(e) => handleKaryawanChange(e.target.value)}
              disabled={isProcessing}
              className="w-16 h-8 text-center font-mono font-semibold rounded-[6px] border border-border bg-white text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            {selisihKaryawan !== 0 && (
              <span
                className={cn(
                  "text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded",
                  selisihKaryawan > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                )}
              >
                {formatDelta(selisihKaryawan)}
              </span>
            )}
          </div>
        </div>

        {/* Porsi row */}
        <div className="grid grid-cols-3 items-center p-2.5 bg-blue-50/30">
          <span className="font-medium text-text">Porsi Catering</span>
          <span className="text-center font-mono text-muted">
            {target.porsiAwal} porsi
          </span>
          <div className="flex items-center justify-center gap-1.5">
            <input
              type="number"
              min={0}
              value={porsiBaru}
              onChange={(e) => handlePorsiChange(e.target.value)}
              disabled={isProcessing}
              className="w-16 h-8 text-center font-mono font-bold text-primary rounded-[6px] border border-border bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            {selisihPorsi !== 0 && (
              <span
                className={cn(
                  "text-[11px] font-mono font-bold px-1.5 py-0.5 rounded",
                  selisihPorsi > 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                )}
              >
                {formatDelta(selisihPorsi)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reason field (mandatory) */}
      <div className="space-y-1">
        <label
          htmlFor="revisi-alasan"
          className="text-xs font-semibold text-text flex items-center justify-between"
        >
          <span>Alasan Pengajuan Revisi *</span>
          <span className="text-[11px] font-normal text-muted">Wajib diisi</span>
        </label>
        <textarea
          id="revisi-alasan"
          rows={3}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          disabled={isProcessing}
          placeholder="Contoh: Tambahan 3 personil lembur operasional kapal di dermaga..."
          className="w-full px-3 py-2 text-xs rounded-[8px] border border-border bg-white text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
      </div>

      {/* Notice box */}
      <div className="text-[11px] text-muted leading-relaxed bg-slate-50 p-2.5 rounded-[6px] border border-border/80">
        Pesanan akan beralih ke status <strong>Revisi</strong>. Perubahan kuota baru akan resmi berlaku pada rekapitulasi setelah disetujui oleh verifikator GA di menu <strong>Verifikasi Data</strong>.
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="px-4 py-2 text-xs font-medium rounded-[8px] border border-border bg-white text-text hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isProcessing || isNoChange || !alasan.trim()}
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-[8px] text-white shadow-xs select-none transition-colors",
            isProcessing || isNoChange || !alasan.trim()
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94]"
          )}
        >
          <History className="w-3.5 h-3.5" />
          <span>{isProcessing ? "Mengajukan..." : "Kirim Pengajuan Revisi"}</span>
        </button>
      </div>
    </form>
  );
}
