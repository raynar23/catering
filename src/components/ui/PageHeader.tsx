import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

// Fixed 56px header for page title, single-line subtitle, and action buttons
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "min-h-[56px] shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 border-b border-[#E5E5EA] py-2.5 sm:py-2",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-text truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-[#86868B] font-normal truncate mt-0.5 tracking-normal">
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
