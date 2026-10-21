"use client";

import React, { useState } from "react";
import {
  GridState,
  GridAction,
  calculateShiftTotals,
} from "@/lib/catering/grid-reducer";
import { NumberInputCell } from "./NumberInputCell";
import { ShiftGroupHeader } from "./ShiftGroupHeader";
import { AjukanRevisiTarget } from "./AjukanRevisiDialog";
import { FileText, History } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

interface CateringGridProps {
  state: GridState;
  dispatch: React.Dispatch<GridAction>;
  isSavingShiftId: string | null;
  onSaveShiftDraft: (shiftId: string) => void;
  onOpenKirimDialog: (shiftId: string) => void;
  onAjukanRevisi?: (target: AjukanRevisiTarget) => void;
}

// Interactive 3-shift catering matrix with sticky headers and totals row
export function CateringGrid({
  state,
  dispatch,
  isSavingShiftId,
  onSaveShiftDraft,
  onOpenKirimDialog,
  onAjukanRevisi,
}: CateringGridProps) {
  // Modal for editing row notes
  const [activeNoteCell, setActiveNoteCell] = useState<{
    shiftId: string;
    bagianId: string;
    bagianNama: string;
    shiftNama: string;
    note: string;
  } | null>(null);

  const { bagianList, shifts, shiftOrder } = state;

  const handleKaryawanChange = (
    shiftId: string,
    bagianId: string,
    val: number | null
  ) => {
    dispatch({
      type: "UPDATE_KARYAWAN",
      payload: { shiftId, bagianId, value: val },
    });
  };

  const handlePorsiChange = (
    shiftId: string,
    bagianId: string,
    val: number | null
  ) => {
    dispatch({
      type: "UPDATE_PORSI",
      payload: { shiftId, bagianId, value: val },
    });
  };

  const handleSaveNote = () => {
    if (!activeNoteCell) return;
    dispatch({
      type: "UPDATE_KETERANGAN",
      payload: {
        shiftId: activeNoteCell.shiftId,
        bagianId: activeNoteCell.bagianId,
        value: activeNoteCell.note,
      },
    });
    setActiveNoteCell(null);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-surface border border-border rounded-[10px] overflow-hidden shadow-xs">
      {/* Scrollable table container */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[980px]">
          {/* Header */}
          <thead className="sticky top-0 z-20 bg-surface shadow-xs">
            {/* Top Header Row: Bagian Title & 3 Shift Headers */}
            <tr className="border-b border-border">
              <th className="sticky left-0 z-30 bg-surface w-[240px] min-w-[240px] p-3 text-xs font-semibold text-text align-bottom border-r border-border">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-text">Data Bagian</span>
                  <span className="text-[11px] font-normal text-muted">
                    Unit kerja & lokasi antar
                  </span>
                </div>
              </th>

              {shiftOrder.map((shiftId) => {
                const shift = shifts[shiftId];
                if (!shift) return null;
                const shiftDirty = Object.values(shift.cells).some((c) => c.isDirty);

                return (
                  <th
                    key={shiftId}
                    colSpan={2}
                    className="p-0 border-r border-border last:border-r-0 bg-surface align-top"
                  >
                    <ShiftGroupHeader
                      shift={shift}
                      hasDirty={shiftDirty}
                      isSaving={isSavingShiftId === shiftId}
                      onSaveDraft={onSaveShiftDraft}
                      onOpenKirimDialog={onOpenKirimDialog}
                    />
                  </th>
                );
              })}
            </tr>

            {/* Sub-Header Row: Sub-columns Karyawan & Porsi */}
            <tr className="bg-slate-50 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
              <th className="sticky left-0 z-30 bg-slate-50 px-3 py-2 border-r border-border">
                Nama Bagian
              </th>

              {shiftOrder.map((shiftId) => (
                <React.Fragment key={shiftId}>
                  <th className="px-2 py-2 text-right w-[110px] min-w-[110px] border-r border-border/40">
                    Karyawan
                  </th>
                  <th className="px-2 py-2 text-right w-[110px] min-w-[110px] border-r border-border last:border-r-0">
                    Porsi
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border/60 text-xs">
            {bagianList.map((bagian) => (
              <tr
                key={bagian.id}
                className="hover:bg-slate-50/70 transition-colors group"
              >
                {/* Bagian sticky left column */}
                <td className="sticky left-0 z-10 bg-surface group-hover:bg-slate-50/90 px-3 py-2.5 border-r border-border transition-colors">
                  <div className="flex flex-col">
                    <span className="font-semibold text-text text-sm">
                      {bagian.nama}
                    </span>
                    <span className="text-[11px] text-muted">
                      {bagian.lokasi_antar || "Lokasi utama"}
                    </span>
                  </div>
                </td>

                {/* 3 Shift Cells */}
                {shiftOrder.map((shiftId) => {
                  const shift = shifts[shiftId];
                  if (!shift) return null;

                  const isLocked =
                    shift.status === "final" ||
                    shift.status === "disetujui" ||
                    shift.status === "revisi" ||
                    shift.status === "tidak_ada_periode";

                  const cell = shift.cells[bagian.id] ?? {
                    karyawan: null,
                    porsi: null,
                    keterangan: "",
                    isCustomPorsi: false,
                    isDirty: false,
                  };

                  return (
                    <React.Fragment key={shiftId}>
                      {/* Sub-column: Karyawan */}
                      <td className="p-1 border-r border-border/40 text-right align-middle">
                        <NumberInputCell
                          value={cell.karyawan}
                          onChange={(v) =>
                            handleKaryawanChange(shiftId, bagian.id, v)
                          }
                          disabled={isLocked}
                          isDirty={cell.isDirty}
                          isConflict={cell.isExternallyModified}
                          ariaLabel={`Karyawan ${bagian.nama} ${shift.shiftNama}`}
                        />
                      </td>

                      {/* Sub-column: Porsi */}
                      <td className="p-1 border-r border-border last:border-r-0 text-right align-middle">
                        <div className="flex items-center gap-1">
                          <NumberInputCell
                            value={cell.porsi}
                            onChange={(v) =>
                              handlePorsiChange(shiftId, bagian.id, v)
                            }
                            disabled={isLocked}
                            isDirty={cell.isDirty}
                            isCustom={cell.isCustomPorsi}
                            isConflict={cell.isExternallyModified}
                            ariaLabel={`Porsi ${bagian.nama} ${shift.shiftNama}`}
                          />

                          {/* Revision indicator or action button when locked */}
                          {isLocked && cell.itemId && (
                            <>
                              {cell.hasPendingRevision ? (
                                <span
                                  className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1 py-0.5 rounded leading-none shrink-0"
                                  title="Pengajuan revisi sedang menunggu verifikasi"
                                >
                                  Revisi
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onAjukanRevisi?.({
                                      itemId: cell.itemId!,
                                      bagianId: bagian.id,
                                      bagianNama: bagian.nama,
                                      shiftId,
                                      shiftNama: shift.shiftNama,
                                      vendorNama: shift.vendorNama,
                                      karyawanAwal: cell.karyawan ?? 0,
                                      porsiAwal: cell.porsi ?? 0,
                                    })
                                  }
                                  title="Ajukan perubahan porsi"
                                  className="p-1 rounded hover:bg-slate-100 text-muted hover:text-primary transition-colors shrink-0"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          {/* Note icon button */}
                          <button
                            type="button"
                            onClick={() =>
                              setActiveNoteCell({
                                shiftId,
                                bagianId: bagian.id,
                                bagianNama: bagian.nama,
                                shiftNama: shift.shiftNama,
                                note: cell.keterangan || "",
                              })
                            }
                            title={
                              cell.keterangan
                                ? `Catatan: ${cell.keterangan}`
                                : "Tambah catatan baris"
                            }
                            className={cn(
                              "p-1 rounded hover:bg-slate-100 text-muted transition-colors shrink-0",
                              cell.keterangan && "text-primary font-bold"
                            )}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {/* Sticky Footer: Total Row */}
          <tfoot className="sticky bottom-0 z-20 bg-slate-100 border-t-2 border-border shadow-xs">
            <tr className="text-xs font-bold text-text">
              <td className="sticky left-0 z-30 bg-slate-100 px-3 py-2.5 border-r border-border">
                <span>Total Porsi</span>
              </td>

              {shiftOrder.map((shiftId) => {
                const shift = shifts[shiftId];
                if (!shift) return null;
                const totals = calculateShiftTotals(shift.cells);

                return (
                  <React.Fragment key={shiftId}>
                    <td className="px-3 py-2.5 text-right font-mono text-muted border-r border-border/40">
                      {totals.totalKaryawan}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-primary font-extrabold border-r border-border last:border-r-0">
                      {totals.totalPorsi}
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Note Edit Modal */}
      {activeNoteCell && (
        <Dialog
          open={Boolean(activeNoteCell)}
          onOpenChange={(open) => !open && setActiveNoteCell(null)}
          title={`Catatan: ${activeNoteCell.bagianNama}`}
          description={`Keterangan khusus pesanan untuk ${activeNoteCell.shiftNama}`}
          maxWidth="sm"
        >
          <div className="space-y-3">
            <textarea
              rows={3}
              value={activeNoteCell.note}
              onChange={(e) =>
                setActiveNoteCell({
                  ...activeNoteCell,
                  note: e.target.value,
                })
              }
              placeholder="Misal: 2 porsi vegetarian / lembur operasional..."
              className="w-full px-3 py-2 text-xs rounded-[8px] border border-border bg-white text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveNoteCell(null)}
                className="px-3 py-1.5 text-xs rounded-[6px] border border-border text-muted hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-3 py-1.5 text-xs font-medium rounded-[6px] bg-primary text-white hover:bg-[#0E63A1]"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
