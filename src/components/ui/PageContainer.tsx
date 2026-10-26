import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

// Fixed 1360px container ensuring zero-scroll layouts across desktop viewports while scrolling naturally on mobile
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[1360px] mx-auto flex-1 min-h-0 flex flex-col lg:overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}
