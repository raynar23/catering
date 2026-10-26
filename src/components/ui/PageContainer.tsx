import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

// Fixed 1360px container enforcing 100vh zero-scroll layouts by default, with opt-in scrollable for dashboard
export function PageContainer({
  children,
  className,
  scrollable = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[1360px] mx-auto flex-1 min-h-0 flex flex-col",
        scrollable ? "overflow-y-auto" : "overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}
