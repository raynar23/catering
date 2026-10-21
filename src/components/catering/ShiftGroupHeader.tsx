"use client";

import React from "react";
import { formatTimeShort } from "@/lib/date";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShiftColumnState } from "@/lib/catering/grid-reducer";
import { Save, Send, History, Building2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShiftGroupHeaderProps {
  shift: ShiftColumnState;
  hasDirty: boolean;
  isSaving: boolean;
  onSaveDraft: (shiftId: string) => void;
  onOpenKirimDialog: (shiftId: string) => void;
  onOpenRevisiDialog?: (shiftId: string) => void;
}

// Group header displaying shift timing, vendor info, status badges, and action buttons
export function ShiftGroupHeader({
  shift,
  hasDirty,
  isSaving,
  onSaveDraft,
  onOpenKirimDialog,
  onOpenRevisiDialog,
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
    <div className="flex flex-col gap-2 p-3 bg-surface border-b border-border/80">
      {/* Top row: Shift Name, Hours, and Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-text text-sm tracking-tight truncate">
            {shift.shiftNama}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium shrink-0">
            {shift.shiftLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={shift.status} />
          {shift.status !== "belum_input" && shift.status !== "tidak_ada_periode" && (
            <StatusBadge status={shift.responVendor} />
          )}
        </div>
      </div>

      {/* Middle row: Hours and Assigned Vendor */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-muted shrink-0" />
          <span>{jamFormatted}</span>
        </div>
        <div className="flex items-center gap-1 truncate max-w-[180px]" title={shift.vendorNama || "Vendor belum dipilih"}>
          <Building2 className="w-3.5 h-3.5 text-muted shrink-0" />
          <span className="truncate font-medium text-text">
            {shift.vendorNama ? `${shift.vendorNama}` : "-"}
          </span>
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
        <div className="text-[11px] text-muted truncate">
          {shift.lastUpdatedBy ? (
            <span title={`Diupdate oleh ${shift.lastUpdatedBy}`}>
              Diupdate: <strong className="font-medium text-text">{shift.lastUpdatedBy}</strong>
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
                  "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[6px] transition-colors border shadow-xs select-none",
                  hasDirty
                    ? "bg-surface border-border text-text hover:bg-slate-50 active:bg-slate-100"
                    : "opacity-40 cursor-not-allowed bg-slate-50 border-border/50 text-muted"
                )}
                title="Simpan perubahan bagian yang diubah pada shift ini"
              >
                <Save className="w-3 h-3 text-muted" />
                <span>Simpan</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenKirimDialog(shift.shiftId)}
                disabled={isSaving}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[6px] transition-colors bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white shadow-xs select-none"
                title="Kirim kebutuhan catering ke vendor"
              >
                <Send className="w-3 h-3" />
                <span>Kirim</span>
              </button>
            </>
          )}

          {isFinalOrLocked && (
            <div className="flex items-center gap-1.5">
              {shift.orderId && (
                <a
                  href={`/admin/verifikasi/${shift.orderId}/riwayat`}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[6px] border border-border bg-white text-muted hover:text-text hover:bg-slate-50 transition-colors shadow-xs select-none"
                  title="Lihat riwayat kronologi pesanan"
                >
                  <History className="w-3 h-3 text-muted" />
                  <span>Riwayat</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
