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
        "inline-flex items-center rounded-lg bg-[#EAEAEF] p-1 border border-border/50",
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
              "px-3 py-1 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer select-none",
              isSelected
                ? "bg-surface text-text shadow-xs"
                : "text-text-muted hover:text-text"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
