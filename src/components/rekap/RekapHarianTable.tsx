"use client";

import React from "react";
import { RekapHarianData } from "@/lib/actions/rekap";
import { formatNumber, formatDate } from "@/lib/format";
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
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);

  const toggleRow = (periodId: string) => {
    setExpandedRowId((prev) => (prev === periodId ? null : periodId));
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-surface border border-border rounded-[10px] overflow-hidden select-none">
      {/* MOBILE VIEW (< md): 3-column table with accordion breakdown for 5 bagian */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto md:hidden">
        <table className="w-full table-fixed text-xs text-left border-collapse min-w-[340px]">
          <thead className="bg-[#F2F2F7] sticky top-0 z-20 border-b border-border text-text-muted font-semibold text-[11px]">
            <tr>
              <th className="py-2.5 px-2.5 w-[34%]">Tanggal & Shift</th>
              <th className="py-2.5 px-2 w-[36%]">Vendor</th>
              <th className="py-2.5 px-2.5 text-right w-[30%]">Total Porsi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-normal text-xs">
            {rows.map((row) => {
              const isExpanded = expandedRowId === row.period_id;
              return (
                <React.Fragment key={row.period_id}>
                  <tr
                    onClick={() => toggleRow(row.period_id)}
                    className="hover:bg-bg/60 transition-colors cursor-pointer active:bg-primary-50/40"
                  >
                    <td className="py-2 px-2.5 align-middle">
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="font-semibold text-text tabular-nums text-xs">
                          {formatDate(row.tanggal)}
                        </span>
                        <span className="text-[10px] text-text-muted truncate">
                          {row.shift_nama}
                        </span>
                      </div>
                    </td>

                    <td className="py-2 px-2 align-middle">
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="font-medium text-text truncate block">
                          {row.vendor_nama}
                        </span>
                        <span className="text-[10px] text-primary font-mono">
                          {row.vendor_kode}
                        </span>
                      </div>
                    </td>

                    <td className="py-2 px-2.5 text-right align-middle">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <span className="font-bold text-primary tabular-nums">
                          {formatNumber(row.total_porsi)}
                        </span>
                        <span className="text-[10px] text-text-muted/80">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Department (Bagian) Breakdown */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90 border-y border-border/80">
                      <td colSpan={3} className="p-2.5">
                        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span>Rincian Porsi Per Bagian:</span>
                          <span className="text-[10px] text-primary font-normal">Ketuk baris untuk menutup</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 bg-white p-2 rounded-[6px] border border-border/60">
                          {columns.map((col) => {
                            const qty = row.items?.[col.id];
                            return (
                              <div
                                key={col.id}
                                className="flex items-center justify-between py-0.5 border-b border-border/30 last:border-b-0 text-[11px]"
                              >
                                <span className="text-text-muted truncate max-w-[120px]" title={col.nama}>
                                  {col.nama}:
                                </span>
                                <span className="font-semibold text-text tabular-nums">
                                  {qty !== undefined && qty > 0 ? formatNumber(qty) : "-"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          {/* Mobile Footer Total */}
          <tfoot className="bg-[#F2F2F7] sticky bottom-0 z-20 border-t-2 border-border font-bold text-text text-xs">
            <tr>
              <td colSpan={2} className="py-2.5 px-2.5 uppercase tracking-wider text-[11px]">
                Total Keseluruhan
              </td>
              <td className="py-2.5 px-2.5 text-right font-bold text-primary tabular-nums">
                {formatNumber(data.grand_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* DESKTOP VIEW (>= md): Full multi-column department matrix table */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-auto scrollbar-thin flex-col">
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
                  const qty = row.items?.[col.id];
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
                const total = data?.summary_totals?.[col.id] || 0;
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
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 border-t border-border bg-surface text-xs shrink-0 select-none">
        <div className="flex items-center gap-1.5 text-text-muted text-[11px] sm:text-xs">
          <span className="hidden sm:inline">Menampilkan</span>
          <select
            value={data.page_size}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-6.5 text-[11px] sm:text-xs rounded border border-border bg-surface pl-1 pr-5 text-text cursor-pointer"
          >
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="truncate">
            dari <strong className="text-text">{data.total_rows}</strong> <span className="hidden sm:inline">periode</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
          <span className="text-text-muted">
            <span className="hidden sm:inline">Halaman </span><strong className="text-text">{data.page}</strong> / <strong className="text-text">{totalPages}</strong>
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
