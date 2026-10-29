// Minimalist confirmation dialog for unmapped import vendors
import React from "react";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";

interface VendorSecurityConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newVendors: string[];
  onConfirmAutoRegister: () => void;
}

export const VendorSecurityConfirmDialog: React.FC<VendorSecurityConfirmDialogProps> = ({
  isOpen,
  onClose,
  newVendors,
  onConfirmAutoRegister,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Clean Header */}
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-text">
              Vendor Belum Terdaftar
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Berkas impor memuat {`${newVendors.length} vendor`} yang belum terdaftar di database master.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-5 space-y-4 text-xs">
          {/* Vendor Chips */}
          <div>
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">
              Daftar Vendor:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {newVendors.map((vendorName, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-bg border border-border text-text font-medium text-xs"
                >
                  {vendorName}
                </span>
              ))}
            </div>
          </div>

          <p className="text-text-muted leading-relaxed">
            Demi keamanan data dan hak akses portal, setiap vendor katering memerlukan entitas master dan akun login resmi tersendiri.
          </p>

          {/* Option 1: Manual Links */}
          <div className="pt-2 border-t border-border flex items-center justify-between gap-2 text-xs">
            <span className="text-text-muted">
              Daftarkan manual terlebih dahulu:
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/master/vendor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <span>Data Vendor</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <span className="text-border">•</span>
              <Link
                href="/admin/manajemen-user"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <span>Manajemen User</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-bg/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border hover:bg-bg text-text text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onConfirmAutoRegister}
            className="px-4 py-2 bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Lanjut &amp; Buat Akun Otomatis
          </button>
        </div>
      </div>
    </div>
  );
};
