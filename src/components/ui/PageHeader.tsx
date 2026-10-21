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
        "h-14 shrink-0 flex items-center justify-between gap-4 border-b border-border py-2",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-normal text-text truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-text-muted truncate mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
