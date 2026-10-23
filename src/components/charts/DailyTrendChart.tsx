"use client";

import React, { useState, useMemo } from "react";
import { DailyPoint, bucketTrendSeries, BucketedTrendPoint } from "@/lib/dashboard";
import { formatNumber } from "@/lib/format";

interface DailyTrendChartProps {
  currentSeries: DailyPoint[];
  previousSeries: DailyPoint[];
  isLoading?: boolean;
}

// Adaptive trend line chart with solid current period and dashed preceding comparison
export function DailyTrendChart({
  currentSeries,
  previousSeries,
  isLoading = false,
}: DailyTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const data: BucketedTrendPoint[] = useMemo(() => {
    return bucketTrendSeries(currentSeries, previousSeries);
  }, [currentSeries, previousSeries]);

  const isEmpty = data.length === 0 || data.every((d) => d.porsi_saat_ini === 0 && d.porsi_sebelumnya === 0);

  // Compute scale boundaries
  const maxVal = useMemo(() => {
    if (data.length === 0) return 100;
    const max = Math.max(...data.map((d) => Math.max(d.porsi_saat_ini, d.porsi_sebelumnya)));
    return max > 0 ? Math.ceil(max * 1.15) : 100;
  }, [data]);

  // Chart coordinate dimensions
  const width = 640;
  const height = 180;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = useMemo(() => {
    if (data.length === 0) return { current: "", previous: "", coords: [] };
    const step = data.length > 1 ? chartW / (data.length - 1) : chartW / 2;

    const coords = data.map((d, i) => {
      const x = padLeft + (data.length > 1 ? i * step : chartW / 2);
      const yCur = padTop + chartH - (d.porsi_saat_ini / maxVal) * chartH;
      const yPrev = padTop + chartH - (d.porsi_sebelumnya / maxVal) * chartH;
      return { x, yCur, yPrev, data: d };
    });

    const currentPath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.yCur}`).join(" ");
    const prevPath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.yPrev}`).join(" ");

    return { current: currentPath, previous: prevPath, coords };
  }, [data, chartW, chartH, maxVal, padLeft, padTop]);

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-[10px] p-4 flex flex-col h-full animate-pulse">
        <div className="h-4 w-36 bg-border/50 rounded mb-4" />
        <div className="flex-1 bg-border/20 rounded-[8px]" />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-[10px] p-4 flex flex-col h-full select-none">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-semibold text-text">Tren Porsi Harian</h3>
          <p className="text-[11px] text-text-muted">Perbandingan rentang aktif dengan periode sebelumnya</p>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-primary rounded-full inline-block" />
            <span className="text-text-muted">Periode Ini</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-[#94A3B8] inline-block" />
            <span className="text-text-muted">Periode Lalu</span>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-xs text-text-muted">
          Belum ada data final pada rentang ini
        </div>
      ) : (
        <div className="relative flex-1 min-h-[140px] w-full">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            {/* Horizontal Grid lines */}
            {[0, 0.33, 0.66, 1].map((pct, idx) => {
              const y = padTop + chartH * (1 - pct);
              const val = Math.round(maxVal * pct);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#E5E5EA"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-[#6E6E73] font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Previous Period Line (Dashed) */}
            <path
              d={points.previous}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current Period Line (Solid Pelindo Blue) */}
            <path
              d={points.current}
              fill="none"
              stroke="#008FD5"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover Points & X-Labels */}
            {points.coords.map((c, i) => {
              const isHovered = hoveredIdx === i;
              const showLabel =
                points.coords.length <= 12 ||
                i === 0 ||
                i === points.coords.length - 1 ||
                i % Math.ceil(points.coords.length / 8) === 0;

              return (
                <g key={i}>
                  {/* Current point circle */}
                  <circle
                    cx={c.x}
                    cy={c.yCur}
                    r={isHovered ? 4.5 : 2.5}
                    fill="#1175BB"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="transition-all"
                  />

                  {/* X Axis Label */}
                  {showLabel && (
                    <text
                      x={c.x}
                      y={height - padBottom + 16}
                      textAnchor="middle"
                      className="text-[10px] fill-[#6E6E73] font-mono"
                    >
                      {c.data.label}
                    </text>
                  )}

                  {/* Invisible wide hover target */}
                  <rect
                    x={c.x - (chartW / points.coords.length) / 2}
                    y={padTop}
                    width={chartW / points.coords.length}
                    height={chartH}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer"
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip Card */}
          {hoveredIdx !== null && points.coords[hoveredIdx] && (
            <div
              className="absolute z-10 pointer-events-none bg-surface border border-border shadow-lg rounded-[8px] p-2 text-xs -translate-x-1/2 -translate-y-full mb-2"
              style={{
                left: `${(points.coords[hoveredIdx].x / width) * 100}%`,
                top: `${(points.coords[hoveredIdx].yCur / height) * 100}%`,
              }}
            >
              <p className="font-semibold text-text mb-1">{points.coords[hoveredIdx].data.label}</p>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-primary font-medium">Periode Ini:</span>
                <span className="font-bold text-text tabular-nums">
                  {formatNumber(points.coords[hoveredIdx].data.porsi_saat_ini)} porsi
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-text-muted">Periode Lalu:</span>
                <span className="font-medium text-text-muted tabular-nums">
                  {formatNumber(points.coords[hoveredIdx].data.porsi_sebelumnya)} porsi
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
