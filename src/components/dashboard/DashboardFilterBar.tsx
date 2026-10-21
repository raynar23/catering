"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import {
  DashboardPreset,
  getPresetDateRange,
  shiftDateRange,
} from "@/lib/dashboard";
import { parseISO, format } from "date-fns";

interface DashboardFilterBarProps {
  preset: DashboardPreset;
  dari: string;
  sampai: string;
  onRangeChange: (dari: string, sampai: string, preset: DashboardPreset) => void;
  isLoading?: boolean;
}

const PRESET_OPTIONS: Array<{ value: DashboardPreset; label: string }> = [
  { value: "hari_ini", label: "Hari Ini" },
  { value: "7_hari", label: "7 Hari" },
  { value: "30_hari", label: "30 Hari" },
  { value: "bulan_ini", label: "Bulan Ini" },
  { value: "3_bulan", label: "3 Bulan" },
  { value: "6_bulan", label: "6 Bulan" },
  { value: "1_tahun", label: "1 Tahun" },
];

// Adaptive dashboard calendar toolbar with quick presets, shifting buttons, and custom date range picker
export function DashboardFilterBar({
  preset,
  dari,
  sampai,
  onRangeChange,
  isLoading = false,
}: DashboardFilterBarProps) {
  const handleSelectPreset = (newPreset: DashboardPreset) => {
    const range = getPresetDateRange(newPreset);
    onRangeChange(range.dari, range.sampai, newPreset);
  };

  const handleShift = (direction: "prev" | "next") => {
    const shifted = shiftDateRange(dari, sampai, direction);
    onRangeChange(shifted.dari, shifted.sampai, "kustom");
  };

  const currentRange: DateRange = {
    from: parseISO(dari),
    to: parseISO(sampai),
  };

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const fromStr = format(range.from, "yyyy-MM-dd");
      const toStr = format(range.to, "yyyy-MM-dd");
      onRangeChange(fromStr, toStr, "kustom");
    } else if (range?.from) {
      const fromStr = format(range.from, "yyyy-MM-dd");
      onRangeChange(fromStr, fromStr, "kustom");
    }
  };

  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 py-2 select-none">
      {/* Quick Presets Segmented Control */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
        <div className="inline-flex items-center bg-[#F2F2F7] p-1 rounded-[8px] gap-1 shrink-0">
          {PRESET_OPTIONS.map((opt) => {
            const isSelected = preset === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isLoading}
                onClick={() => handleSelectPreset(opt.value)}
                className={`h-7 px-2.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-surface text-primary shadow-xs font-semibold"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Navigation and Custom Calendar Picker */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleShift("prev")}
            className="h-9 w-9 flex items-center justify-center rounded-[8px] border border-border bg-surface hover:bg-bg text-text-muted hover:text-text transition-colors cursor-pointer disabled:opacity-50"
            title="Mundur satu rentang"
            aria-label="Mundur satu rentang"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleShift("next")}
            className="h-9 w-9 flex items-center justify-center rounded-[8px] border border-border bg-surface hover:bg-bg text-text-muted hover:text-text transition-colors cursor-pointer disabled:opacity-50"
            title="Maju satu rentang"
            aria-label="Maju satu rentang"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Custom DateRangePicker */}
        <DateRangePicker
          value={currentRange}
          onChange={handleCustomRangeChange}
          placeholder="Pilih rentang tanggal"
        />
      </div>
    </div>
  );
}
