"use client";

import React, { useState } from "react";
import { VendorPoint } from "@/lib/dashboard";
import { formatNumber } from "@/lib/format";

interface VendorBarChartProps {
  series: VendorPoint[];
  totalPorsi: number;
  isLoading?: boolean;
}

// Horizontal bar chart displaying portion breakdown per vendor partner with Apple HIG aesthetics
export function VendorBarChart({
  series,
  totalPorsi,
  isLoading = false,
}: VendorBarChartProps) {
  const [hoveredVendorId, setHoveredVendorId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white border border-black/[0.08] rounded-[12px] p-3.5 sm:p-4 flex flex-col h-full animate-pulse shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="h-3.5 w-28 bg-[#E5E5EA] rounded mb-1" />
        <div className="h-3 w-48 bg-[#F2F2F7] rounded mb-3" />
        <div className="space-y-2.5 flex-1 flex flex-col justify-between py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 bg-[#F2F2F7] rounded w-full" />
              <div className="h-1.5 bg-[#E5E5EA] rounded-full w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = totalPorsi === 0 || series.every((v) => v.total_porsi === 0);
  const maxVal = Math.max(...series.map((v) => v.total_porsi), 1);

  return (
    <div className="bg-white border border-black/[0.08] rounded-[12px] p-3.5 sm:p-4 flex flex-col h-full select-none shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="mb-1.5 sm:mb-2 shrink-0">
        <h3 className="text-xs font-semibold text-text tracking-tight">Porsi per Vendor</h3>
        <p className="text-[11px] text-[#86868B] truncate">Distribusi pemenuhan katering oleh 5 vendor mitra</p>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-xs text-text-muted min-h-[140px]">
          Belum ada data final pada rentang ini
        </div>
      ) : (
        <div className="flex-1 min-h-[150px] flex flex-col justify-between gap-1 overflow-y-auto">
          {series.map((item) => {
            const widthPct = Math.max(2, Math.round((item.total_porsi / maxVal) * 100));
            const isHovered = hoveredVendorId === item.vendor_id;

            return (
              <div
                key={item.vendor_id}
                onMouseEnter={() => setHoveredVendorId(item.vendor_id)}
                onMouseLeave={() => setHoveredVendorId(null)}
                className={`py-1 px-1.5 rounded-[7px] transition-colors cursor-pointer group ${
                  isHovered ? "bg-[#F2F2F7]/80" : ""
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[11px] sm:text-[12px] font-semibold truncate transition-colors ${
                        isHovered ? "text-primary" : "text-[#1D1D1F]"
                      }`}
                    >
                      {item.vendor_nama}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-medium text-[#86868B] bg-black/[0.04] px-1.5 py-0.5 rounded-[4px] leading-none shrink-0">
                      {item.vendor_kode}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 shrink-0 text-xs">
                    <span className="font-semibold text-[#1D1D1F] tabular-nums text-[11px] sm:text-[12px]">
                      {formatNumber(item.total_porsi)}
                    </span>
                    <span className="text-[#86868B] text-[10px] sm:text-[11px] tabular-nums font-normal">
                      ({item.persentase}%)
                    </span>
                  </div>
                </div>

                {/* Sleek Apple-style 6px Progress Bar */}
                <div className="w-full bg-[#E5E5EA] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHovered
                        ? "bg-[#008FD5] shadow-xs"
                        : "bg-[#006CA2]"
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
