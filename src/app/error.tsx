"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Global error boundary rendering a user-friendly recovery interface
export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected runtime error for client diagnostics
    console.error("Runtime application error caught by boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-[10px] p-6 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-danger-soft text-danger flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h1 className="text-lg font-bold text-text mb-2">Terjadi Kendala Sistem</h1>
        <p className="text-xs text-text-muted mb-6 leading-relaxed">
          Permintaan atau halaman ini tidak dapat diproses secara normal. Silakan coba kembali atau kembali ke beranda operasional katering.
        </p>

        {error.digest && (
          <div className="mb-6 p-2.5 bg-bg border border-border rounded-[8px] text-[11px] font-mono text-text-muted select-all">
            Kode Referensi: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto h-9 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto h-9 px-4 rounded-[8px] border border-border bg-surface hover:bg-bg text-text text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-3.5 h-3.5 text-text-muted" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
