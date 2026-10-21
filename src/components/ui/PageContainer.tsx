import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

// Fixed 1360px container ensuring zero-scroll layouts across desktop viewports
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[1360px] mx-auto px-4 sm:px-6 flex-1 min-h-0 flex flex-col overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}
