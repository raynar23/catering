"use client";

import React from "react";
import {
  formatDateIndonesian,
  getOffsetDateIso,
  getTomorrowDateIso,
  formatDateIso,
} from "@/lib/date";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CateringDateToolbarProps {
  tanggal: string;
  onDateChange: (nextDate: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
  isDirty: boolean;
}

// Date selector toolbar with previous/next controls, shortcuts, and refresh action
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
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border border-border rounded-[10px] shadow-xs">
      {/* Date navigation controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrevDay}
          disabled={isLoading}
          className="p-1.5 rounded-[6px] border border-border bg-white text-muted hover:text-text hover:bg-slate-50 transition-colors shadow-xs"
          title="Hari Sebelumnya"
          aria-label="Hari Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="relative flex items-center">
          <CalendarIcon className="w-4 h-4 text-muted absolute left-3 pointer-events-none" />
          <input
            type="date"
            value={tanggal}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            disabled={isLoading}
            className="pl-9 pr-3 py-1.5 text-xs font-semibold rounded-[6px] border border-border bg-white text-text cursor-pointer hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
          />
        </div>

        <button
          type="button"
          onClick={handleNextDay}
          disabled={isLoading}
          className="p-1.5 rounded-[6px] border border-border bg-white text-muted hover:text-text hover:bg-slate-50 transition-colors shadow-xs"
          title="Hari Berikutnya"
          aria-label="Hari Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="hidden sm:flex items-center pl-2 text-sm font-semibold text-text tracking-tight">
          {formatDateIndonesian(tanggal)}
        </div>
      </div>

      {/* Quick filters & refresh */}
      <div className="flex items-center gap-2">
        {isDirty && (
          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-[6px]">
            Ada perubahan belum tersimpan
          </span>
        )}

        <div className="flex items-center rounded-[6px] border border-border bg-slate-50 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onDateChange(todayIso)}
            className={cn(
              "px-2.5 py-1 rounded-[4px] font-medium transition-colors",
              tanggal === todayIso
                ? "bg-white text-primary shadow-xs font-semibold"
                : "text-muted hover:text-text"
            )}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => onDateChange(tomorrowIso)}
            className={cn(
              "px-2.5 py-1 rounded-[4px] font-medium transition-colors",
              tanggal === tomorrowIso
                ? "bg-white text-primary shadow-xs font-semibold"
                : "text-muted hover:text-text"
            )}
          >
            Besok
          </button>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-[6px] border border-border bg-white text-muted hover:text-text hover:bg-slate-50 transition-colors shadow-xs"
          title="Muat ulang data terbaru dari server"
          aria-label="Muat ulang"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
