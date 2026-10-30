"use client";

import React from "react";
import { OrderChronologyResult } from "@/lib/actions/revisi";
import { formatLogChange } from "@/lib/catering/log-formatter";
import { formatDateIndonesian } from "@/lib/date";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRouter } from "next/navigation";

interface ChronologyViewProps {
  data: OrderChronologyResult;
}

// Order chronology history view with single-line summary card and text-only back button
export function ChronologyView({ data }: ChronologyViewProps) {
  const router = useRouter();

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* Navigation bar with text-only Back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-[6px] border border-border bg-white text-text hover:bg-slate-50 shadow-xs cursor-pointer select-none"
        >
          Kembali
        </button>

        <span className="text-xs text-muted">
          Total {data.logs.length} catatan aktivitas tercatat
        </span>
      </div>

      {/* Summary card (Tanggal, Shift, Vendor, Status) */}
      <div className="p-3 bg-surface border border-border rounded-[10px] shadow-xs select-none shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-6">
            <div>
              <span className="text-muted block text-[10px] sm:text-[11px]">Tanggal</span>
              <span className="font-semibold text-text text-xs sm:text-sm">
                {formatDateIndonesian(data.tanggal)}
              </span>
            </div>

            <div className="hidden sm:block h-7 w-px bg-border/60" />

            <div>
              <span className="text-muted block text-[10px] sm:text-[11px]">Shift</span>
              <span className="font-semibold text-text text-xs sm:text-sm">
                {data.shiftNama} ({data.shiftLabel})
              </span>
            </div>

            <div className="hidden sm:block h-7 w-px bg-border/60" />

            <div>
              <span className="text-muted block text-[10px] sm:text-[11px]">Vendor</span>
              <span className="font-semibold text-text text-xs sm:text-sm truncate block max-w-[140px]">
                {data.vendorNama}
              </span>
            </div>

            <div className="hidden sm:block h-7 w-px bg-border/60" />

            <div>
              <span className="text-muted block text-[10px] sm:text-[11px]">Total Porsi</span>
              <span className="font-mono font-bold text-primary text-xs sm:text-sm">
                {data.totalPorsi} porsi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <StatusBadge status={data.status} />
            <StatusBadge status={data.responVendor} />
          </div>
        </div>
      </div>

      {/* Chronological Logs Table */}
      <div className="flex-1 min-h-0 flex flex-col bg-surface border border-border rounded-[10px] overflow-hidden shadow-xs">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
          <table className="w-full table-fixed text-left border-collapse text-xs min-w-[340px] sm:min-w-full">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-2.5 sm:px-3 py-2.5 w-[38%] sm:w-44">Waktu & Aktor</th>
                <th className="px-2.5 sm:px-3 py-2.5 w-[62%] sm:w-auto">Aktivitas & Perubahan</th>
                <th className="px-3 py-2.5 min-w-[200px] hidden md:table-cell">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {data.logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="p-8 text-center text-muted select-none"
                  >
                    Belum ada riwayat aktivitas yang tercatat untuk pesanan ini.
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => {
                  const perubahanText = formatLogChange({
                    aksi: log.aksi,
                    jumlah_awal: log.jumlahAwal,
                    selisih: log.selisih,
                    jumlah_baru: log.jumlahBaru,
                    bagian_nama: log.bagianNama,
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Waktu & Aktor */}
                      <td className="px-2.5 sm:px-3 py-2 align-top">
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="font-semibold text-text truncate">
                            {log.olehNama}
                          </span>
                          <span className="text-[10px] text-muted font-mono">
                            {new Date(log.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-[10px] text-muted capitalize hidden sm:inline">
                            {log.olehRole === "admin_ga" ? "General Affairs" : "Vendor"}
                          </span>
                        </div>
                      </td>

                      {/* Aktivitas & Perubahan */}
                      <td className="px-2.5 sm:px-3 py-2 align-top">
                        <div className="flex flex-col min-w-0 pr-1">
                          <span className="font-medium text-text">
                            {perubahanText}
                          </span>
                          {log.keterangan && (
                            <span className="text-[11px] text-muted italic mt-0.5 md:hidden">
                              &quot;{log.keterangan}&quot;
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Keterangan (Desktop only) */}
                      <td className="px-3 py-2.5 text-muted align-top hidden md:table-cell">
                        {log.keterangan || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
