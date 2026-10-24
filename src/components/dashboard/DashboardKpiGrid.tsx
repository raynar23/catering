"use client";

import React from "react";
import { formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

interface DashboardKpiGridProps {
  totalPorsi: number;
  avgPorsiPerHari: number;
  totalRevisi: number;
  revisiMenunggu: number;
  belumInput: number;
  isLoading?: boolean;
}

// 5 Metric KPI cards strictly without icons following DESIGN.md anti-AI-slop guidelines
export function DashboardKpiGrid({
  totalPorsi,
  avgPorsiPerHari,
  totalRevisi,
  revisiMenunggu,
  belumInput,
  isLoading = false,
}: DashboardKpiGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-2.5 select-none shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[10px] p-3 space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-2.5 select-none shrink-0">
      {/* 1. Total Porsi */}
      <div className="bg-gradient-to-b from-white to-[#F9FBFC] border border-border/80 border-t-[3px] border-t-primary rounded-[10px] p-3 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_3px_8px_rgba(0,0,0,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted/80">Total Porsi</p>
        <p className="text-xl lg:text-[25px] font-bold text-text tabular-nums tracking-tight my-1 leading-none">
          {formatNumber(totalPorsi)}
        </p>
        <p className="text-[11px] text-text-muted truncate font-normal">
          Porsi pesanan berlaku
        </p>
      </div>

      {/* 2. Rata-rata Porsi per Hari */}
      <div className="bg-gradient-to-b from-white to-[#F9FBFC] border border-border/80 border-t-[3px] border-t-[#007BB8] rounded-[10px] p-3 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_3px_8px_rgba(0,0,0,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted/80">Rata-rata/Hari</p>
        <p className="text-xl lg:text-[25px] font-bold text-primary tabular-nums tracking-tight my-1 leading-none">
          {formatNumber(avgPorsiPerHari)}
        </p>
        <p className="text-[11px] text-text-muted truncate font-normal">
          Porsi rata-rata per hari
        </p>
      </div>

      {/* 3. Total Revisi */}
      <div className="bg-gradient-to-b from-white to-[#F9FBFC] border border-border/80 border-t-[3px] border-t-slate-400 rounded-[10px] p-3 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_3px_8px_rgba(0,0,0,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted/80">Total Revisi</p>
        <p className="text-xl lg:text-[25px] font-bold text-text tabular-nums tracking-tight my-1 leading-none">
          {formatNumber(totalRevisi)}
        </p>
        <p className="text-[11px] text-text-muted truncate font-normal">
          Pengajuan revisi kuota
        </p>
      </div>

      {/* 4. Revisi Menunggu */}
      <div className="bg-gradient-to-b from-white to-[#F9FBFC] border border-border/80 border-t-[3px] border-t-[#E08F26] rounded-[10px] p-3 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_3px_8px_rgba(0,0,0,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted/80">Revisi Menunggu</p>
        <p
          className={`text-xl lg:text-[25px] font-bold tabular-nums tracking-tight my-1 leading-none ${
            revisiMenunggu > 0 ? "text-[#9A5B00]" : "text-text"
          }`}
        >
          {formatNumber(revisiMenunggu)}
        </p>
        <p className="text-[11px] text-text-muted truncate font-normal">
          {revisiMenunggu > 0 ? "Perlu verifikasi GA" : "Semua revisi tuntas"}
        </p>
      </div>

      {/* 5. Belum Input (Hari Ini & Besok) */}
      <div className="bg-gradient-to-b from-white to-[#F9FBFC] border border-border/80 border-t-[3px] border-t-[#D70015] rounded-[10px] p-3 flex flex-col justify-between col-span-2 sm:col-span-1 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_3px_8px_rgba(0,0,0,0.04)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted/80">Belum Diinput</p>
        <p
          className={`text-xl lg:text-[25px] font-bold tabular-nums tracking-tight my-1 leading-none ${
            belumInput > 0 ? "text-danger" : "text-success"
          }`}
        >
          {formatNumber(belumInput)}
        </p>
        <p className="text-[11px] text-text-muted truncate font-normal">
          {belumInput > 0 ? "Hari ini & besok kosong" : "Jadwal 2 hari terisi"}
        </p>
      </div>
    </div>
  );
}
