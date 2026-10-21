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

      {/* Single-line summary card (Tanggal, Shift, Vendor, Status) */}
      <div className="p-3.5 bg-surface border border-border rounded-[10px] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-muted block text-[11px]">Tanggal</span>
              <span className="font-semibold text-text text-sm">
                {formatDateIndonesian(data.tanggal)}
              </span>
            </div>

            <div className="h-7 w-px bg-border/60" />

            <div>
              <span className="text-muted block text-[11px]">Shift</span>
              <span className="font-semibold text-text text-sm">
                {data.shiftNama} ({data.shiftLabel})
              </span>
            </div>

            <div className="h-7 w-px bg-border/60" />

            <div>
              <span className="text-muted block text-[11px]">Vendor</span>
              <span className="font-semibold text-text text-sm">
                {data.vendorNama} ({data.vendorKode})
              </span>
            </div>

            <div className="h-7 w-px bg-border/60" />

            <div>
              <span className="text-muted block text-[11px]">Total Porsi</span>
              <span className="font-mono font-bold text-primary text-sm">
                {data.totalPorsi} porsi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={data.status} />
            <StatusBadge status={data.responVendor} />
          </div>
        </div>
      </div>

      {/* Chronological Logs Table */}
      <div className="flex-1 min-h-0 flex flex-col bg-surface border border-border rounded-[10px] overflow-hidden shadow-xs">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5 w-12 text-center">No</th>
                <th className="px-3 py-2.5 w-44">Tanggal & Jam</th>
                <th className="px-3 py-2.5 w-48">Oleh</th>
                <th className="px-3 py-2.5 min-w-[200px]">Perubahan</th>
                <th className="px-3 py-2.5 min-w-[240px]">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {data.logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted select-none"
                  >
                    Belum ada riwayat aktivitas yang tercatat untuk pesanan ini.
                  </td>
                </tr>
              ) : (
                data.logs.map((log, idx) => {
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
                      {/* No */}
                      <td className="px-3 py-2.5 text-center text-muted font-mono">
                        {idx + 1}
                      </td>

                      {/* Tanggal & Jam */}
                      <td className="px-3 py-2.5 font-mono text-muted">
                        {new Date(log.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>

                      {/* Oleh */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-text">
                            {log.olehNama}
                          </span>
                          <span className="text-[11px] text-muted capitalize">
                            {log.olehRole === "admin_ga"
                              ? "General Affairs"
                              : "Mitra Vendor"}
                          </span>
                        </div>
                      </td>

                      {/* Perubahan (formatted pure function) */}
                      <td className="px-3 py-2.5 font-medium text-text">
                        {perubahanText}
                      </td>

                      {/* Keterangan */}
                      <td className="px-3 py-2.5 text-muted">
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
