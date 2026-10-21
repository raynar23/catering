"use client";

import React, { useState } from "react";
import { ShiftPoint } from "@/lib/dashboard";
import { formatNumber } from "@/lib/format";

interface ShiftDistributionDonutProps {
  series: ShiftPoint[];
  totalPorsi: number;
  isLoading?: boolean;
}

// Fixed color mapping matching DESIGN.md specification
const SHIFT_COLORS: Record<number, string> = {
  1: "#1175BB", // Shift 1: Primary Pelindo blue
  2: "#9CC9EA", // Shift 2: Soft sky blue
  3: "#E08F26", // Shift 3: Accent amber
  0: "#E08F26", // Shift 3 alternative index
};

// SVG Donut chart displaying shift distribution with centered total and rich legend
export function ShiftDistributionDonut({
  series,
  totalPorsi,
  isLoading = false,
}: ShiftDistributionDonutProps) {
  const [hoveredShiftId, setHoveredShiftId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-[10px] p-4 flex flex-col h-full animate-pulse">
        <div className="h-4 w-32 bg-border/50 rounded mb-4" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border-8 border-border/30" />
        </div>
      </div>
    );
  }

  const isEmpty = totalPorsi === 0 || series.every((s) => s.total_porsi === 0);

  // Compute SVG arc angles
  const radius = 64;
  const strokeWidth = 18;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90; // Start at 12 o'clock

  const slices = series.map((item, idx) => {
    const fraction = totalPorsi > 0 ? item.total_porsi / totalPorsi : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const angle = currentAngle;
    currentAngle += fraction * 360;

    const color = SHIFT_COLORS[item.urutan] || SHIFT_COLORS[idx + 1] || "#1175BB";

    return {
      ...item,
      color,
      fraction,
      strokeDasharray,
      angle,
    };
  });

  return (
    <div className="bg-surface border border-border rounded-[10px] p-4 flex flex-col h-full select-none">
      <div className="mb-2">
        <h3 className="text-xs font-semibold text-text">Distribusi per Shift</h3>
        <p className="text-[11px] text-text-muted">Proporsi kebutuhan katering menurut jadwal kerja</p>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-xs text-text-muted">
          Belum ada data final pada rentang ini
        </div>
      ) : (
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-4 xl:gap-6 min-h-[120px]">
          {/* SVG Donut Circle */}
          <div className="relative w-32 h-32 xl:w-36 xl:h-36 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
              {/* Background ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#F2F2F7"
                strokeWidth={strokeWidth}
              />

              {/* Data Slices */}
              {slices.map((slice) => {
                if (slice.fraction === 0) return null;
                const isHovered = hoveredShiftId === slice.shift_id;
                return (
                  <circle
                    key={slice.shift_id}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={-((slice.angle + 90) / 360) * circumference}
                    onMouseEnter={() => setHoveredShiftId(slice.shift_id)}
                    onMouseLeave={() => setHoveredShiftId(null)}
                    className="transition-all duration-200 cursor-pointer"
                  />
                );
              })}
            </svg>

            {/* Centered Total Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                Total
              </span>
              <span className="text-sm font-bold text-text tabular-nums">
                {formatNumber(totalPorsi)}
              </span>
              <span className="text-[10px] text-text-muted">Porsi</span>
            </div>
          </div>

          {/* Detailed Legend */}
          <div className="flex flex-col gap-2.5 flex-1 min-w-0 w-full sm:w-auto">
            {slices.map((slice) => {
              const isHovered = hoveredShiftId === slice.shift_id;
              return (
                <div
                  key={slice.shift_id}
                  onMouseEnter={() => setHoveredShiftId(slice.shift_id)}
                  onMouseLeave={() => setHoveredShiftId(null)}
                  className={`flex items-center justify-between gap-3 p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                    isHovered ? "bg-bg" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text truncate">
                        {slice.shift_nama}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        {slice.shift_label}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-text tabular-nums">
                      {formatNumber(slice.total_porsi)}
                    </p>
                    <p className="text-[10px] text-text-muted tabular-nums">
                      {slice.persentase}%
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
