"use client";

import React from "react";
import {
  formatDateIndonesian,
  getOffsetDateIso,
  getTomorrowDateIso,
  formatDateIso,
} from "@/lib/date";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CateringDateToolbarProps {
  tanggal: string;
  onDateChange: (nextDate: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  isDirty: boolean;
}

// Enterprise date selector toolbar with connected navigation controls and clean typography
export function CateringDateToolbar({
  tanggal,
  onDateChange,
  isLoading,
  onRefresh,
  isDirty,
}: CateringDateToolbarProps) {
  const tomorrowIso = getTomorrowDateIso();
  const todayIso = formatDateIso(new Date());

  const handlePrevDay = () => {
    onDateChange(getOffsetDateIso(tanggal, -1));
  };

  const handleNextDay = () => {
    onDateChange(getOffsetDateIso(tanggal, 1));
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-surface border border-border rounded-[10px] shadow-2xs select-none">
      {/* Date navigation group */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-lg border border-border bg-white shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={handlePrevDay}
            disabled={isLoading}
            className="h-8 px-2.5 hover:bg-slate-50 text-text-muted hover:text-text border-r border-border transition-colors cursor-pointer disabled:opacity-40"
            title="Hari Sebelumnya"
            aria-label="Hari Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={tanggal}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs font-semibold text-text bg-transparent cursor-pointer focus:outline-none focus:bg-slate-50/60 tabular-nums border-none"
          />

          <button
            type="button"
            onClick={handleNextDay}
            disabled={isLoading}
            className="h-8 px-2.5 hover:bg-slate-50 text-text-muted hover:text-text border-l border-border transition-colors cursor-pointer disabled:opacity-40"
            title="Hari Berikutnya"
            aria-label="Hari Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="hidden sm:inline-block text-sm font-bold text-text tracking-tight">
          {formatDateIndonesian(tanggal)}
        </span>
      </div>

      {/* Quick filters & actions */}
      <div className="flex items-center gap-2.5">
        {isDirty && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300/80 px-2.5 py-1 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
            <span>Ada perubahan belum tersimpan</span>
          </span>
        )}

        <div className="inline-flex items-center rounded-lg border border-border bg-slate-100/70 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onDateChange(todayIso)}
            className={cn(
              "px-3 py-1 rounded-md font-medium transition-all cursor-pointer",
              tanggal === todayIso
                ? "bg-white text-[#003366] font-bold shadow-2xs"
                : "text-text-muted hover:text-text"
            )}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => onDateChange(tomorrowIso)}
            className={cn(
              "px-3 py-1 rounded-md font-medium transition-all cursor-pointer",
              tanggal === tomorrowIso
                ? "bg-white text-[#003366] font-bold shadow-2xs"
                : "text-text-muted hover:text-text"
            )}
          >
            Besok
          </button>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8 px-2.5 rounded-lg border border-border bg-white text-text-muted hover:text-text hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 text-xs font-medium cursor-pointer disabled:opacity-40"
          title="Muat ulang data terbaru"
        >
          <RotateCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          <span className="hidden md:inline">Perbarui</span>
        </button>
      </div>
    </div>
  );
}
