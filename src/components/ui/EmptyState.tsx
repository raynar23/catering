import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// Clean text-only empty state without generic illustrations or decorative emojis
export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex-1 min-h-[180px] flex flex-col items-center justify-center p-6 text-center select-none",
        className
      )}
    >
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {description && (
        <p className="text-xs text-text-muted mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
