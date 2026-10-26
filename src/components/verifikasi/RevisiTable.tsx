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
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full text-left border-collapse min-w-full md:min-w-[900px]">
        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2.5">Tanggal & Shift</th>
            <th className="px-3 py-2.5">Vendor</th>
            <th className="px-3 py-2.5">Bagian</th>
            <th className="px-3 py-2.5 text-right">Perubahan Porsi</th>
            <th className="px-3 py-2.5 min-w-[160px] hidden md:table-cell">Alasan</th>
            <th className="px-3 py-2.5 hidden lg:table-cell">Pengaju</th>
            <th className="px-3 py-2.5 text-center hidden sm:table-cell">Respons Vendor</th>
            <th className="px-3 py-2.5 text-center">Status</th>
            <th className="px-3 py-2.5 text-center w-[120px] sm:w-[160px]">Aksi</th>
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
                {/* Tanggal & Shift */}
                <td className="px-3 py-2.5 align-middle">
                  <div className="flex flex-col">
                    <span className="font-semibold text-text">
                      {formatDateIndonesian(rev.tanggal, false)}
                    </span>
                    <span className="text-[11px] text-muted">
                      {rev.shiftNama} ({rev.shiftLabel})
                    </span>
                  </div>
                </td>

                {/* Vendor */}
                <td className="px-3 py-2.5 align-middle">
                  <div className="flex flex-col">
                    <span className="font-medium text-text truncate max-w-[140px]" title={rev.vendorNama}>
                      {rev.vendorNama}
                    </span>
                    <span className="text-[11px] text-muted">
                      {rev.vendorKode}
                    </span>
                  </div>
                </td>

                {/* Bagian */}
                <td className="px-3 py-2.5 align-middle font-semibold text-text">
                  {rev.bagianNama}
                </td>

                {/* Perubahan Porsi ("20 menjadi 23 (+3)") */}
                <td className="px-3 py-2.5 align-middle text-right font-mono">
                  <div className="inline-flex items-center gap-1.5 justify-end">
                    <span className="text-muted">{rev.porsiAwal}</span>
                    <span className="text-muted">&rarr;</span>
                    <span className="font-bold text-text">{rev.porsiBaru}</span>
                    <span
                      className={cn(
                        "text-[11px] px-1.5 py-0.2 rounded font-bold ml-1",
                        rev.selisihPorsi > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : rev.selisihPorsi < 0
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      ({deltaStr})
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
                <td className="px-3 py-2.5 align-middle text-center">
                  <StatusBadge status={rev.status} />
                </td>

                {/* Aksi */}
                <td className="px-3 py-2.5 align-middle text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => onOpenVerify(rev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[6px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white shadow-xs"
                        title="Verifikasi pengajuan revisi"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Verifikasi</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted font-medium px-2 py-1">
                        Selesai
                      </span>
                    )}

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-[6px] border border-border bg-white text-muted hover:text-emerald-700 hover:bg-emerald-50 transition-colors shadow-xs"
                        title="Kirim pesan WhatsApp ke vendor"
                        aria-label="WhatsApp vendor"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {rev.periodId && (
                      <Link
                        href={`/admin/verifikasi/${rev.periodId}/riwayat`}
                        className="p-1.5 rounded-[6px] border border-border bg-white text-muted hover:text-text hover:bg-slate-50 transition-colors shadow-xs"
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
