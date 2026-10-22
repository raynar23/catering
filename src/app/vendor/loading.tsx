import React from "react";
import { Loader2 } from "lucide-react";

// Vendor route segment loading fallback rendered inside AppShell
export default function VendorLoading() {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-2.5">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="text-xs font-medium text-text-muted">
          Memuat portal vendor...
        </span>
      </div>
    </div>
  );
}
