"use client";

import React, { useState, useCallback, useTransition } from "react";
import {
  Clock,
  Truck,
  CheckCircle2,
  ChevronRight,
  Eye,
  AlertCircle,
} from "lucide-react";
import {
  VendorProgresItem,
  updateProgresVendorAction,
  getVendorProgresList,
} from "@/lib/actions/vendor-portal";
import { VendorProgress } from "@/lib/types";
import { getNextProgressStep } from "@/lib/vendor/progress";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { VendorDetailInspector } from "./VendorDetailInspector";
import { formatNumber } from "@/lib/format";

interface ProgresWorkflowCardProps {
  orders: VendorProgresItem[];
}

const PROGRESS_STEPS: Array<{ key: VendorProgress; label: string }> = [
  { key: "menunggu", label: "Menunggu" },
  { key: "dipersiapkan", label: "Dipersiapkan" },
  { key: "dikirim", label: "Dikirim" },
  { key: "sampai", label: "Sampai" },
  { key: "selesai", label: "Selesai" },
];

// Stepper workflow component managing sequential delivery progression
export function ProgresWorkflowCard({ orders: initialOrders }: ProgresWorkflowCardProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<VendorProgresItem[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<VendorProgresItem | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Advance progress dialog state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [targetOrder, setTargetOrder] = useState<VendorProgresItem | null>(null);
  const [catatan, setCatatan] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshOrders = useCallback(async () => {
    try {
      const fresh = await getVendorProgresList();
      setOrders(fresh);
    } catch (err) {
      console.error("Failed to refresh progres list", err);
    }
  }, []);

  // Subscribe to real-time catering orders to update progress state in-place
  useRealtimeTable({
    table: "catering_orders",
    onUpdate: (newOrder: any) => {
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.orderId === newOrder.id) {
            const progresVendor = (newOrder.progres_vendor ?? ord.progresVendor) as VendorProgress;
            const nextStep = getNextProgressStep(progresVendor);
            return {
              ...ord,
              progresVendor,
              progresVendorAt: newOrder.progres_vendor_at ?? ord.progresVendorAt,
              catatanVendor:
                newOrder.catatan_vendor !== undefined
                  ? newOrder.catatan_vendor
                  : ord.catatanVendor,
              totalPorsi:
                typeof newOrder.total_porsi === "number"
                  ? newOrder.total_porsi
                  : ord.totalPorsi,
              nextStep,
            };
          }
          return ord;
        })
      );
    },
    onInsert: () => {
      refreshOrders();
    },
    onReconnect: () => {
      refreshOrders();
    },
  });

  const handleOpenConfirm = (order: VendorProgresItem) => {
    if (order.nextStep.isComplete || !order.nextStep.next) return;
    setTargetOrder(order);
    setCatatan("");
    setConfirmModalOpen(true);
  };

  const handleAdvanceProgress = () => {
    if (!targetOrder || !targetOrder.nextStep.next) return;

    startTransition(async () => {
      const targetStep = targetOrder.nextStep.next!;
      const res = await updateProgresVendorAction({
        orderId: targetOrder.orderId,
        targetProgres: targetStep,
        catatan,
      });

      if (res.success) {
        toast({
          title: "Progres Berhasil Diperbarui",
          description: res.message || "Tahap progres pengiriman berhasil dimajukan.",
          variant: "success",
        });
        setOrders((prev) =>
          prev.map((ord) => {
            if (ord.orderId === targetOrder.orderId) {
              return {
                ...ord,
                progresVendor: targetStep,
                nextStep: getNextProgressStep(targetStep),
                catatanVendor: catatan || ord.catatanVendor,
              };
            }
            return ord;
          })
        );
        setConfirmModalOpen(false);
      } else {
        toast({
          title: "Gagal Memperbarui Progres",
          description: res.error || "Terjadi kesalahan saat memajukan progres.",
          variant: "danger",
        });
      }
    });
  };

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center bg-surface border border-border rounded-[10px] p-6 text-text-muted text-[13px]">
        <Truck className="w-8 h-8 text-primary mx-auto mb-2 opacity-60" />
        <p className="font-semibold text-text">Belum Ada Pesanan yang Berjalan</p>
        <p className="text-[12px] text-text-muted mt-1">
          Hanya pesanan yang sudah disanggupi yang akan muncul pada alur pemantauan progres ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
      {orders.map((order) => {
        const currentStepIndex = order.nextStep.stepIndex;
        const isFinished = order.progresVendor === "selesai";

        return (
          <div
            key={order.orderId}
            className={`bg-surface border rounded-[10px] p-4 sm:p-5 shadow-xs flex flex-col gap-4 transition-all ${
              isFinished ? "border-border/80 opacity-90" : "border-border hover:border-primary/40"
            }`}
          >
            {/* Top Row: Shift info, date, portions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-text">
                    {order.shiftNama} ({order.shiftLabel})
                  </span>
                  <span className="text-[12px] font-medium text-text-muted">
                    Tanggal: <strong className="text-text">{order.tanggal}</strong>
                  </span>
                  {isFinished && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] bg-[#EBF7EE] text-[#1E8E3E] border border-[#C8E9D0]">
                      Selesai
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-muted flex items-center gap-1 mt-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                  Batas Jam Tiba: <strong className="text-text font-sans">{order.batasTiba} WIB</strong> ({order.shiftJam})
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                <span className="text-xs text-text-muted sm:hidden">Total Kuota:</span>
                <div className="text-right">
                  <span className="text-[11px] text-text-muted hidden sm:block">Total Kuota</span>
                  <span className="text-lg font-bold text-primary tabular-nums">
                    {formatNumber(order.totalPorsi)}
                  </span>
                  <span className="text-[11px] text-text-muted ml-1">porsi</span>
                </div>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="py-2">
              <div className="grid grid-cols-5 gap-1 sm:gap-2">
                {PROGRESS_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  let stepBg = "bg-[#F1F3F4] text-text-muted border-border";
                  if (isDone) {
                    stepBg = "bg-[#EBF7EE] text-[#1E8E3E] border-[#C8E9D0]";
                  } else if (isCurrent) {
                    stepBg = "bg-[#0B5A94] text-white border-[#0B5A94] shadow-xs";
                  }

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-full py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-[6px] border text-[10px] sm:text-[12px] font-semibold transition-all flex items-center justify-center gap-0.5 sm:gap-1 ${stepBg}`}
                      >
                        {isDone && <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />}
                        <span className="truncate">{step.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Row */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between pt-2 border-t border-border gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(order);
                  setInspectorOpen(true);
                }}
                className="h-9 sm:min-h-[44px] px-3 py-1.5 bg-surface hover:bg-black/5 text-text border border-border rounded-[8px] text-xs sm:text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-muted" />
                Rincian Bagian ({order.items.length})
              </button>

              <div className="flex items-center justify-end gap-2">
                {!isFinished && order.nextStep.next && (
                  <button
                    type="button"
                    onClick={() => handleOpenConfirm(order)}
                    className="w-full sm:w-auto h-9 sm:min-h-[44px] px-4 py-1.5 bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white rounded-[8px] text-xs sm:text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <span>{order.nextStep.nextLabel}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {isFinished && (
                  <span className="text-[13px] text-[#1E8E3E] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Seluruh Tahap Selesai
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Detail Inspector Drawer */}
      <VendorDetailInspector
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        orderInfo={
          selectedOrder
            ? {
                tanggal: selectedOrder.tanggal,
                shiftNama: selectedOrder.shiftNama,
                shiftLabel: selectedOrder.shiftLabel,
                shiftJam: selectedOrder.shiftJam,
                batasTiba: selectedOrder.batasTiba,
                totalPorsi: selectedOrder.totalPorsi,
                status: selectedOrder.status,
                responVendor: selectedOrder.responVendor,
                progresVendor: selectedOrder.progresVendor,
                catatanGa: selectedOrder.catatanGa,
                catatanVendor: selectedOrder.catatanVendor,
                items: selectedOrder.items,
              }
            : null
        }
      />

      {/* Progress Advance Confirmation Dialog */}
      <Dialog
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        title={targetOrder?.nextStep.actionTitle || "Pembaruan Tahap Progres"}
        description={`Pastikan kesiapan operasional sebelum memajukan tahap progres pesanan ${targetOrder?.shiftNama || ""} (${targetOrder?.tanggal || ""}) ke status "${targetOrder?.nextStep.nextLabel || ""}".`}
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-[#E8F2FA] border border-[#BBD9EE] rounded-[8px] text-[12px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#0B5A94] shrink-0 mt-0.5" />
            <p className="text-[#0B5A94]">
              Tahapan progres hanya dapat bergerak maju dan tidak dapat dikembalikan ke tahap sebelumnya.
            </p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-text mb-1">
              Catatan Progres (Opsional)
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Pengantaran menggunakan kendaraan armada 1, driver Bapak Anton..."
              rows={3}
              className="w-full text-[13px] px-3 py-2 border border-border rounded-[8px] focus:outline-hidden focus:ring-1 focus:ring-primary min-h-[44px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setConfirmModalOpen(false)}
              disabled={isPending}
              className="px-4 py-2 text-[13px] font-medium text-text hover:bg-black/5 rounded-[8px] border border-border min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleAdvanceProgress}
              disabled={isPending}
              className="px-4 py-2 text-[13px] font-medium text-white bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] rounded-[8px] min-h-[44px] cursor-pointer transition-colors shadow-xs"
            >
              {isPending ? "Memproses..." : "Konfirmasi Lanjut"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
