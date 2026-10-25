"use client";

import React, { useState } from "react";
import { VendorPoint } from "@/lib/dashboard";
import { formatNumber } from "@/lib/format";

interface VendorBarChartProps {
  series: VendorPoint[];
  totalPorsi: number;
  isLoading?: boolean;
}

// Horizontal bar chart displaying portion breakdown per vendor partner
export function VendorBarChart({
  series,
  totalPorsi,
  isLoading = false,
}: VendorBarChartProps) {
  const [hoveredVendorId, setHoveredVendorId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-[10px] p-4 flex flex-col h-full animate-pulse">
        <div className="h-4 w-32 bg-border/50 rounded mb-4" />
        <div className="space-y-3 flex-1 flex flex-col justify-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 bg-border/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = totalPorsi === 0 || series.every((v) => v.total_porsi === 0);

  const maxVal = Math.max(...series.map((v) => v.total_porsi), 1);

  return (
    <div className="bg-white border border-black/[0.08] rounded-[12px] p-4 flex flex-col h-full select-none shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-text tracking-tight">Porsi per Vendor</h3>
        <p className="text-[11px] text-[#86868B]">Distribusi pemenuhan katering oleh 5 vendor mitra</p>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-xs text-text-muted">
          Belum ada data final pada rentang ini
        </div>
      ) : (
        <div className="flex-1 min-h-[120px] flex flex-col justify-around py-0.5 space-y-1.5">
          {series.map((item) => {
            const widthPct = Math.max(2, Math.round((item.total_porsi / maxVal) * 100));
            const isHovered = hoveredVendorId === item.vendor_id;

            return (
              <div
                key={item.vendor_id}
                onMouseEnter={() => setHoveredVendorId(item.vendor_id)}
                onMouseLeave={() => setHoveredVendorId(null)}
                className={`p-1 rounded-[6px] transition-colors cursor-pointer ${
                  isHovered ? "bg-bg" : ""
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-text truncate">
                      {item.vendor_nama}
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">
                      ({item.vendor_kode})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-xs">
                    <span className="font-bold text-text tabular-nums">
                      {formatNumber(item.total_porsi)}
                    </span>
                    <span className="text-text-muted text-[11px] tabular-nums">
                      ({item.persentase}%)
                    </span>
                  </div>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="w-full bg-slate-100/90 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHovered
                        ? "bg-gradient-to-r from-primary-700 to-primary-500"
                        : "bg-gradient-to-r from-primary-600 to-primary-400"
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
