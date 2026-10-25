"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

// macOS style segmented pill control without icons or decorative animations
export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center rounded-[8px] bg-[#E5E5EA]/70 p-[2.5px] border border-black/[0.04] select-none",
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "px-3 py-1 text-xs transition-all duration-150 cursor-pointer select-none",
              isSelected
                ? "bg-white text-text font-semibold rounded-[6px] shadow-[0_1px_2.5px_rgba(0,0,0,0.12),0_0.5px_1px_rgba(0,0,0,0.06)]"
                : "text-text-muted hover:text-text font-medium rounded-[6px]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
