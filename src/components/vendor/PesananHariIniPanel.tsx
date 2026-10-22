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
    <div className="bg-surface border border-border rounded-[10px] p-4 sm:p-5 flex flex-col flex-1 min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2 shrink-0">
        <div>
          <h2 className="text-base font-bold text-text">
            Pesanan Hari Ini
          </h2>
          <p className="text-[13px] text-text-muted mt-0.5">
            Pelaksanaan jadwal 3 shift tanggal <span className="font-medium text-text">{todayFormatted}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/vendor/permintaan"
            className="text-[13px] font-medium text-primary hover:underline flex items-center gap-1 min-h-[44px] px-2"
          >
            Lihat Seluruh Permintaan
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 flex-1 min-h-0 overflow-y-auto">
        {shifts.map((shift) => {
          return (
            <div
              key={shift.shiftId}
              className={`rounded-[10px] border p-4 flex flex-col justify-between transition-all ${
                shift.hasOrder
                  ? "bg-surface border-border hover:border-primary/40 shadow-xs"
                  : "bg-[#F8FAFC] border-dashed border-border/80"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-text">
                        {shift.shiftNama}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#E8F2FA] text-[#0B5A94]">
                        {shift.shiftLabel}
                      </span>
                    </div>
                    <span className="text-[12px] text-text-muted flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      {shift.shiftJam} (Batas tiba: {shift.batasTiba})
                    </span>
                  </div>

                  {shift.hasOrder && (
                    <div className="text-right">
                      <span className="text-[11px] text-text-muted block">Total</span>
                      <span className="text-base font-bold text-primary">
                        {formatNumber(shift.totalPorsi)}
                      </span>
                      <span className="text-[11px] text-text-muted ml-0.5">porsi</span>
                    </div>
                  )}
                </div>

                {/* Status Badges or Empty */}
                {shift.hasOrder ? (
                  <div className="mt-4 pt-3 border-t border-border space-y-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-text-muted">Respon:</span>
                      <StatusBadge status={shift.responVendor || "menunggu"} />
                    </div>

                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-text-muted">Progres:</span>
                      <StatusBadge status={shift.progresVendor || "menunggu"} />
                    </div>

                    {shift.catatanGa && (
                      <p className="text-[11px] text-text-muted line-clamp-2 bg-[#F8FAFC] p-2 rounded-[6px] border border-border/60">
                        {shift.catatanGa}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[12px] text-text-muted">
                    Tidak ada jadwal pesanan untuk shift ini.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {shift.hasOrder && (
                <div className="mt-4 pt-3 border-t border-border flex flex-col gap-2">
                  {shift.responVendor === "menunggu" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenResponseDialog(shift, true)}
                        className="w-full min-h-[44px] px-3 py-2 bg-[#1E8E3E] hover:bg-[#167031] text-white rounded-[8px] text-[12px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Sanggupi
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenResponseDialog(shift, false)}
                        className="w-full min-h-[44px] px-3 py-2 bg-surface hover:bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] rounded-[8px] text-[12px] font-medium flex items-center justify-center cursor-pointer transition-colors"
                      >
                        Tidak Sanggup
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenInspector(shift)}
                      className="flex-1 min-h-[44px] px-3 py-2 bg-surface hover:bg-black/5 text-text border border-border rounded-[8px] text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Eye className="w-4 h-4 text-text-muted" />
                      Rincian
                    </button>

                    {shift.responVendor === "disanggupi" && (
                      <Link
                        href="/vendor/progres"
                        className="flex-1 min-h-[44px] px-3 py-2 bg-[#0B5A94] hover:bg-[#084572] text-white rounded-[8px] text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Truck className="w-4 h-4" />
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
