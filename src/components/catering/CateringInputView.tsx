"use client";

import React, { useReducer, useState, useEffect, useCallback } from "react";
import {
  gridReducer,
  calculateShiftTotals,
  getMissingBagian,
  getDirtyItems,
} from "@/lib/catering/grid-reducer";

import {
  DateCateringData,
  getDateCateringData,
  simpanCateringDraftAction,
  kirimCateringAction,
} from "@/lib/actions/catering";
import { CateringDateToolbar } from "./CateringDateToolbar";
import { CateringGrid } from "./CateringGrid";
import { KirimVendorDialog } from "./KirimVendorDialog";
import { AjukanRevisiDialog, AjukanRevisiTarget } from "./AjukanRevisiDialog";
import { ajukanRevisiAction } from "@/lib/actions/revisi";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ArrowRight } from "lucide-react";
import Link from "next/link";



interface CateringInputViewProps {
  initialData: DateCateringData;
}

// Complete 3-shift catering daily input container with reducer state and safety guards
export function CateringInputView({ initialData }: CateringInputViewProps) {
  const { toast } = useToast();

  const [state, dispatch] = useReducer(gridReducer, {
    tanggal: initialData.tanggal,
    bagianList: initialData.bagianList,
    shifts: initialData.shifts,
    shiftOrder: initialData.shiftOrder,
    isDirty: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingShiftId, setIsSavingShiftId] = useState<string | null>(null);

  // State for Date Navigation Guard Dialog
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // State for Kirim ke Vendor Dialog
  const [kirimShiftId, setKirimShiftId] = useState<string | null>(null);
  const [isSendingVendor, setIsSendingVendor] = useState(false);

  // State for Ajukan Revisi Dialog
  const [revisiTarget, setRevisiTarget] = useState<AjukanRevisiTarget | null>(null);
  const [isSubmittingRevisi, setIsSubmittingRevisi] = useState(false);

  // Check if date has periods
  const currentShiftValues = Object.values(state.shifts);
  const hasValidPeriods = currentShiftValues.some(
    (s) => s.status !== "tidak_ada_periode"
  );

  // Load data for a specific date
  const loadDateData = useCallback(
    async (nextDate: string) => {
      try {
        setIsLoading(true);
        const data = await getDateCateringData(nextDate);
        dispatch({
          type: "INITIALIZE_GRID",
          payload: {
            tanggal: data.tanggal,
            bagianList: data.bagianList,
            shifts: data.shifts,
            shiftOrder: data.shiftOrder,
          },
        });
      } catch (err: unknown) {
        console.error("Failed to load date data:", err);
        const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data catering.";
        toast({
          title: "Gagal memuat data",
          description: message,
          variant: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  // Handle date change request with unsaved changes protection
  const handleDateChangeRequest = (nextDate: string) => {
    if (nextDate === state.tanggal) return;

    if (state.isDirty) {
      setPendingDate(nextDate);
      setShowUnsavedDialog(true);
    } else {
      loadDateData(nextDate);
    }
  };

  const handleConfirmDiscardChanges = () => {
    if (pendingDate) {
      loadDateData(pendingDate);
      setPendingDate(null);
    }
    setShowUnsavedDialog(false);
  };

  // Browser beforeunload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.isDirty]);

  // Window focus auto-refresh and remote conflict detection
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const fresh = await getDateCateringData(state.tanggal);
        dispatch({
          type: "APPLY_EXTERNAL_SYNC",
          payload: { shifts: fresh.shifts },
        });
      } catch (e) {
        console.error("Window focus sync error", e);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [state.tanggal]);

  // Save draft for an isolated shift
  const handleSaveShiftDraft = async (shiftId: string) => {
    const shift = state?.shifts?.[shiftId];
    if (!shift || !shift.periodId) {
      toast({
        title: "Penyimpanan gagal",
        description: "Periode untuk shift ini tidak ditemukan.",
        variant: "danger",
      });
      return;
    }

    const dirtyItems = getDirtyItems(shift?.cells);
    if (dirtyItems.length === 0) {
      toast({
        title: "Tidak ada perubahan",
        description: "Seluruh data bagian pada shift ini telah tersimpan.",
      });
      return;
    }

    try {
      setIsSavingShiftId(shiftId);
      const res = await simpanCateringDraftAction({
        periodId: shift.periodId,
        shiftId: shift.shiftId,
        items: dirtyItems,
      });

      if (!res.success) {
        toast({
          title: "Gagal menyimpan draft",
          description: res.error || "Terjadi kesalahan pada sistem.",
          variant: "danger",
        });
        return;
      }

      dispatch({
        type: "MARK_SHIFT_SAVED",
        payload: {
          shiftId,
          orderId: res.data!.orderId,
          status: "draft",
          lastUpdatedBy: res.data?.updatedBy || "Admin GA",
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      toast({
        title: "Draft tersimpan",
        description: `Perubahan ${dirtyItems.length} bagian ${shift.shiftNama} berhasil disimpan.`,
        variant: "success",
      });
    } catch (err: unknown) {
      console.error("Save draft error:", err);
      const message = err instanceof Error ? err.message : "Gagal menghubungi server.";
      toast({
        title: "Gagal menyimpan",
        description: message,
        variant: "danger",
      });
    } finally {
      setIsSavingShiftId(null);
    }
  };

  // Submit order to vendor
  const handleConfirmKirimVendor = async (catatan: string) => {
    if (!kirimShiftId) return;
    const shift = state?.shifts?.[kirimShiftId];
    if (!shift || !shift.periodId) return;

    try {
      setIsSendingVendor(true);
      const dirtyItems = getDirtyItems(shift?.cells);

      const res = await kirimCateringAction({
        periodId: shift.periodId,
        orderId: shift.orderId,
        items: dirtyItems,
        catatan,
      });

      if (!res.success) {
        toast({
          title: "Gagal mengirim pesanan",
          description: res.error || "Terjadi kendala saat memproses pesanan.",
          variant: "danger",
        });
        return;
      }

      setKirimShiftId(null);
      toast({
        title: "Pesanan berhasil dikirim",
        description: `Kebutuhan catering ${shift.shiftNama} telah difinalisasi dan dikirim ke vendor.`,
        variant: "success",
      });

      // Reload fresh state for this date
      await loadDateData(state.tanggal);
    } catch (err: unknown) {
      console.error("Kirim vendor error:", err);
      const message = err instanceof Error ? err.message : "Gagal memproses pengiriman ke vendor.";
      toast({
        title: "Kesalahan pengiriman",
        description: message,
        variant: "danger",
      });
    } finally {
      setIsSendingVendor(false);
    }
  };

  // Submit revision for a specific item
  const handleConfirmAjukanRevisi = async (params: {
    itemId: string;
    karyawanBaru: number;
    porsiBaru: number;
    alasan: string;
  }) => {
    try {
      setIsSubmittingRevisi(true);
      const res = await ajukanRevisiAction(params);
      if (!res.success) {
        toast({
          title: "Pengajuan gagal",
          description: res.error || "Gagal mengajukan revisi porsi.",
          variant: "danger",
        });
        return;
      }

      setRevisiTarget(null);
      toast({
        title: "Revisi berhasil diajukan",
        description: "Pengajuan revisi telah tercatat dan menunggu verifikasi.",
        variant: "success",
      });

      // Reload fresh state
      await loadDateData(state.tanggal);
    } catch (err: unknown) {
      console.error("Revisi submission error:", err);
      const message = err instanceof Error ? err.message : "Gagal memproses pengajuan revisi.";
      toast({
        title: "Kesalahan pengajuan",
        description: message,
        variant: "danger",
      });
    } finally {
      setIsSubmittingRevisi(false);
    }
  };

  const activeKirimShift = kirimShiftId ? state?.shifts?.[kirimShiftId] : null;
  const missingBagianForKirim = activeKirimShift
    ? getMissingBagian(state?.bagianList || [], activeKirimShift?.cells)
    : [];
  const totalsForKirim = activeKirimShift
    ? calculateShiftTotals(activeKirimShift?.cells)
    : { totalKaryawan: 0, totalPorsi: 0 };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* Date navigation bar */}
      <CateringDateToolbar
        tanggal={state.tanggal}
        onDateChange={handleDateChangeRequest}
        isLoading={isLoading}
        onRefresh={() => loadDateData(state.tanggal)}
        isDirty={state.isDirty}
      />

      {/* Main Grid or Empty State */}
      {!hasValidPeriods ? (
        <div className="flex-1 min-h-0 flex flex-col justify-center items-center bg-surface border border-border rounded-[10px] p-8 text-center shadow-xs">
          <EmptyState
            title="Belum Ada Jadwal Periode Catering"
            description={`Jadwal shift dan penugasan vendor untuk tanggal ${state.tanggal} belum dibuat. Buat jadwal terlebih dahulu di menu Periode Catering.`}
            action={
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/periode"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-[8px] bg-primary text-white hover:bg-[#0E63A1] shadow-xs"
                >
                  <span>Buka Periode Catering</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <CateringGrid
          state={state}
          dispatch={dispatch}
          isSavingShiftId={isSavingShiftId}
          onSaveShiftDraft={handleSaveShiftDraft}
          onOpenKirimDialog={(shiftId) => setKirimShiftId(shiftId)}
          onAjukanRevisi={(target) => setRevisiTarget(target)}
        />
      )}

      {/* Unsaved changes confirmation dialog when switching dates */}
      <ConfirmDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        title="Perubahan Belum Tersimpan"
        description="Anda memiliki perubahan data catering yang belum disimpan pada tanggal ini. Berpindah tanggal sekarang akan membatalkan perubahan tersebut. Apakah Anda yakin ingin melanjutkan?"
        confirmLabel="Buang Perubahan & Pindah"
        cancelLabel="Tetap di Halaman Ini"
        variant="warning"
        onConfirm={handleConfirmDiscardChanges}
      />

      {/* Send to vendor dialog */}
      <KirimVendorDialog
        open={Boolean(kirimShiftId)}
        onOpenChange={(open) => !open && setKirimShiftId(null)}
        shift={activeKirimShift}
        missingBagian={missingBagianForKirim}
        totals={totalsForKirim}
        onConfirm={handleConfirmKirimVendor}
        isProcessing={isSendingVendor}
      />

      {/* Ajukan Revisi Dialog */}
      <AjukanRevisiDialog
        open={Boolean(revisiTarget)}
        onOpenChange={(open) => !open && setRevisiTarget(null)}
        target={revisiTarget}
        onSubmit={handleConfirmAjukanRevisi}
        isProcessing={isSubmittingRevisi}
      />
    </div>
  );
}
