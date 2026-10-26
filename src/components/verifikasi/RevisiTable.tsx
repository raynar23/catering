"use client";

import React from "react";
import { VerificationRevisionItem } from "@/lib/actions/revisi";
import { formatDelta } from "@/lib/catering/log-formatter";
import { formatDateIndonesian } from "@/lib/date";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { waLink, buildRevisionWaMessage } from "@/lib/whatsapp";
import { MessageCircle, CheckSquare, History } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface RevisiTableProps {
  items: VerificationRevisionItem[];
  onOpenVerify: (item: VerificationRevisionItem) => void;
}

// Table displaying catering portion revisions with direct verification and WhatsApp follow-up
export function RevisiTable({ items, onOpenVerify }: RevisiTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted select-none">
        <p className="text-sm font-semibold text-text">Tidak Ada Pengajuan Revisi</p>
        <p className="text-xs text-muted mt-1">
          Belum ada riwayat pengajuan revisi kuota porsi pada sistem.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs min-w-[520px] sm:min-w-0 sm:table-fixed">
        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
          <tr>
            <th className="px-2.5 sm:px-3 py-2.5 min-w-[170px] sm:min-w-0">
              <span className="sm:hidden">Detail Pesanan</span>
              <span className="hidden sm:inline">Tanggal & Shift</span>
            </th>
            <th className="px-3 py-2.5 hidden sm:table-cell sm:w-[140px]">Vendor</th>
            <th className="px-3 py-2.5 hidden sm:table-cell sm:w-[130px]">Bagian</th>
            <th className="px-2.5 sm:px-3 py-2.5 text-right w-[85px] sm:w-[100px]">Porsi</th>
            <th className="px-3 py-2.5 min-w-[160px] hidden md:table-cell">Alasan</th>
            <th className="px-3 py-2.5 hidden lg:table-cell sm:w-[120px]">Pengaju</th>
            <th className="px-3 py-2.5 text-center hidden sm:table-cell sm:w-[120px]">Respons Vendor</th>
            <th className="px-2.5 sm:px-3 py-2.5 text-center min-w-[140px] sm:min-w-0 sm:w-[140px]">Status</th>
            <th className="px-2.5 sm:px-3 py-2.5 text-center min-w-[100px] sm:min-w-0 sm:w-[140px]">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 text-xs">
          {items.map((rev) => {
            const deltaStr = formatDelta(rev.selisihPorsi);
            const isPending = rev.status === "menunggu";

            // Build prefilled WhatsApp URL for this revision
            const waMessage = buildRevisionWaMessage({
              vendorNama: rev.vendorNama,
              tanggal: rev.tanggal,
              shiftNama: rev.shiftNama,
              bagianNama: rev.bagianNama,
              porsiAwal: rev.porsiAwal,
              porsiBaru: rev.porsiBaru,
              selisih: rev.selisihPorsi,
              alasan: rev.alasan,
            });
            const waUrl = rev.vendorTelp ? waLink(rev.vendorTelp, waMessage) : "";

            return (
              <tr
                key={rev.id}
                className="hover:bg-slate-50/70 transition-colors group"
              >
                {/* Tanggal & Shift (Mobile: includes Bagian & Vendor) */}
                <td className="px-2.5 sm:px-3 py-2 align-middle">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-text truncate sm:hidden">
                      {rev.bagianNama}
                    </span>
                    <span className="font-semibold text-text text-xs sm:font-semibold">
                      {formatDateIndonesian(rev.tanggal, false)}
                    </span>
                    <span className="text-[11px] text-muted truncate">
                      {rev.shiftNama} ({rev.shiftLabel})
                    </span>
                    <span className="text-[10px] text-muted truncate sm:hidden mt-0.5">
                      {rev.vendorNama} ({rev.vendorKode})
                    </span>
                  </div>
                </td>

                {/* Vendor (Desktop only) */}
                <td className="px-3 py-2.5 align-middle hidden sm:table-cell">
                  <div className="flex flex-col">
                    <span className="font-medium text-text truncate max-w-[140px]" title={rev.vendorNama}>
                      {rev.vendorNama}
                    </span>
                    <span className="text-[11px] text-muted">
                      {rev.vendorKode}
                    </span>
                  </div>
                </td>

                {/* Bagian (Desktop only) */}
                <td className="px-3 py-2.5 align-middle font-semibold text-text hidden sm:table-cell">
                  {rev.bagianNama}
                </td>

                {/* Perubahan Porsi ("~20~ 23 (+3)") */}
                <td className="px-2.5 sm:px-3 py-2 align-middle text-right font-mono">
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="inline-flex items-center gap-1.5 justify-end text-xs">
                      <span className="line-through text-slate-400 font-normal">{rev.porsiAwal}</span>
                      <span className="font-bold text-text text-xs sm:text-sm">{rev.porsiBaru}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-1 py-0.2 rounded font-bold leading-tight",
                        rev.selisihPorsi > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : rev.selisihPorsi < 0
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {deltaStr}
                    </span>
                  </div>
                </td>

                {/* Alasan */}
                <td className="px-3 py-2.5 align-middle max-w-[200px] hidden md:table-cell">
                  <p className="text-xs text-text truncate" title={rev.alasan}>
                    {rev.alasan}
                  </p>
                </td>

                {/* Pengaju */}
                <td className="px-3 py-2.5 align-middle hidden lg:table-cell">
                  <div className="flex flex-col">
                    <span className="text-text font-medium">{rev.diajukanOlehNama}</span>
                    <span className="text-[11px] text-muted">
                      {rev.diajukanAt ? new Date(rev.diajukanAt).toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </span>
                  </div>
                </td>

                {/* Respons Vendor */}
                <td className="px-3 py-2.5 align-middle text-center hidden sm:table-cell">
                  <StatusBadge status={rev.responVendor} />
                </td>

                {/* Status Revisi */}
                <td className="px-2.5 sm:px-3 py-2 align-middle text-center whitespace-nowrap">
                  <StatusBadge status={rev.status} />
                </td>

                {/* Aksi */}
                <td className="px-2.5 sm:px-3 py-2 align-middle text-center whitespace-nowrap">
                  <div className="inline-flex items-center justify-center gap-1.5">
                    {/* Primary Action Slot (Fixed width so follow-up icons align perfectly) */}
                    <div className="w-[48px] sm:w-[82px] flex items-center justify-center shrink-0">
                      {isPending ? (
                        <button
                          type="button"
                          onClick={() => onOpenVerify(rev)}
                          className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-semibold rounded-[6px] bg-primary hover:bg-[#0E63A1] text-white shadow-xs"
                          title="Verifikasi pengajuan revisi"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Verifikasi</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted font-medium">
                          Selesai
                        </span>
                      )}
                    </div>

                    {/* WhatsApp Action Slot (Fixed width to align vertically across all rows) */}
                    <div className="w-7 flex items-center justify-center shrink-0">
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 sm:p-1.5 rounded-[6px] border border-border bg-white text-muted hover:text-emerald-700 hover:bg-emerald-50 transition-colors shadow-xs"
                          title="Kirim pesan WhatsApp ke vendor"
                          aria-label="WhatsApp vendor"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {rev.periodId && (
                      <Link
                        href={`/admin/verifikasi/${rev.periodId}/riwayat`}
                        className="p-1 sm:p-1.5 rounded-[6px] border border-border bg-white text-muted hover:text-text hover:bg-slate-50 transition-colors shadow-xs hidden sm:inline-flex shrink-0"
                        title="Lihat riwayat kronologi pesanan"
                        aria-label="Riwayat kronologi"
                      >
                        <History className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
