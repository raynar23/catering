"use client";

import React from "react";
import { X, Clock, MapPin, AlertCircle, FileText } from "lucide-react";
import { VendorOrderItemDetail } from "@/lib/actions/vendor-portal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber } from "@/lib/format";

interface VendorDetailInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  orderInfo: {
    tanggal: string;
    shiftNama: string;
    shiftLabel: string;
    shiftJam: string;
    batasTiba: string;
    totalPorsi: number;
    status: string;
    responVendor?: string;
    progresVendor?: string;
    catatanGa?: string | null;
    catatanVendor?: string | null;
    diupdateOleh?: string;
    items: VendorOrderItemDetail[];
  } | null;
}

// Side inspector drawer detailing department breakdown, delivery points, and notes
export function VendorDetailInspector({
  isOpen,
  onClose,
  orderInfo,
}: VendorDetailInspectorProps) {
  if (!isOpen || !orderInfo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl bg-surface h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between gap-4 shrink-0 bg-surface">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-text">
                Rincian Permintaan Catering
              </h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-[5px] bg-[#007AFF]/10 text-[#0066CC] border border-[#007AFF]/25">
                {orderInfo.shiftNama} ({orderInfo.shiftLabel})
              </span>
            </div>
            <p className="text-[13px] text-text-muted mt-0.5">
              Tanggal Pelaksanaan: <span className="font-medium text-text">{orderInfo.tanggal}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-[8px] flex items-center justify-center text-text-muted hover:text-text hover:bg-black/5 cursor-pointer shrink-0 min-h-[44px] min-w-[44px]"
            aria-label="Tutup Rincian"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata summary bar */}
        <div className="px-4 sm:px-5 py-3 bg-[#F8FAFC] border-b border-border grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 text-[12px]">
          <div>
            <span className="text-text-muted block">Batas Tiba Shift</span>
            <span className="font-semibold text-text flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {orderInfo.batasTiba} WIB
            </span>
          </div>
          <div>
            <span className="text-text-muted block">Total Pesanan</span>
            <span className="font-semibold text-primary text-[14px] mt-0.5 block">
              {formatNumber(orderInfo.totalPorsi)} Porsi
            </span>
          </div>
          <div>
            <span className="text-text-muted block">Respon Kesanggupan</span>
            <div className="mt-0.5">
              <StatusBadge status={orderInfo.responVendor || "menunggu"} />
            </div>
          </div>
          <div>
            <span className="text-text-muted block">Progres Pengantaran</span>
            <div className="mt-0.5">
              <StatusBadge status={orderInfo.progresVendor || "menunggu"} />
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Notes section */}
          {(orderInfo.catatanGa || orderInfo.catatanVendor) && (
            <div className="space-y-2.5">
              {orderInfo.catatanGa && (
                <div className="p-3 bg-[#E8F2FA]/50 border border-[#BBD9EE] rounded-[8px] text-[13px]">
                  <span className="font-semibold text-[#0B5A94] flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5" />
                    Catatan dari General Affairs:
                  </span>
                  <p className="text-text whitespace-pre-wrap">{orderInfo.catatanGa}</p>
                </div>
              )}
              {orderInfo.catatanVendor && (
                <div className="p-3 bg-surface border border-border rounded-[8px] text-[13px]">
                  <span className="font-semibold text-text-muted block mb-1">
                    Catatan Internal Vendor:
                  </span>
                  <p className="text-text whitespace-pre-wrap">{orderInfo.catatanVendor}</p>
                </div>
              )}
            </div>
          )}

          {/* Department Breakdown Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-text uppercase tracking-wider">
                Alokasi Porsi per Bagian ({orderInfo.items.length} Bagian)
              </h3>
            </div>

            <div className="border border-border rounded-[8px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] text-left border-collapse">
                  <thead className="bg-[#F8FAFC] text-text-muted font-semibold border-b border-border text-[12px]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Nama Bagian</th>
                      <th className="py-2.5 px-3">Lokasi Antar</th>
                      <th className="py-2.5 px-3 text-right">Karyawan</th>
                      <th className="py-2.5 px-3 text-right">Porsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orderInfo.items.map((it, idx) => (
                      <tr key={it.id} className="hover:bg-black/[0.02]">
                        <td className="py-2.5 px-3 text-center text-text-muted font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-text">
                          <div>
                            {it.bagianNama}
                            {it.pendingRevision && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] text-[#C5221F] bg-[#FCE8E6] px-1.5 py-0.5 rounded-[4px] w-fit">
                                <AlertCircle className="w-3 h-3" />
                                Revisi menunggu: {it.pendingRevision.porsiAwal} {"->"} {it.pendingRevision.porsiBaru} ({it.pendingRevision.selisihPorsi > 0 ? `+${it.pendingRevision.selisihPorsi}` : it.pendingRevision.selisihPorsi})
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-text-muted">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            {it.lokasiAntar}
                          </span>
                          {it.catatanAntar && it.catatanAntar !== "-" && (
                            <span className="block text-[11px] text-text-muted/80 mt-0.5 italic">
                              {it.catatanAntar}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-text-muted">
                          {formatNumber(it.jumlahKaryawan)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-text">
                          {formatNumber(it.jumlahPorsi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#F8FAFC] border-t border-border font-bold text-[13px]">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right text-text">
                        Total Porsi
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-primary text-[14px]">
                        {formatNumber(orderInfo.totalPorsi)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-[#F8FAFC] flex items-center justify-between shrink-0">
          <span className="text-[12px] text-text-muted">
            Diperbarui oleh: <span className="font-medium text-text">{orderInfo.diupdateOleh || "Admin GA"}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface hover:bg-black/5 text-text border border-border rounded-[8px] text-[13px] font-medium min-h-[44px] cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
