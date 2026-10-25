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
        <div className="flex items-start gap-2 p-2.5 rounded-[8px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#D70015] text-xs">
          <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Target summary badge */}
      <div className="grid grid-cols-2 gap-2 p-3 rounded-[10px] bg-[#F5F5F7]/70 border border-black/[0.06] text-xs">
        <div>
          <span className="text-[#86868B] block text-[11px]">Bagian & Shift</span>
          <span className="font-semibold text-text">
            {target.bagianNama} - {target.shiftNama}
          </span>
        </div>
        <div>
          <span className="text-[#86868B] block text-[11px]">Mitra Vendor</span>
          <span className="font-semibold text-text">
            {target.vendorNama || "-"}
          </span>
        </div>
      </div>

      {/* Counts & Delta Comparison Grid */}
      <div className="border border-black/[0.08] rounded-[10px] overflow-hidden text-xs">
        <div className="grid grid-cols-3 bg-[#F9F9FB] font-semibold text-[#86868B] p-2 border-b border-black/[0.06] text-center text-[11px] uppercase tracking-wider">
          <span>Metrik</span>
          <span>Saat Ini</span>
          <span>Revisi Baru</span>
        </div>

        {/* Karyawan row */}
        <div className="grid grid-cols-3 items-center p-2.5 border-b border-black/[0.06] bg-white">
          <span className="font-semibold text-text">Karyawan</span>
          <span className="text-center font-mono text-[#86868B]">
            {target.karyawanAwal} orang
          </span>
          <div className="flex items-center justify-center gap-1.5">
            <input
              type="number"
              min={0}
              value={karyawanBaru}
              onChange={(e) => handleKaryawanChange(e.target.value)}
              disabled={isProcessing}
              className="w-16 h-8 text-center font-mono font-semibold rounded-[6px] border border-[#D1D1D6] bg-white text-text shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all"
            />
            {selisihKaryawan !== 0 && (
              <span
                className={cn(
                  "text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-[4px]",
                  selisihKaryawan > 0
                    ? "bg-[#34C759]/15 text-[#1E8E3E]"
                    : "bg-[#FF3B30]/15 text-[#D70015]"
                )}
              >
                {formatDelta(selisihKaryawan)}
              </span>
            )}
          </div>
        </div>

        {/* Porsi row */}
        <div className="grid grid-cols-3 items-center p-2.5 bg-primary-50/20">
          <span className="font-semibold text-text">Porsi Catering</span>
          <span className="text-center font-mono text-[#86868B]">
            {target.porsiAwal} porsi
          </span>
          <div className="flex items-center justify-center gap-1.5">
            <input
              type="number"
              min={0}
              value={porsiBaru}
              onChange={(e) => handlePorsiChange(e.target.value)}
              disabled={isProcessing}
              className="w-16 h-8 text-center font-mono font-bold text-primary rounded-[6px] border border-[#D1D1D6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all"
            />
            {selisihPorsi !== 0 && (
              <span
                className={cn(
                  "text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-[4px]",
                  selisihPorsi > 0
                    ? "bg-[#34C759]/15 text-[#1E8E3E]"
                    : "bg-[#FF3B30]/15 text-[#D70015]"
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
          className="text-[12px] font-semibold text-[#1D1D1F] tracking-tight flex items-center justify-between"
        >
          <span>Alasan Pengajuan Revisi <span className="text-[#FF3B30] font-bold">*</span></span>
          <span className="text-[11px] font-normal text-[#86868B]">Wajib diisi</span>
        </label>
        <textarea
          id="revisi-alasan"
          rows={3}
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          disabled={isProcessing}
          placeholder="Contoh: Tambahan 3 personil lembur operasional kapal di dermaga..."
          className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#D1D1D6] bg-white text-text shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all resize-none"
        />
      </div>

      {/* Notice box */}
      <div className="text-[11px] text-[#86868B] leading-relaxed bg-[#F5F5F7] p-2.5 rounded-[8px] border border-black/[0.06]">
        Pesanan akan beralih ke status <strong>Revisi</strong>. Perubahan kuota baru akan resmi berlaku pada rekapitulasi setelah disetujui oleh verifikator GA di menu <strong>Verifikasi Data</strong>.
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5EA]">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="h-8.5 px-4 text-xs font-semibold rounded-[8px] bg-[#E5E5EA]/80 hover:bg-[#DCDCE2] text-[#1D1D1F] transition-all cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isProcessing || isNoChange || !alasan.trim()}
          className={cn(
            "inline-flex items-center gap-1.5 h-8.5 px-4 text-xs font-semibold rounded-[8px] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] select-none transition-all cursor-pointer focus:outline-none focus:ring-3 focus:ring-primary/20",
            isProcessing || isNoChange || !alasan.trim()
              ? "bg-[#D1D1D6] text-[#86868B] cursor-not-allowed shadow-none"
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
