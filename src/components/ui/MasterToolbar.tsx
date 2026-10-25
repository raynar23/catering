"use client";

import React from "react";
import { Plus } from "lucide-react";
import { SegmentedControl } from "./SegmentedControl";
import { cn } from "@/lib/utils";

interface MasterToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  addButtonLabel: string;
  onAddClick: () => void;
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
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-3 select-none",
        className
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-8.5 px-3 w-full max-w-xs rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-[#8A8A90] shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all"
        />

        {onStatusFilterChange && (
          <SegmentedControl
            options={statusOptions}
            value={statusFilter}
            onChange={onStatusFilterChange}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onAddClick}
        className="h-8.5 px-3.5 rounded-[8px] bg-primary hover:bg-[#007BB8] active:bg-[#006CA2] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.08)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <Plus className="w-4 h-4" />
        <span>{addButtonLabel}</span>
      </button>
    </div>
  );
}
