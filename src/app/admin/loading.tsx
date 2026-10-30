import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

// Instant skeleton feedback shown immediately when transitioning between admin routes
export default function AdminLoading() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 animate-in fade-in duration-150">
      <div className="space-y-1.5 shrink-0">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex items-center justify-between gap-3 py-2 shrink-0">
        <Skeleton className="h-8.5 w-64 rounded-[8px]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8.5 w-24 rounded-[8px]" />
          <Skeleton className="h-8.5 w-28 rounded-[8px]" />
        </div>
      </div>

      <div className="flex-1 min-h-[300px] border border-black/[0.08] rounded-[12px] p-4 bg-white space-y-3">
        <Skeleton className="h-8 w-full rounded-[6px]" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-[6px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
