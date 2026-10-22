import React from "react";
import { Loader2 } from "lucide-react";

// Global loading indicator fallback while pages and route segments hydrate
export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs font-medium text-text-muted">
          Memuat data sistem katering...
        </span>
      </div>
    </div>
  );
}
