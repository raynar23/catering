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
import { Dialog } from "@/components/ui/Dialog";
import { formatTimeShort } from "@/lib/date";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

interface CateringGridProps {
  state: GridState;
  dispatch: React.Dispatch<GridAction>;
  isSavingShiftId: string | null;
  onSaveShiftDraft: (shiftId: string) => void;
  onOpenKirimDialog: (shiftId: string) => void;
  onAjukanRevisi?: (target: AjukanRevisiTarget) => void;
}

// Enterprise 3-shift catering matrix with clean typography and zero visual noise
export function CateringGrid({
  state,
  dispatch,
  isSavingShiftId,
  onSaveShiftDraft,
  onOpenKirimDialog,
  onAjukanRevisi,
}: CateringGridProps) {
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

  const [activeMobileShiftId, setActiveMobileShiftId] = useState<string>(() => shiftOrder[0] || "");

  // Fallback to first shift if activeMobileShiftId is not valid
  const activeShiftId = shiftOrder.includes(activeMobileShiftId) ? activeMobileShiftId : (shiftOrder[0] || "");
  const activeMobileShift = shifts[activeShiftId];
  const activeShiftDirty = activeMobileShift?.cells
    ? Object.values(activeMobileShift.cells).some((c) => c.isDirty)
    : false;
  const isMobileFinalOrLocked = activeMobileShift
    ? activeMobileShift.status === "final" ||
      activeMobileShift.status === "disetujui" ||
      activeMobileShift.status === "revisi"
    : true;
  const hasMobilePeriod = activeMobileShift ? activeMobileShift.status !== "tidak_ada_periode" : false;
  const activeMobileTotals = calculateShiftTotals(activeMobileShift?.cells);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white border border-black/[0.08] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      {/* MOBILE VIEW (< md): Tab-based single shift view with 0 horizontal scroll */}
      <div className="flex flex-col flex-1 min-h-0 md:hidden">
        {/* Mobile Shift Selector Tabs */}
        <div className="p-2.5 border-b border-black/[0.08] bg-[#F9F9FB] flex flex-col gap-2 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#E5E5EA]/70 rounded-[10px] border border-black/[0.04]">
            {shiftOrder.map((shiftId) => {
              const shift = shifts[shiftId];
              if (!shift) return null;
              const isSelected = activeShiftId === shiftId;
              const hasDirty = shift?.cells
                ? Object.values(shift.cells).some((c) => c.isDirty)
                : false;
              return (
                <button
                  key={shiftId}
                  type="button"
                  onClick={() => setActiveMobileShiftId(shiftId)}
                  className={cn(
                    "py-1.5 px-1 rounded-[7px] text-xs transition-all flex flex-col items-center justify-center cursor-pointer select-none",
                    isSelected
                      ? "bg-white text-text font-bold shadow-[0_1px_2.5px_rgba(0,0,0,0.12)]"
                      : "text-[#6E6E73] hover:text-text font-medium"
                  )}
                >
                  <span className="flex items-center gap-1 leading-tight">
                    {shift.shiftNama}
                    {hasDirty && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" title="Ada draft belum disimpan" />
                    )}
                  </span>
                  <span className="text-[10px] font-normal text-[#86868B] leading-none mt-0.5 truncate">
                    {shift.shiftLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Shift Header Summary Card on Mobile */}
          {activeMobileShift && (
            <div className="bg-white rounded-[9px] border border-black/[0.06] p-2.5 flex flex-col gap-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-text text-sm">
                      {activeMobileShift.shiftNama}
                    </span>
                    <span className="text-xs text-[#86868B]">
                      • {activeMobileShift.shiftLabel}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-text truncate mt-0.5" title={activeMobileShift.vendorNama || "Vendor belum dipilih"}>
                    {activeMobileShift.vendorNama || "Vendor belum ditentukan"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1">
                    <StatusBadge status={activeMobileShift.status} />
                    {activeMobileShift.status !== "belum_input" && activeMobileShift.status !== "tidak_ada_periode" && (
                      <StatusBadge status={activeMobileShift.responVendor} />
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#86868B]">
                    {formatTimeShort(activeMobileShift.jamMulai)} - {formatTimeShort(activeMobileShift.jamSelesai)}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Simpan Draft & Kirim ke Vendor */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-black/[0.05]">
                <div className="text-[10px] text-[#86868B] truncate">
                  {activeMobileShift.lastUpdatedBy ? (
                    <span>PIC: <strong className="font-semibold text-text">{activeMobileShift.lastUpdatedBy}</strong></span>
                  ) : (
                    <span>Belum ada draft</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isMobileFinalOrLocked && hasMobilePeriod && (
                    <>
                      <button
                        type="button"
                        onClick={() => onSaveShiftDraft(activeShiftId)}
                        disabled={isSavingShiftId === activeShiftId || !activeShiftDirty}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-[6px] border transition-all cursor-pointer",
                          activeShiftDirty
                            ? "border-primary/40 bg-white text-primary hover:bg-primary/5 shadow-xs"
                            : "opacity-40 cursor-not-allowed border-[#E5E5EA] bg-[#F5F5F7] text-[#86868B]"
                        )}
                        title="Simpan perubahan porsi pada shift ini"
                      >
                        {isSavingShiftId === activeShiftId ? "Menyimpan..." : "Simpan"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenKirimDialog(activeShiftId)}
                        className="px-3 py-1 text-xs font-semibold rounded-[6px] bg-[#008FD5] text-white hover:bg-[#007AB8] active:bg-[#00689D] shadow-xs cursor-pointer transition-colors"
                        title="Kirim pesanan shift ini ke vendor"
                      >
                        Kirim
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Single-Shift Table */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[340px]">
            <thead className="sticky top-0 z-10 bg-[#F9F9FB] border-b border-black/[0.08] text-[11px] font-semibold text-[#86868B] uppercase tracking-wider shadow-2xs">
              <tr>
                <th className="px-3 py-2">Nama Bagian</th>
                <th className="px-2 py-2 text-right w-[78px]">Karyawan</th>
                <th className="px-2.5 py-2 text-right w-[98px]">Porsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {bagianList.map((bagian) => {
                const cell = activeMobileShift?.cells?.[bagian.id] ?? {
                  karyawan: null,
                  porsi: null,
                  keterangan: "",
                  isCustomPorsi: false,
                  isDirty: false,
                };

                return (
                  <tr key={bagian.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-text text-sm leading-tight">
                          {bagian.nama}
                        </span>
                        <span className="text-[11px] text-text-muted mt-0.5">
                          {bagian.lokasi_antar || "Lokasi utama"}
                        </span>
                      </div>
                    </td>

                    {/* Karyawan input */}
                    <td className="p-1 text-right align-middle w-[78px]">
                      <NumberInputCell
                        value={cell.karyawan}
                        onChange={(v) => handleKaryawanChange(activeShiftId, bagian.id, v)}
                        disabled={isMobileFinalOrLocked}
                        isDirty={cell.isDirty}
                        isConflict={cell.isExternallyModified}
                        ariaLabel={`Karyawan ${bagian.nama} ${activeMobileShift?.shiftNama}`}
                      />
                    </td>

                    {/* Porsi input + action tags */}
                    <td className="p-1 text-right align-middle w-[98px]">
                      <div className="flex items-center gap-1 justify-end">
                        <NumberInputCell
                          value={cell.porsi}
                          onChange={(v) => handlePorsiChange(activeShiftId, bagian.id, v)}
                          disabled={isMobileFinalOrLocked}
                          isDirty={cell.isDirty}
                          isCustom={cell.isCustomPorsi}
                          isConflict={cell.isExternallyModified}
                          ariaLabel={`Porsi ${bagian.nama} ${activeMobileShift?.shiftNama}`}
                        />

                        {/* Revisi button if locked */}
                        {isMobileFinalOrLocked && cell.itemId && (
                          <>
                            {cell.hasPendingRevision ? (
                              <span
                                className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1 py-0.5 rounded leading-none shrink-0"
                                title="Pengajuan revisi sedang menunggu verifikasi"
                              >
                                Rev
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onAjukanRevisi?.({
                                    itemId: cell.itemId!,
                                    bagianId: bagian.id,
                                    bagianNama: bagian.nama,
                                    shiftId: activeShiftId,
                                    shiftNama: activeMobileShift?.shiftNama ?? "",
                                    vendorNama: activeMobileShift?.vendorNama ?? "",
                                    karyawanAwal: cell.karyawan ?? 0,
                                    porsiAwal: cell.porsi ?? 0,
                                  })
                                }
                                title="Ajukan perubahan porsi"
                                className="text-[10px] text-primary font-semibold px-1 py-0.5 rounded hover:bg-primary/5 transition-colors shrink-0 cursor-pointer"
                              >
                                Rev
                              </button>
                            )}
                          </>
                        )}

                        {/* Note indicator */}
                        {cell.keterangan ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveNoteCell({
                                shiftId: activeShiftId,
                                bagianId: bagian.id,
                                bagianNama: bagian.nama,
                                shiftNama: activeMobileShift?.shiftNama ?? "",
                                note: cell.keterangan || "",
                              })
                            }
                            title={`Catatan: ${cell.keterangan}`}
                            className="text-[9px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-1 py-0.5 rounded transition-colors shrink-0 cursor-pointer"
                          >
                            Ket
                          </button>
                        ) : !isMobileFinalOrLocked ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveNoteCell({
                                shiftId: activeShiftId,
                                bagianId: bagian.id,
                                bagianNama: bagian.nama,
                                shiftNama: activeMobileShift?.shiftNama ?? "",
                                note: "",
                              })
                            }
                            title="Tambah catatan untuk baris ini"
                            className="text-[10px] text-text-muted hover:text-text px-1 py-0.5 rounded hover:bg-slate-100 transition-opacity shrink-0 cursor-pointer font-medium"
                          >
                            +
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Mobile Footer Totals */}
            <tfoot className="sticky bottom-0 z-10 bg-[#F9F9FB] border-t border-black/[0.08] shadow-xs">
              <tr className="text-xs font-bold text-text">
                <td className="px-3 py-2.5">
                  <span className="font-bold tracking-tight">Total Porsi</span>
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-[#86868B]">
                  {activeMobileTotals.totalKaryawan}
                </td>
                <td className="px-2.5 py-2.5 text-right font-mono text-primary font-bold">
                  {activeMobileTotals.totalPorsi}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* DESKTOP VIEW (md:flex): Full 3-shift matrix table side-by-side */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-auto flex-col">
        <table className="w-full text-left border-collapse min-w-[980px]">
          {/* Header */}
          <thead className="sticky top-0 z-20 bg-white shadow-2xs">
            {/* Top Header Row: Bagian Title & 3 Shift Headers */}
            <tr className="border-b border-black/[0.08]">
              <th className="sticky left-0 z-30 bg-[#F9F9FB] w-[240px] min-w-[240px] p-3 text-xs font-semibold text-text align-bottom border-r border-black/[0.08]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-text tracking-tight">Data Bagian</span>
                  <span className="text-[11px] font-normal text-[#86868B]">
                    Unit kerja & lokasi antar
                  </span>
                </div>
              </th>

              {shiftOrder.map((shiftId) => {
                const shift = shifts[shiftId];
                if (!shift) return null;
                const shiftDirty = shift?.cells
                  ? Object.values(shift.cells).some((c) => c.isDirty)
                  : false;

                return (
                  <th
                    key={shiftId}
                    colSpan={2}
                    className="p-0 border-r border-black/[0.08] last:border-r-0 bg-white align-top"
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
            <tr className="bg-[#F9F9FB] border-b border-black/[0.08] text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
              <th className="sticky left-0 z-30 bg-[#F9F9FB] px-3 py-2 border-r border-black/[0.08]">
                Nama Bagian
              </th>

              {shiftOrder.map((shiftId) => (
                <React.Fragment key={shiftId}>
                  <th className="px-3 py-2 text-right w-[110px] min-w-[110px] border-r border-black/[0.06]">
                    Karyawan
                  </th>
                  <th className="px-3 py-2 text-right w-[110px] min-w-[110px] border-r border-black/[0.08] last:border-r-0">
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
                className="hover:bg-primary-50/40 transition-colors group"
              >
                {/* Bagian sticky left column */}
                <td className="sticky left-0 z-10 bg-surface group-hover:bg-[#F8FBFE] px-3 py-2 border-r border-border transition-colors">
                  <div className="flex flex-col">
                    <span className="font-semibold text-text text-sm">
                      {bagian.nama}
                    </span>
                    <span className="text-[11px] text-text-muted">
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

                  const cell = shift?.cells?.[bagian.id] ?? {
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
                        <div className="flex items-center gap-1.5 justify-end">
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
                                  className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded leading-none shrink-0"
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
                                  className="text-[10px] text-primary hover:text-[#002850] font-semibold px-1.5 py-0.5 rounded hover:bg-primary/5 transition-colors shrink-0 cursor-pointer"
                                >
                                  Revisi
                                </button>
                              )}
                            </>
                          )}

                          {/* Note indicator: Clean text tag if note exists, or subtle on row hover */}
                          {cell.keterangan ? (
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
                              title={`Catatan: ${cell.keterangan}`}
                              className="text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded transition-colors shrink-0 cursor-pointer"
                            >
                              Catatan
                            </button>
                          ) : !isLocked ? (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveNoteCell({
                                  shiftId,
                                  bagianId: bagian.id,
                                  bagianNama: bagian.nama,
                                  shiftNama: shift.shiftNama,
                                  note: "",
                                })
                              }
                              title="Tambah catatan untuk baris ini"
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-text-muted hover:text-text px-1.5 py-0.5 rounded hover:bg-slate-100 transition-opacity shrink-0 cursor-pointer font-medium"
                            >
                              +
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {/* Sticky Footer: Total Row */}
          <tfoot className="sticky bottom-0 z-20 bg-[#F9F9FB] border-t border-black/[0.08] shadow-xs">
            <tr className="text-xs font-bold text-text">
              <td className="sticky left-0 z-30 bg-[#F9F9FB] px-3 py-2.5 border-r border-black/[0.08]">
                <span className="font-bold tracking-tight">Total Porsi</span>
              </td>

              {shiftOrder.map((shiftId) => {
                const shift = shifts[shiftId];
                if (!shift) return null;
                const totals = calculateShiftTotals(shift?.cells);

                return (
                  <React.Fragment key={shiftId}>
                    <td className="px-3 py-2.5 text-right font-mono text-[#86868B] border-r border-black/[0.06]">
                      {totals.totalKaryawan}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-primary font-bold border-r border-black/[0.08] last:border-r-0">
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
          <div className="space-y-3 pt-2">
            <textarea
              rows={3}
              value={activeNoteCell.note}
              onChange={(e) =>
                setActiveNoteCell({
                  ...activeNoteCell,
                  note: e.target.value,
                })
              }
              placeholder="Contoh: 2 porsi vegetarian / tambahan lembur kapal..."
              className="w-full px-3 py-2 text-xs rounded-[8px] border border-[#D1D1D6] bg-white text-text shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all resize-none"
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setActiveNoteCell(null)}
                className="h-8.5 px-4 text-xs font-semibold rounded-[8px] bg-[#E5E5EA]/80 hover:bg-[#DCDCE2] text-[#1D1D1F] transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="h-8.5 px-4 text-xs font-semibold rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
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
