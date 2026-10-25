"use client";

import React, { useState, useMemo } from "react";
import { BagianPoint } from "@/lib/dashboard";
import { formatNumber } from "@/lib/format";

interface BagianBarChartProps {
  series: BagianPoint[];
  isLoading?: boolean;
}

// Vertical bar chart displaying portion allocation per department with intact full labels
export function BagianBarChart({ series, isLoading = false }: BagianBarChartProps) {
  const [hoveredBagianId, setHoveredBagianId] = useState<string | null>(null);

  const activeSeries = useMemo(() => {
    // Show departments that have portions, or fallback to all active
    const withData = series.filter((b) => b.total_porsi > 0);
    return withData.length > 0 ? withData : series.slice(0, 10);
  }, [series]);

  const isEmpty = series.length === 0 || series.every((b) => b.total_porsi === 0);

  const maxVal = useMemo(() => {
    if (activeSeries.length === 0) return 100;
    const max = Math.max(...activeSeries.map((b) => b.total_porsi));
    return max > 0 ? Math.ceil(max * 1.15) : 100;
  }, [activeSeries]);

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-[10px] p-4 flex flex-col h-full animate-pulse">
        <div className="h-4 w-32 bg-border/50 rounded mb-4" />
        <div className="flex-1 bg-border/20 rounded-[8px]" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-black/[0.08] rounded-[12px] p-4 flex flex-col h-full select-none shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-text tracking-tight">Porsi per Bagian</h3>
        <p className="text-[11px] text-[#86868B]">Alokasi konsumsi menurut unit kerja dan kelompok</p>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-xs text-text-muted">
          Belum ada data final pada rentang ini
        </div>
      ) : (
        <div className="flex-1 min-h-[140px] flex items-end overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-end gap-3 min-w-full px-2 pt-6 h-full">
            {activeSeries.map((item) => {
              const heightPct = Math.max(4, Math.round((item.total_porsi / maxVal) * 100));
              const isHovered = hoveredBagianId === item.bagian_id;

              return (
                <div
                  key={item.bagian_id}
                  onMouseEnter={() => setHoveredBagianId(item.bagian_id)}
                  onMouseLeave={() => setHoveredBagianId(null)}
                  className="flex-1 min-w-[56px] flex flex-col items-center justify-end h-full group cursor-pointer"
                >
                  {/* Number above bar */}
                  <span
                    className={`text-[10px] font-semibold tabular-nums mb-1 transition-colors ${
                      isHovered ? "text-primary font-bold scale-105" : "text-text-muted"
                    }`}
                  >
                    {formatNumber(item.total_porsi)}
                  </span>

                  {/* Vertical Bar */}
                  <div className="w-full max-w-[36px] bg-slate-100/90 rounded-t-[6px] flex-1 min-h-[45px] max-h-24 relative flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-t-[6px] transition-all duration-300 ${
                        isHovered
                          ? "bg-gradient-to-t from-primary-700 to-primary-500 shadow-xs"
                          : "bg-gradient-to-t from-primary-600 to-primary-400"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Intact Department Name */}
                  <div className="mt-2 text-center w-full">
                    <p
                      className={`text-[11px] font-medium leading-tight truncate transition-colors ${
                        isHovered ? "text-primary font-semibold" : "text-text"
                      }`}
                      title={item.bagian_nama}
                    >
                      {item.bagian_nama}
                    </p>
                    <p className="text-[9px] text-text-muted truncate mt-0.5">
                      {item.kelompok}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
