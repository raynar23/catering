"use client";

import React from "react";
import { Plus, FileSpreadsheet } from "lucide-react";
import { SegmentedControl } from "./SegmentedControl";
import { cn } from "@/lib/utils";

interface MasterToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  addButtonLabel: string;
  onAddClick: () => void;
  onExportClick?: () => void;
  searchPlaceholder?: string;
  className?: string;
}

// Shared toolbar providing search filter, status segmented control, and primary add action
export function MasterToolbar({
  search,
  onSearchChange,
  statusFilter = "all",
  onStatusFilterChange,
  addButtonLabel,
  onAddClick,
  onExportClick,
  searchPlaceholder = "Cari data...",
  className,
}: MasterToolbarProps) {
  const statusOptions = [
    { value: "all", label: "Semua" },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
  ];

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 py-2 sm:py-3 select-none shrink-0",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2 sm:gap-3 min-w-0">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-8.5 px-3 w-full sm:max-w-xs rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-[#8A8A90] shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all"
        />

        <div className="flex items-center justify-between gap-2 sm:contents">
          {onStatusFilterChange && (
            <div className="overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
              <SegmentedControl
                options={statusOptions}
                value={statusFilter}
                onChange={onStatusFilterChange}
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:hidden">
            {onExportClick && (
              <button
                type="button"
                onClick={onExportClick}
                className="h-8 px-2.5 rounded-[8px] border border-[#003366]/30 bg-[#003366]/5 hover:bg-[#003366]/10 text-primary text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0"
                title="Ekspor data ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Ekspor</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAddClick}
              className="h-8 px-3 rounded-[8px] bg-primary hover:bg-[#007BB8] active:bg-[#006CA2] text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.08)] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah</span>
            </button>
          </div>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {onExportClick && (
          <button
            type="button"
            onClick={onExportClick}
            className="h-8.5 px-3 rounded-[8px] border border-[#003366]/30 bg-[#003366]/5 hover:bg-[#003366]/10 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Unduh data ke berkas Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            <span>Ekspor Excel</span>
          </button>
        )}

        <button
          type="button"
          onClick={onAddClick}
          className="h-8.5 px-3.5 rounded-[8px] bg-primary hover:bg-[#007BB8] active:bg-[#006CA2] text-white text-xs font-semibold items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.08)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          <span>{addButtonLabel}</span>
        </button>
      </div>
    </div>
  );
}
