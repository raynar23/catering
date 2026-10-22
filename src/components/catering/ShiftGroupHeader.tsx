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
    <div className="flex flex-col p-3 bg-surface border-b border-border select-none">
      {/* Row 1: Shift Title and Status Tag */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-text text-sm tracking-tight">
            {shift.shiftNama}
          </span>
          <span className="text-[11px] font-medium text-text-muted">
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

      {/* Row 2: Vendor and Operating Hours (Text metadata without decorative icon clutter) */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-border/40">
        <span
          className="font-medium text-text truncate max-w-[170px]"
          title={shift.vendorNama || "Vendor belum dipilih"}
        >
          {shift.vendorNama || "Vendor belum ditentukan"}
        </span>
        <span className="tabular-nums text-text-muted text-[11px] shrink-0 font-mono">
          {jamFormatted}
        </span>
      </div>

      {/* Row 3: PIC update info and clear action buttons */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="text-[11px] text-text-muted truncate max-w-[130px]">
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
                  "px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer",
                  hasDirty
                    ? "border-primary/40 bg-white text-primary hover:bg-primary/5 shadow-2xs font-semibold"
                    : "opacity-40 cursor-not-allowed border-border/60 bg-slate-50 text-text-muted"
                )}
                title="Simpan perubahan porsi pada shift ini"
              >
                Simpan
              </button>

              <button
                type="button"
                onClick={() => onOpenKirimDialog(shift.shiftId)}
                disabled={isSaving}
                className="px-3 py-1 text-xs font-semibold rounded-md bg-[#003366] hover:bg-[#002850] active:bg-[#001f3f] text-white shadow-2xs transition-all cursor-pointer"
                title="Kirim kebutuhan catering ke vendor"
              >
                Kirim
              </button>
            </>
          )}

          {isFinalOrLocked && shift.orderId && (
            <a
              href={`/admin/verifikasi/${shift.orderId}/riwayat`}
              className="px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-white text-text hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
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
