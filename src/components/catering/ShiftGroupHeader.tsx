"use client";

import React from "react";
import { formatTimeShort } from "@/lib/date";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShiftColumnState } from "@/lib/catering/grid-reducer";
import { cn } from "@/lib/utils";

interface ShiftGroupHeaderProps {
  shift: ShiftColumnState;
  hasDirty: boolean;
  isSaving: boolean;
  onSaveDraft: (shiftId: string) => void;
  onOpenKirimDialog: (shiftId: string) => void;
}

// Enterprise shift header displaying operational schedule, assigned vendor, and actions
export function ShiftGroupHeader({
  shift,
  hasDirty,
  isSaving,
  onSaveDraft,
  onOpenKirimDialog,
}: ShiftGroupHeaderProps) {
  const isFinalOrLocked =
    shift.status === "final" ||
    shift.status === "disetujui" ||
    shift.status === "revisi";
  const hasPeriod = shift.status !== "tidak_ada_periode";

  const jamFormatted = `${formatTimeShort(shift.jamMulai)} - ${formatTimeShort(
    shift.jamSelesai
  )}`;

  return (
    <div className="flex flex-col p-3 bg-[#F9F9FB]/95 backdrop-blur-sm border-b border-black/[0.08] select-none">
      {/* Row 1: Shift Title and Status Tag */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-text text-sm tracking-tight">
            {shift.shiftNama}
          </span>
          <span className="text-[11px] font-medium text-[#86868B]">
            • {shift.shiftLabel}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StatusBadge status={shift.status} />
          {shift.status !== "belum_input" && shift.status !== "tidak_ada_periode" && (
            <StatusBadge status={shift.responVendor} />
          )}
        </div>
      </div>

      {/* Row 2: Vendor and Operating Hours */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-black/[0.06]">
        <span
          className="font-semibold text-text truncate max-w-[170px]"
          title={shift.vendorNama || "Vendor belum dipilih"}
        >
          {shift.vendorNama || "Vendor belum ditentukan"}
        </span>
        <span className="tabular-nums text-[#86868B] text-[11px] shrink-0 font-mono">
          {jamFormatted}
        </span>
      </div>

      {/* Row 3: PIC update info and action buttons */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="text-[11px] text-[#86868B] truncate max-w-[130px]">
          {shift.lastUpdatedBy ? (
            <span title={`Terakhir diubah oleh ${shift.lastUpdatedBy}`}>
              PIC: <strong className="font-semibold text-text">{shift.lastUpdatedBy}</strong>
            </span>
          ) : (
            <span>Belum ada draft</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isFinalOrLocked && hasPeriod && (
            <>
              <button
                type="button"
                onClick={() => onSaveDraft(shift.shiftId)}
                disabled={isSaving || !hasDirty}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-[6px] border transition-all cursor-pointer",
                  hasDirty
                    ? "border-primary/40 bg-white text-primary hover:bg-primary/5 shadow-xs"
                    : "opacity-40 cursor-not-allowed border-[#E5E5EA] bg-[#F5F5F7] text-[#86868B]"
                )}
                title="Simpan perubahan porsi pada shift ini"
              >
                Simpan
              </button>

              <button
                type="button"
                onClick={() => onOpenKirimDialog(shift.shiftId)}
                disabled={isSaving}
                className="px-3 py-1 text-xs font-semibold rounded-[6px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                title="Kirim kebutuhan catering ke vendor"
              >
                Kirim
              </button>
            </>
          )}

          {isFinalOrLocked && shift.orderId && (
            <a
              href={`/admin/verifikasi/${shift.orderId}/riwayat`}
              className="px-2.5 py-1 text-xs font-semibold rounded-[6px] bg-[#E5E5EA]/80 hover:bg-[#DCDCE2] text-[#1D1D1F] transition-all cursor-pointer"
              title="Lihat riwayat transaksi pesanan"
            >
              Riwayat
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
