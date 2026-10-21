"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface NumberInputCellProps {
  value: number | null;
  onChange?: (val: number | null) => void;
  disabled?: boolean;
  isDirty?: boolean;
  isCustom?: boolean;
  isConflict?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

// Numerical cell input supporting integer >= 0, null unassigned, and dirty indicators
export function NumberInputCell({
  value,
  onChange,
  disabled = false,
  isDirty = false,
  isCustom = false,
  isConflict = false,
  placeholder = "-",
  ariaLabel,
  className,
}: NumberInputCellProps) {
  const displayValue = value === null || value === undefined ? "" : String(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange || disabled) return;
    const raw = e.target.value.trim();
    if (raw === "") {
      onChange(null);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    // Disallow negative sign or decimal point
    if (e.key === "-" || e.key === "." || e.key === "e" || e.key === "E") {
      e.preventDefault();
    }
  };

  if (disabled) {
    return (
      <div
        className={cn(
          "w-full h-8 px-2 flex items-center justify-end font-mono text-sm text-text select-none",
          value === null && "text-muted",
          className
        )}
      >
        {value === null ? placeholder : value}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <input
        type="number"
        min={0}
        step={1}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          "w-full h-8 px-2 text-right font-mono text-sm bg-transparent rounded-[6px] border border-transparent transition-all outline-none",
          "hover:border-border hover:bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/30",
          isDirty && "border-amber-400/80 bg-amber-50/30 font-semibold text-amber-900",
          isConflict && "border-rose-400 bg-rose-50/40 ring-1 ring-rose-300",
          isCustom && !isDirty && "text-blue-900 font-medium",
          className
        )}
      />
      {isDirty && (
        <span
          title="Perubahan belum tersimpan"
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 pointer-events-none"
        />
      )}
      {isConflict && (
        <span
          title="Diubah oleh pengguna lain di server"
          className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-rose-500 pointer-events-none"
        />
      )}
    </div>
  );
}
