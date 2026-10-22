import React from "react";
import Link from "next/link";
import { Compass, Home } from "lucide-react";

// Global not-found error page for unresolved routes
export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-[10px] p-6 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-primary-soft text-primary flex items-center justify-center mx-auto mb-4">
          <Compass className="w-6 h-6" />
        </div>

        <h1 className="text-lg font-bold text-text mb-2">404 - Halaman Tidak Ditemukan</h1>
        <p className="text-xs text-text-muted mb-6 leading-relaxed">
          Alamat atau tautan yang Anda tuju tidak tersedia atau telah dipindahkan ke menu lain pada sistem katering TPS.
        </p>

        <div className="flex justify-center">
          <Link
            href="/"
            className="h-9 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
