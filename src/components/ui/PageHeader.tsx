import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

// Compact, consistent header for page title, single-line subtitle, and action buttons
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "min-h-[44px] sm:min-h-[48px] shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 border-b border-[#E5E5EA] pt-0.5 pb-1.5 sm:pt-1 sm:pb-2",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-[17px] sm:text-[20px] font-bold tracking-tight text-text truncate leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-[#86868B] font-normal truncate mt-0.5 tracking-normal">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {actions}
        </div>
      )}
    </header>
  );
}
