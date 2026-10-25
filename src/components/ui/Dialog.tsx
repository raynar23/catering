"use client";

import React, { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const MAX_WIDTH_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

// Accessible modal dialog adhering to 10px corner radius and clean shadow specs
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidth = "lg",
  className,
}: DialogProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-desc" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-[2px] transition-opacity duration-150"
        onClick={() => onOpenChange(false)}
      />

      <div
        className={cn(
          "relative z-10 w-full bg-surface border border-black/[0.08] rounded-[14px] shadow-[0_24px_48px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.06)] flex flex-col max-h-[90dvh] overflow-hidden transition-all duration-150",
          MAX_WIDTH_MAP[maxWidth],
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between px-5 py-4 border-b border-[#E5E5EA] bg-[#FBFBFC]">
            <div className="min-w-0 pr-4">
              {title && (
                <h2
                  id="dialog-title"
                  className="text-[15px] font-semibold text-text tracking-tight truncate"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p id="dialog-desc" className="text-xs text-text-muted mt-0.5 font-normal">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-6.5 h-6.5 rounded-full bg-[#E5E5EA]/70 hover:bg-[#D1D1D6] text-text-muted hover:text-text flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="p-5 overflow-y-auto flex-1 min-h-0 text-sm text-text">
          {children}
        </div>
      </div>
    </div>
  );
}
