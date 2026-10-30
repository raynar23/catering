"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Admin error boundary rendered inside AppShell
export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    // Log unexpected admin segment error
    console.error("Admin workspace error:", error);
  }, [error]);

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-surface border border-border rounded-[10px] p-5 shadow-xs text-center">
        <div className="w-10 h-10 rounded-full bg-danger-soft text-danger flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-bold text-text mb-1">Gagal Memuat Halaman</h2>
        <p className="text-xs text-text-muted mb-3 leading-relaxed">
          Terjadi kendala saat memuat data pada modul admin ini. Silakan muat ulang atau kembali ke dashboard.
        </p>

        {error?.message && (
          <div className="mb-4 p-2.5 rounded-[8px] bg-red-500/10 border border-red-500/20 text-left">
            <p className="text-[11px] font-mono text-danger break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-[10px] font-mono text-text-muted mt-1">
                ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="h-8.5 px-3.5 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang</span>
          </button>
          <a
            href="/admin/dashboard"
            className="h-8.5 px-3.5 rounded-[8px] border border-border bg-surface hover:bg-bg text-text text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Dashboard</span>
          </a>
        </div>
      </div>
    </div>
  );
}
