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
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-white border border-black/[0.08] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] select-none">
      {/* Date navigation group */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-[8px] border border-[#D1D1D6] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
          <button
            type="button"
            onClick={handlePrevDay}
            disabled={isLoading}
            className="h-8 px-2.5 hover:bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] border-r border-[#E5E5EA] transition-colors cursor-pointer disabled:opacity-40"
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
            className="h-8 px-2.5 text-xs font-semibold text-text bg-transparent cursor-pointer focus:outline-none focus:bg-[#F5F5F7]/60 tabular-nums border-none"
          />

          <button
            type="button"
            onClick={handleNextDay}
            disabled={isLoading}
            className="h-8 px-2.5 hover:bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] border-l border-[#E5E5EA] transition-colors cursor-pointer disabled:opacity-40"
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
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C97800] bg-[#FF9500]/10 border border-[#FF9500]/20 px-2.5 py-1 rounded-[6px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF9500] animate-pulse" />
            <span>Ada perubahan belum tersimpan</span>
          </span>
        )}

        <div className="inline-flex items-center bg-[#E5E5EA]/70 p-[2.5px] rounded-[8px] text-xs">
          <button
            type="button"
            onClick={() => onDateChange(todayIso)}
            className={cn(
              "px-3 py-1 rounded-[6px] font-semibold transition-all cursor-pointer",
              tanggal === todayIso
                ? "bg-white text-text shadow-[0_1px_2.5px_rgba(0,0,0,0.12),0_0.5px_1px_rgba(0,0,0,0.06)]"
                : "text-[#6E6E73] hover:text-[#1D1D1F]"
            )}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => onDateChange(tomorrowIso)}
            className={cn(
              "px-3 py-1 rounded-[6px] font-semibold transition-all cursor-pointer",
              tanggal === tomorrowIso
                ? "bg-white text-text shadow-[0_1px_2.5px_rgba(0,0,0,0.12),0_0.5px_1px_rgba(0,0,0,0.06)]"
                : "text-[#6E6E73] hover:text-[#1D1D1F]"
            )}
          >
            Besok
          </button>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-40"
          title="Muat ulang data terbaru"
        >
          <RotateCw className={cn("w-3.5 h-3.5 text-[#86868B]", isLoading && "animate-spin")} />
          <span className="hidden md:inline">Perbarui</span>
        </button>
      </div>
    </div>
  );
}
