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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4 select-none">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[10px] p-3.5 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4 select-none">
      {/* 1. Total Porsi */}
      <div className="bg-surface border border-border rounded-[10px] p-3.5 flex flex-col justify-between">
        <p className="text-xs font-medium text-text-muted">Total Porsi</p>
        <p className="text-2xl font-bold text-text tabular-nums tracking-tight mt-1">
          {formatNumber(totalPorsi)}
        </p>
        <p className="text-[11px] text-text-muted mt-1 truncate">
          Porsi pesanan berlaku
        </p>
      </div>

      {/* 2. Rata-rata Porsi per Hari */}
      <div className="bg-surface border border-border rounded-[10px] p-3.5 flex flex-col justify-between">
        <p className="text-xs font-medium text-text-muted">Rata-rata/Hari</p>
        <p className="text-2xl font-bold text-primary tabular-nums tracking-tight mt-1">
          {formatNumber(avgPorsiPerHari)}
        </p>
        <p className="text-[11px] text-text-muted mt-1 truncate">
          Porsi rata-rata per hari
        </p>
      </div>

      {/* 3. Total Revisi */}
      <div className="bg-surface border border-border rounded-[10px] p-3.5 flex flex-col justify-between">
        <p className="text-xs font-medium text-text-muted">Total Revisi</p>
        <p className="text-2xl font-bold text-text tabular-nums tracking-tight mt-1">
          {formatNumber(totalRevisi)}
        </p>
        <p className="text-[11px] text-text-muted mt-1 truncate">
          Pengajuan revisi kuota
        </p>
      </div>

      {/* 4. Revisi Menunggu */}
      <div className="bg-surface border border-border rounded-[10px] p-3.5 flex flex-col justify-between">
        <p className="text-xs font-medium text-text-muted">Revisi Menunggu</p>
        <p
          className={`text-2xl font-bold tabular-nums tracking-tight mt-1 ${
            revisiMenunggu > 0 ? "text-[#9A5B00]" : "text-text"
          }`}
        >
          {formatNumber(revisiMenunggu)}
        </p>
        <p className="text-[11px] text-text-muted mt-1 truncate">
          {revisiMenunggu > 0 ? "Perlu verifikasi GA" : "Semua revisi tuntas"}
        </p>
      </div>

      {/* 5. Belum Input (Hari Ini & Besok) */}
      <div className="bg-surface border border-border rounded-[10px] p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1">
        <p className="text-xs font-medium text-text-muted">Belum Diinput</p>
        <p
          className={`text-2xl font-bold tabular-nums tracking-tight mt-1 ${
            belumInput > 0 ? "text-danger" : "text-success"
          }`}
        >
          {formatNumber(belumInput)}
        </p>
        <p className="text-[11px] text-text-muted mt-1 truncate">
          {belumInput > 0 ? "Hari ini & besok kosong" : "Jadwal 2 hari terisi"}
        </p>
      </div>
    </div>
  );
}
