"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Clock, Eye, CheckCircle2, ChevronRight, Truck } from "lucide-react";
import {
  VendorShiftOrder,
  responPeriodeVendorAction,
} from "@/lib/actions/vendor-portal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VendorDetailInspector } from "./VendorDetailInspector";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { formatNumber } from "@/lib/format";

interface PesananHariIniPanelProps {
  shifts: VendorShiftOrder[];
  todayFormatted: string;
}

// 3-shift operational order panel displaying today's catering workload and quick actions
export function PesananHariIniPanel({
  shifts: initialShifts,
  todayFormatted,
}: PesananHariIniPanelProps) {
  const { toast } = useToast();
  const [shifts, setShifts] = useState<VendorShiftOrder[]>(initialShifts);
  const [selectedShift, setSelectedShift] = useState<VendorShiftOrder | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Response dialog state
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [targetOrder, setTargetOrder] = useState<VendorShiftOrder | null>(null);
  const [isSanggup, setIsSanggup] = useState(true);
  const [catatan, setCatatan] = useState("");
  const [isPending, startTransition] = useTransition();

  // Subscribe to real-time catering order updates
  useRealtimeTable({
    table: "catering_orders",
    onUpdate: (newOrder: any) => {
      setShifts((prev) =>
        prev.map((s) => {
          if (s.orderId === newOrder.id) {
            return {
              ...s,
              status: newOrder.status ?? s.status,
              responVendor: newOrder.respon_vendor ?? s.responVendor,
              progresVendor: newOrder.progres_vendor ?? s.progresVendor,
              totalPorsi:
                typeof newOrder.total_porsi === "number"
                  ? newOrder.total_porsi
                  : s.totalPorsi,
            };
          }
          return s;
        })
      );
    },
  });

  const handleOpenInspector = (shift: VendorShiftOrder) => {
    setSelectedShift(shift);
    setInspectorOpen(true);
  };

  const handleOpenResponseDialog = (shift: VendorShiftOrder, sanggup: boolean) => {
    setTargetOrder(shift);
    setIsSanggup(sanggup);
    setCatatan("");
    setResponseModalOpen(true);
  };

  const handleSubmitResponse = () => {
    if (!targetOrder || !targetOrder.orderId) return;

    if (!isSanggup && catatan.trim().length === 0) {
      toast({
        title: "Catatan Wajib Diisi",
        description: "Mohon isi alasan tidak menyanggupi pesanan.",
        variant: "danger",
      });
      return;
    }

    startTransition(async () => {
      const res = await responPeriodeVendorAction({
        orderId: targetOrder.orderId!,
        sanggup: isSanggup,
        catatan,
      });

      if (res.success) {
        toast({
          title: isSanggup ? "Pesanan Disanggupi" : "Respon Disimpan",
          description: res.message || "Status respon kesanggupan berhasil diperbarui.",
          variant: "success",
        });
        setShifts((prev) =>
          prev.map((s) =>
            s.orderId === targetOrder.orderId
              ? {
                  ...s,
                  responVendor: isSanggup ? "disanggupi" : "tidak_sanggup",
                  catatanVendor: catatan || null,
                }
              : s
          )
        );
        setResponseModalOpen(false);
      } else {
        toast({
          title: "Gagal Menyimpan Respon",
          description: res.error || "Terjadi kesalahan saat memproses respon.",
          variant: "danger",
        });
      }
    });
  };

  return (
    <div className="bg-white border border-black/[0.08] rounded-[12px] p-4 sm:p-5 flex flex-col flex-1 min-h-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#E5E5EA] gap-2 shrink-0">
        <div>
          <h2 className="text-base font-bold text-text tracking-tight">
            Pesanan Hari Ini
          </h2>
          <p className="text-xs text-[#86868B] mt-0.5">
            Pelaksanaan jadwal 3 shift tanggal <span className="font-semibold text-text">{todayFormatted}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/vendor/permintaan"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 min-h-[36px] px-2"
          >
            Lihat Seluruh Permintaan
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4 flex-1 min-h-0 overflow-y-auto">
        {shifts.map((shift) => {
          return (
            <div
              key={shift.shiftId}
              className={`rounded-[12px] border p-4 flex flex-col justify-between transition-all ${
                shift.hasOrder
                  ? "bg-white border-black/[0.08] hover:border-primary/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                  : "bg-[#F9F9FB] border border-black/[0.08]"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-text tracking-tight">
                        {shift.shiftNama}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px] bg-[#E5E5EA]/70 text-[#1D1D1F]">
                        {shift.shiftLabel}
                      </span>
                    </div>
                    <span className="text-xs text-[#86868B] flex items-center gap-1 mt-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#86868B] shrink-0" />
                      {shift.shiftJam} (Batas: {shift.batasTiba})
                    </span>
                  </div>

                  {shift.hasOrder && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#86868B] block">Total</span>
                      <span className="text-base font-bold text-primary tabular-nums">
                        {formatNumber(shift.totalPorsi)}
                      </span>
                      <span className="text-[11px] text-[#86868B] ml-0.5">porsi</span>
                    </div>
                  )}
                </div>

                {/* Status Badges or Empty */}
                {shift.hasOrder ? (
                  <div className="mt-3.5 pt-3 border-t border-[#E5E5EA] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#86868B]">Respon:</span>
                      <StatusBadge status={shift.responVendor || "menunggu"} />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#86868B]">Progres:</span>
                      <StatusBadge status={shift.progresVendor || "menunggu"} />
                    </div>

                    {shift.catatanGa && (
                      <p className="text-[11px] text-[#86868B] line-clamp-2 bg-[#F9F9FB] p-2 rounded-[6px] border border-black/[0.06]">
                        {shift.catatanGa}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#86868B]">
                    Tidak ada jadwal pesanan untuk shift ini.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {shift.hasOrder && (
                <div className="mt-4 pt-3 border-t border-[#E5E5EA] flex flex-col gap-2">
                  {shift.responVendor === "menunggu" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenResponseDialog(shift, true)}
                        className="w-full h-8.5 px-3 bg-[#34C759] hover:bg-[#2EB84F] text-white rounded-[8px] text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sanggupi
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenResponseDialog(shift, false)}
                        className="w-full h-8.5 px-3 bg-white hover:bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30 rounded-[8px] text-xs font-semibold flex items-center justify-center cursor-pointer transition-all"
                      >
                        Tidak Sanggup
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenInspector(shift)}
                      className="flex-1 h-8 px-3 rounded-[8px] bg-[#E5E5EA]/80 hover:bg-[#DCDCE2] text-[#1D1D1F] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#86868B]" />
                      Rincian
                    </button>

                    {shift.responVendor === "disanggupi" && (
                      <Link
                        href="/vendor/progres"
                        className="flex-1 h-8 px-3 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Progres
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail Inspector Drawer */}
      <VendorDetailInspector
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        orderInfo={
          selectedShift && selectedShift.hasOrder
            ? {
                tanggal: selectedShift.tanggal || todayFormatted,
                shiftNama: selectedShift.shiftNama,
                shiftLabel: selectedShift.shiftLabel,
                shiftJam: selectedShift.shiftJam,
                batasTiba: selectedShift.batasTiba,
                totalPorsi: selectedShift.totalPorsi,
                status: selectedShift.status || "final",
                responVendor: selectedShift.responVendor,
                progresVendor: selectedShift.progresVendor,
                catatanGa: selectedShift.catatanGa,
                catatanVendor: selectedShift.catatanVendor,
                items: selectedShift.items,
              }
            : null
        }
      />

      {/* Response Confirmation Dialog */}
      <Dialog
        open={responseModalOpen}
        onOpenChange={setResponseModalOpen}
        title={
          isSanggup
            ? `Menyanggupi Pesanan ${targetOrder?.shiftNama || ""}`
            : `Menolak / Tidak Menyanggupi ${targetOrder?.shiftNama || ""}`
        }
        description={
          isSanggup
            ? "Apakah Anda yakin dapat memproduksi dan mengirim pesanan ini tepat waktu sesuai batas jam tiba shift?"
            : "Pemberitahuan tidak menyanggupi akan segera diteruskan ke General Affairs untuk tindak lanjut re-alokasi."
        }
      >
        <div className="space-y-4 pt-2">
          {targetOrder && (
            <div className="p-3 bg-[#F8FAFC] border border-border rounded-[8px] text-[13px] space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Total Alokasi:</span>
                <span className="font-bold text-text">{formatNumber(targetOrder.totalPorsi)} porsi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Batas Jam Tiba:</span>
                <span className="font-semibold text-text">{targetOrder.batasTiba} WIB</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-text mb-1">
              Catatan Vendor {isSanggup ? "(Opsional)" : "(Wajib Diisi)"}
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={
                isSanggup
                  ? "Tambahkan catatan kesanggupan atau konfirmasi pengiriman jika ada..."
                  : "Tuliskan kendala kapasitas produksi atau alasan tidak sanggup..."
              }
              rows={3}
              className="w-full text-[13px] px-3 py-2 border border-border rounded-[8px] focus:outline-hidden focus:ring-1 focus:ring-primary min-h-[44px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setResponseModalOpen(false)}
              disabled={isPending}
              className="px-4 py-2 text-[13px] font-medium text-text hover:bg-black/5 rounded-[8px] border border-border min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmitResponse}
              disabled={isPending}
              className={`px-4 py-2 text-[13px] font-medium text-white rounded-[8px] min-h-[44px] cursor-pointer transition-colors ${
                isSanggup
                  ? "bg-[#1E8E3E] hover:bg-[#167031]"
                  : "bg-[#C5221F] hover:bg-[#A51D1A]"
              }`}
            >
              {isPending ? "Memproses..." : isSanggup ? "Konfirmasi Sanggup" : "Kirim Penolakan"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
