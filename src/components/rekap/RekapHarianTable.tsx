"use client";

import React from "react";
import { RekapHarianData } from "@/lib/actions/rekap";
import { formatNumber, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RekapHarianTableProps {
  data: RekapHarianData | null;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
}

// Matrix table displaying daily catering portions per department, shift, vendor, and grand totals
export function RekapHarianTable({
  data,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
}: RekapHarianTableProps) {
  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-surface border border-border rounded-[10px] overflow-hidden select-none p-4 space-y-3 animate-pulse">
        <div className="h-9 w-full bg-border/40 rounded-[6px]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 w-full bg-border/20 rounded-[6px]" />
        ))}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-surface border border-border rounded-[10px] p-8 text-center select-none">
        <p className="text-sm font-semibold text-text">Tidak Ada Data Rekapitulasi</p>
        <p className="text-xs text-text-muted mt-1 max-w-sm">
          Tidak ditemukan pesanan katering berstatus final atau revisi pada rentang waktu dan kriteria filter yang dipilih.
        </p>
      </div>
    );
  }

  const columns = data.columns;
  const rows = data.rows;
  const totalPages = Math.max(1, Math.ceil(data.total_rows / data.page_size));

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-surface border border-border rounded-[10px] overflow-hidden select-none">
      {/* Scrollable Table Area */}
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        <table className="w-full text-xs text-left border-collapse">
          {/* Table Header */}
          <thead className="bg-[#F2F2F7] sticky top-0 z-20 border-b border-border text-text-muted font-semibold">
            <tr>
              <th className="py-2.5 px-3 whitespace-nowrap sticky left-0 bg-[#F2F2F7] z-30 shadow-[1px_0_0_0_#E5E5EA]">
                Tanggal
              </th>
              <th className="py-2.5 px-3 whitespace-nowrap">Shift</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Vendor</th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="py-2.5 px-3 text-right whitespace-nowrap"
                  title={`${col.nama} (${col.kelompok})`}
                >
                  {col.nama}
                </th>
              ))}
              <th className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-text bg-[#E5E5EA]/50">
                Total
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-border font-normal">
            {rows.map((row) => (
              <tr key={row.period_id} className="hover:bg-bg/60 transition-colors">
                <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] sticky left-0 bg-surface z-10 shadow-[1px_0_0_0_#E5E5EA]">
                  {formatDate(row.tanggal)}
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <span className="font-medium text-text">{row.shift_nama}</span>
                  <span className="text-[10px] text-text-muted ml-1">({row.shift_label})</span>
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <span className="font-medium text-text">{row.vendor_nama}</span>
                  <span className="text-[10px] font-mono text-text-muted ml-1">
                    ({row.vendor_kode})
                  </span>
                </td>
                {columns.map((col) => {
                  const qty = row.items[col.id];
                  return (
                    <td key={col.id} className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                      {qty !== undefined && qty > 0 ? (
                        <span className="font-medium text-text">{formatNumber(qty)}</span>
                      ) : (
                        <span className="text-text-muted/60">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap font-bold text-primary bg-[#F2F2F7]/40">
                  {formatNumber(row.total_porsi)}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Table Footer: Column Summary Totals Across Range */}
          <tfoot className="bg-[#F2F2F7] sticky bottom-0 z-20 border-t-2 border-border font-bold text-text">
            <tr>
              <td
                colSpan={3}
                className="py-2.5 px-3 whitespace-nowrap sticky left-0 bg-[#F2F2F7] z-30 shadow-[1px_0_0_0_#E5E5EA] uppercase tracking-wider text-[11px]"
              >
                Total Keseluruhan Rentang
              </td>
              {columns.map((col) => {
                const total = data.summary_totals[col.id] || 0;
                return (
                  <td key={col.id} className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                    {total > 0 ? formatNumber(total) : "-"}
                  </td>
                );
              })}
              <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap font-bold text-primary bg-[#E5E5EA]/70">
                {formatNumber(data.grand_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination Controls Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface text-xs shrink-0">
        <div className="flex items-center gap-2 text-text-muted">
          <span>Menampilkan</span>
          <select
            value={data.page_size}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 text-xs rounded border border-border bg-surface pl-1.5 pr-6 text-text cursor-pointer"
          >
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>
            dari <strong className="text-text">{data.total_rows}</strong> periode
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-text-muted">
            Halaman <strong className="text-text">{data.page}</strong> dari{" "}
            <strong className="text-text">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => onPageChange(data.page - 1)}
              className="h-7 w-7 flex items-center justify-center rounded border border-border bg-surface hover:bg-bg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-text-muted"
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={data.page >= totalPages}
              onClick={() => onPageChange(data.page + 1)}
              className="h-7 w-7 flex items-center justify-center rounded border border-border bg-surface hover:bg-bg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-text-muted"
              title="Halaman berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
