"use client";

import React, { useState, useRef, useEffect } from "react";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { startOfMonth, endOfMonth, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

// Preset range selector with standard date-fns helpers and react-day-picker
export function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = "Pilih Rentang Tanggal",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const applyPreset = (preset: "today" | "last7" | "thisMonth" | "lastMonth") => {
    const now = new Date();
    let range: DateRange;
    switch (preset) {
      case "today":
        range = { from: startOfDay(now), to: endOfDay(now) };
        break;
      case "last7":
        range = { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
        break;
      case "thisMonth":
        range = { from: startOfMonth(now), to: endOfMonth(now) };
        break;
      case "lastMonth": {
        const prev = subMonths(now, 1);
        range = { from: startOfMonth(prev), to: endOfMonth(prev) };
        break;
      }
    }
    onChange?.(range);
    setOpen(false);
  };

  const displayText = value?.from
    ? value.to
      ? `${formatDate(value.from)} - ${formatDate(value.to)}`
      : formatDate(value.from)
    : placeholder;

  return (
    <div className={cn("relative inline-block text-xs", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-9 px-3 rounded-[8px] border border-border bg-surface text-text font-medium text-xs hover:bg-bg transition-colors flex items-center justify-between gap-3 min-w-[200px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 tabular-nums"
      >
        <span className={cn(!value?.from && "text-placeholder")}>
          {displayText}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 z-40 bg-surface border border-border rounded-[10px] shadow-xl p-3 flex flex-col md:flex-row gap-3 animate-in fade-in zoom-in-95">
          <div className="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-border pb-2 md:pb-0 md:pr-3 min-w-[120px]">
            <span className="text-[11px] font-semibold text-text-muted px-2 py-1 select-none">
              Preset
            </span>
            <button
              type="button"
              onClick={() => applyPreset("today")}
              className="text-left px-2 py-1.5 rounded-[6px] hover:bg-bg text-text text-xs cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset("last7")}
              className="text-left px-2 py-1.5 rounded-[6px] hover:bg-bg text-text text-xs cursor-pointer"
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => applyPreset("thisMonth")}
              className="text-left px-2 py-1.5 rounded-[6px] hover:bg-bg text-text text-xs cursor-pointer"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset("lastMonth")}
              className="text-left px-2 py-1.5 rounded-[6px] hover:bg-bg text-text text-xs cursor-pointer"
            >
              Bulan Lalu
            </button>
          </div>

          <div className="flex-1">
            <DayPicker
              mode="range"
              selected={value}
              onSelect={(range) => {
                onChange?.(range);
                if (range?.from && range?.to) {
                  setOpen(false);
                }
              }}
              classNames={{
                root: "p-0 text-xs",
                caption_label: "text-xs font-semibold text-text",
                nav: "space-x-1 flex items-center",
                day: "h-7 w-7 text-xs rounded-[6px] p-0 font-normal",
                selected: "bg-primary text-white hover:bg-primary",
                range_start: "rounded-l-[6px] bg-primary text-white",
                range_end: "rounded-r-[6px] bg-primary text-white",
                range_middle: "bg-primary-soft text-text rounded-none",
                today: "font-bold text-primary",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
