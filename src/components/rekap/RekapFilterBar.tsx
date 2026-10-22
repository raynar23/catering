"use client";

import React from "react";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { parseISO, format } from "date-fns";
import { RekapPreset, getRekapPresetRange } from "@/lib/rekap";
import { RekapFilterOptions } from "@/lib/actions/rekap";

interface RekapFilterBarProps {
  preset: RekapPreset;
  dari: string;
  sampai: string;
  vendorId: string;
  bagianId: string;
  shiftId: string;
  activeTab: "harian" | "ringkasan";
  filterOptions: RekapFilterOptions;
  isLoading?: boolean;
  onPresetChange: (preset: RekapPreset, dari: string, sampai: string) => void;
  onCustomRangeChange: (dari: string, sampai: string) => void;
  onVendorChange: (vendorId: string) => void;
  onBagianChange: (bagianId: string) => void;
  onShiftChange: (shiftId: string) => void;
  onTabChange: (tab: "harian" | "ringkasan") => void;
  onOpenExport: () => void;
}

const PRESET_OPTIONS: Array<{ value: RekapPreset; label: string }> = [
  { value: "mingguan", label: "Mingguan" },
  { value: "bulanan", label: "Bulanan" },
  { value: "3_bulan", label: "3 Bulan" },
  { value: "6_bulan", label: "6 Bulan" },
  { value: "tahunan", label: "Tahunan" },
];

// Comprehensive filter bar managing period presets, calendar picker, dropdown filters, view tabs, and export
export function RekapFilterBar({
  preset,
  dari,
  sampai,
  vendorId,
  bagianId,
  shiftId,
  activeTab,
  filterOptions,
  isLoading = false,
  onPresetChange,
  onCustomRangeChange,
  onVendorChange,
  onBagianChange,
  onShiftChange,
  onTabChange,
  onOpenExport,
}: RekapFilterBarProps) {
  const currentRange: DateRange = {
    from: parseISO(dari),
    to: parseISO(sampai),
  };

  const handleSelectPreset = (newPreset: RekapPreset) => {
    const range = getRekapPresetRange(newPreset);
    onPresetChange(newPreset, range.dari, range.sampai);
  };

  const handleDateRangePickerChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const fromStr = format(range.from, "yyyy-MM-dd");
      const toStr = format(range.to, "yyyy-MM-dd");
      onCustomRangeChange(fromStr, toStr);
    } else if (range?.from) {
      const fromStr = format(range.from, "yyyy-MM-dd");
      onCustomRangeChange(fromStr, fromStr);
    }
  };

  return (
    <div className="flex flex-col gap-3 py-2 select-none shrink-0">
      {/* Top Row: View Tabs Segmented & Export Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented Control for View Mode */}
        <div className="inline-flex items-center bg-[#F2F2F7] p-1 rounded-[8px] gap-1 shrink-0 self-start">
          <button
            type="button"
            onClick={() => onTabChange("harian")}
            className={`h-7 px-3.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "harian"
                ? "bg-surface text-primary shadow-xs font-semibold"
                : "text-text-muted hover:text-text"
            }`}
          >
            Rekap Harian
          </button>
          <button
            type="button"
            onClick={() => onTabChange("ringkasan")}
            className={`h-7 px-3.5 rounded-[6px] text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "ringkasan"
                ? "bg-surface text-primary shadow-xs font-semibold"
                : "text-text-muted hover:text-text"
            }`}
          >
            Ringkasan
          </button>
        </div>

        {/* Action: Export Modal Trigger */}
        <button
          type="button"
          onClick={onOpenExport}
          disabled={isLoading}
          className="h-9 px-4 rounded-[8px] bg-primary text-white text-xs font-semibold hover:bg-primary/95 transition-colors cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          Ekspor Dokumen
        </button>
      </div>

      {/* Bottom Row: Date Presets, DateRangePicker, and Dropdowns — fills full width so last filter aligns with Ekspor Dokumen */}
      <div className="flex flex-wrap items-center gap-2.5 w-full">
        {/* Date Preset Segmented Control */}
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

        {/* Custom Calendar DateRangePicker */}
        <DateRangePicker
          value={currentRange}
          onChange={handleDateRangePickerChange}
          placeholder="Pilih Rentang Tanggal"
          className="shrink-0"
        />

        {/* Spacer pushes the dropdowns to fill the rest of the row */}
        <div className="flex-1 min-w-0" />

        {/* Filter: Vendor */}
        <select
          value={vendorId}
          onChange={(e) => onVendorChange(e.target.value)}
          disabled={isLoading}
          className="h-9 text-xs rounded-[8px] border border-border bg-surface pl-2.5 pr-8 text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          aria-label="Filter Vendor"
        >
          <option value="">Semua Vendor</option>
          {filterOptions.vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.kode} - {v.nama}
            </option>
          ))}
        </select>

        {/* Filter: Bagian */}
        <select
          value={bagianId}
          onChange={(e) => onBagianChange(e.target.value)}
          disabled={isLoading}
          className="h-9 text-xs rounded-[8px] border border-border bg-surface pl-2.5 pr-8 text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          aria-label="Filter Bagian"
        >
          <option value="">Semua Bagian</option>
          {filterOptions.bagian.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nama} ({b.kelompok})
            </option>
          ))}
        </select>

        {/* Filter: Shift */}
        <select
          value={shiftId}
          onChange={(e) => onShiftChange(e.target.value)}
          disabled={isLoading}
          className="h-9 text-xs rounded-[8px] border border-border bg-surface pl-2.5 pr-8 text-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          aria-label="Filter Shift"
        >
          <option value="">Semua Shift</option>
          {filterOptions.shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nama} ({s.label})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
