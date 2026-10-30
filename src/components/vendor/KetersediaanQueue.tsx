"use client";

import React, { useState, useCallback, useTransition } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  MapPin,
  Eye,
} from "lucide-react";
import {
  VendorPendingOrderConfirmation,
  VendorPendingRevisionConfirmation,
  responPeriodeVendorAction,
  responRevisiVendorAction,
  getVendorKetersediaanQueue,
} from "@/lib/actions/vendor-portal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { VendorDetailInspector } from "./VendorDetailInspector";
import { formatNumber, formatDelta } from "@/lib/format";

interface KetersediaanQueueProps {
  orders: VendorPendingOrderConfirmation[];
  revisions: VendorPendingRevisionConfirmation[];
}

// Queue interface for handling unresponded catering requests and revisions
export function KetersediaanQueue({
  orders: initialOrders,
  revisions: initialRevisions,
}: KetersediaanQueueProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("orders");
  const [selectedOrder, setSelectedOrder] = useState<VendorPendingOrderConfirmation | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const [orders, setOrders] = useState<VendorPendingOrderConfirmation[]>(initialOrders);
  const [revisions, setRevisions] = useState<VendorPendingRevisionConfirmation[]>(initialRevisions);

  // Response dialog state
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"order" | "revision">("order");
  const [targetOrderId, setTargetOrderId] = useState<string>("");
  const [targetRevisionId, setTargetRevisionId] = useState<string>("");
  const [targetTitle, setTargetTitle] = useState<string>("");
  const [isSanggup, setIsSanggup] = useState(true);
  const [catatan, setCatatan] = useState("");
  const [isPending, startTransition] = useTransition();

  const refreshQueue = useCallback(async () => {
    try {
      const queue = await getVendorKetersediaanQueue();
      setOrders(queue.orders);
      setRevisions(queue.revisions);
    } catch (err) {
      console.error("Failed to refresh vendor queue", err);
    }
  }, []);

  // Subscribe to real-time catering orders to remove responded orders or add incoming requests
  useRealtimeTable({
    table: "catering_orders",
    onUpdate: (newOrder: any) => {
      if (newOrder.respon_vendor && newOrder.respon_vendor !== "belum_respon") {
        setOrders((prev) => prev.filter((o) => o.orderId !== newOrder.id));
      } else {
        refreshQueue();
      }
    },
    onInsert: () => {
      refreshQueue();
    },
    onReconnect: () => {
      refreshQueue();
    },
  });

  // Subscribe to real-time revisions to remove responded revisions or add incoming ones
  useRealtimeTable({
    table: "revisions",
    onUpdate: (newRev: any) => {
      if (newRev.respon_vendor && newRev.respon_vendor !== "belum_respon") {
        setRevisions((prev) => prev.filter((r) => r.revisionId !== newRev.id));
      } else {
        refreshQueue();
      }
    },
    onInsert: () => {
      refreshQueue();
    },
    onReconnect: () => {
      refreshQueue();
    },
  });

  const handleOpenOrderResponse = (
    order: VendorPendingOrderConfirmation,
    sanggup: boolean
  ) => {
    setDialogType("order");
    setTargetOrderId(order.orderId);
    setTargetTitle(`${order.tanggal} - ${order.shiftNama} (${order.shiftLabel})`);
    setIsSanggup(sanggup);
    setCatatan("");
    setResponseModalOpen(true);
  };

  const handleOpenRevisionResponse = (
    rev: VendorPendingRevisionConfirmation,
    sanggup: boolean
  ) => {
    setDialogType("revision");
    setTargetRevisionId(rev.revisionId);
    setTargetTitle(`${rev.bagianNama} (${rev.shiftNama}, ${rev.tanggal})`);
    setIsSanggup(sanggup);
    setCatatan("");
    setResponseModalOpen(true);
  };

  const handleSubmitResponse = () => {
    if (!isSanggup && catatan.trim().length === 0) {
      toast({
        title: "Catatan Wajib Diisi",
        description: "Alasan penolakan / ketidaksanggupan wajib dicantumkan.",
        variant: "danger",
      });
      return;
    }

    startTransition(async () => {
      if (dialogType === "order") {
        const res = await responPeriodeVendorAction({
          orderId: targetOrderId,
          sanggup: isSanggup,
          catatan,
        });

        if (res.success) {
          toast({
            title: isSanggup ? "Pesanan Disanggupi" : "Respon Disimpan",
            description: res.message || "Respon kesanggupan pesanan berhasil dicatat.",
            variant: "success",
          });
          setOrders((prev) => prev.filter((o) => o.orderId !== targetOrderId));
          setResponseModalOpen(false);
        } else {
          toast({
            title: "Gagal Menyimpan Respon",
            description: res.error || "Terjadi kesalahan sistem.",
            variant: "danger",
          });
        }
      } else {
        const res = await responRevisiVendorAction({
          revisionId: targetRevisionId,
          sanggup: isSanggup,
          catatan,
        });

        if (res.success) {
          toast({
            title: isSanggup ? "Revisi Disanggupi" : "Respon Disimpan",
            description: res.message || "Respon kesanggupan revisi berhasil dicatat.",
            variant: "success",
          });
          setRevisions((prev) => prev.filter((r) => r.revisionId !== targetRevisionId));
          setResponseModalOpen(false);
        } else {
          toast({
            title: "Gagal Menyimpan Respon",
            description: res.error || "Terjadi kesalahan sistem.",
            variant: "danger",
          });
        }
      }
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between shrink-0">
        <SegmentedControl
          options={[
            {
              value: "orders",
              label: `Permintaan Baru (${orders.length})`,
            },
            {
              value: "revisions",
              label: `Perubahan Revisi (${revisions.length})`,
            },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {activeTab === "orders" ? (
          orders.length === 0 ? (
            <div className="py-16 text-center bg-surface border border-border rounded-[10px] p-6 text-text-muted text-[13px]">
              <CheckCircle2 className="w-8 h-8 text-[#1E8E3E] mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-text">Semua Permintaan Sudah Dikonfirmasi</p>
              <p className="text-[12px] text-text-muted mt-1">
                Tidak ada pesanan baru yang menunggu respon kesanggupan dari vendor Anda.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.orderId}
                className="bg-surface border border-border rounded-[10px] p-4 sm:p-5 shadow-xs flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-text">
                        {order.shiftNama} ({order.shiftLabel})
                      </span>
                      <span className="text-[12px] font-medium text-text-muted">
                        Tanggal: <strong className="text-text">{order.tanggal}</strong>
                      </span>
                    </div>
                    <span className="text-[12px] text-text-muted flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Batas Jam Tiba: <strong className="text-text">{order.batasTiba} WIB</strong> ({order.shiftJam})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-text-muted block">Total Pesanan</span>
                      <span className="text-lg font-bold text-primary">
                        {formatNumber(order.totalPorsi)}
                      </span>
                      <span className="text-[11px] text-text-muted ml-1">porsi</span>
                    </div>
                  </div>
                </div>

                {/* Details summary */}
                <div className="space-y-2 text-[13px]">
                  <div className="flex items-center gap-2 text-text-muted">
                    <MapPin className="w-4 h-4 shrink-0 text-text-muted" />
                    <span>
                      Meliputi <strong>{order.items.length} bagian kerja</strong> penerima.
                    </span>
                  </div>

                  {order.catatanGa && (
                    <div className="p-3 bg-[#E8F2FA]/60 border border-[#BBD9EE] rounded-[8px] text-[12px]">
                      <span className="font-semibold text-[#0B5A94] flex items-center gap-1 mb-0.5">
                        <FileText className="w-3.5 h-3.5" />
                        Catatan dari General Affairs:
                      </span>
                      <p className="text-text">{order.catatanGa}</p>
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(order);
                      setInspectorOpen(true);
                    }}
                    className="h-9 sm:min-h-[44px] px-3 py-1.5 bg-surface hover:bg-black/5 text-text border border-border rounded-[8px] text-xs sm:text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-text-muted" />
                    Lihat Rincian Bagian
                  </button>

                  <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                    <button
                      type="button"
                      onClick={() => handleOpenOrderResponse(order, false)}
                      className="h-9 sm:min-h-[44px] px-3 sm:px-4 py-1.5 bg-surface hover:bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] rounded-[8px] text-xs sm:text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>Tidak Sanggup</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenOrderResponse(order, true)}
                      className="h-9 sm:min-h-[44px] px-3 sm:px-4 py-1.5 bg-[#1E8E3E] hover:bg-[#167031] text-white rounded-[8px] text-xs sm:text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Sanggupi Pesanan</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : revisions.length === 0 ? (
          <div className="py-16 text-center bg-surface border border-border rounded-[10px] p-6 text-text-muted text-[13px]">
            <CheckCircle2 className="w-8 h-8 text-[#1E8E3E] mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-text">Semua Revisi Sudah Dikonfirmasi</p>
            <p className="text-[12px] text-text-muted mt-1">
              Tidak ada pengajuan revisi kuota yang menunggu respon dari vendor Anda.
            </p>
          </div>
        ) : (
          revisions.map((rev) => (
            <div
              key={rev.revisionId}
              className="bg-surface border border-border rounded-[10px] p-4 sm:p-5 shadow-xs flex flex-col gap-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-text">
                      {rev.bagianNama}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-[5px] bg-[#007AFF]/10 text-[#0066CC] border border-[#007AFF]/25">
                      {rev.shiftNama} ({rev.shiftLabel})
                    </span>
                  </div>
                  <span className="text-[12px] text-text-muted mt-0.5 block">
                    Tanggal: <strong className="text-text">{rev.tanggal}</strong> | Lokasi Antar: <strong className="text-text">{rev.lokasiAntar}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-text-muted block">Perubahan Porsi</span>
                    <div className="flex items-center gap-1.5 text-sm font-mono">
                      <span className="text-text-muted line-through">{rev.porsiAwal}</span>
                      <span className="font-bold text-text text-base">{rev.porsiBaru}</span>
                      <span className={`font-bold ml-1 ${rev.selisihPorsi > 0 ? "text-[#1E8E3E]" : "text-[#C5221F]"}`}>
                        ({formatDelta(rev.selisihPorsi)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revision details */}
              <div className="p-3 bg-[#FEF7E0]/50 border border-[#FCE8B2] rounded-[8px] text-[12px]">
                <span className="font-semibold text-[#E37400] flex items-center gap-1.5 mb-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Alasan Perubahan dari Admin GA:
                </span>
                <p className="text-text">{rev.alasan}</p>
              </div>

              {/* Actions row */}
              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleOpenRevisionResponse(rev, false)}
                  className="h-9 sm:min-h-[44px] px-3 sm:px-4 py-1.5 bg-surface hover:bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] rounded-[8px] text-xs sm:text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Tidak Sanggup</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenRevisionResponse(rev, true)}
                  className="h-9 sm:min-h-[44px] px-3 sm:px-4 py-1.5 bg-[#1E8E3E] hover:bg-[#167031] text-white rounded-[8px] text-xs sm:text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Sanggupi Revisi</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
                responVendor: "menunggu",
                progresVendor: "menunggu",
                catatanGa: selectedOrder.catatanGa,
                items: selectedOrder.items,
              }
            : null
        }
      />

      {/* Confirmation Dialog */}
      <Dialog
        open={responseModalOpen}
        onOpenChange={setResponseModalOpen}
        title={
          isSanggup
            ? `Menyanggupi ${dialogType === "order" ? "Pesanan" : "Revisi"}`
            : `Menolak / Tidak Menyanggupi ${dialogType === "order" ? "Pesanan" : "Revisi"}`
        }
        description={
          isSanggup
            ? `Apakah Anda sanggup memenuhi jadwal dan kuota untuk ${targetTitle}?`
            : `Pemberitahuan ketidaksanggupan untuk ${targetTitle} akan dikirimkan ke General Affairs.`
        }
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-[13px] font-medium text-text mb-1">
              Catatan {isSanggup ? "(Opsional)" : "(Wajib Diisi)"}
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={
                isSanggup
                  ? "Tambahkan catatan kesanggupan bila ada..."
                  : "Jelaskan alasan atau kendala ketidaksanggupan produksi..."
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
              {isPending ? "Menyimpan..." : isSanggup ? "Konfirmasi Sanggup" : "Kirim Respon"}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
