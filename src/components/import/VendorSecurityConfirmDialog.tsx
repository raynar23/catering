// Security and governance confirmation dialog for unmapped import vendors
import React from "react";
import Link from "next/link";
import { ShieldAlert, ExternalLink, Building2, UserPlus, ArrowRight, X, AlertTriangle } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Security Badge */}
        <div className="p-5 border-b border-border bg-bg/50 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  Keamanan & Multi-Tenant
                </span>
                <span className="text-xs text-text-muted">
                  {`${newVendors.length} Vendor Baru`}
                </span>
              </div>
              <h3 className="text-base font-bold text-text mt-1">
                Konfirmasi Keamanan: Mitra Vendor Belum Terdaftar
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Sistem mendeteksi nama vendor dalam berkas impor yang belum tercatat pada database master.
              </p>
            </div>
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

        {/* Scrollable Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Security perspective banner */}
          <div className="p-3.5 rounded-lg bg-primary-50/60 dark:bg-primary-950/20 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Perspektif Keamanan & Tata Kelola Multi-Tenant:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-text-muted leading-relaxed pl-1">
              <li>
                <strong className="text-text">Isolasi Hak Akses:</strong> Setiap mitra vendor katering memiliki akun login portal tersendiri untuk melihat porsi dan status pesanan khusus bagian mereka.
              </li>
              <li>
                <strong className="text-text">Kredensial Resmi:</strong> Vendor baru memerlukan akun resmi di Manajemen User agar dapat mengakses sistem secara aman.
              </li>
              <li>
                <strong className="text-text">Pencegahan Duplikasi:</strong> Pastikan nama vendor di berkas bukan merupakan variasi salah ketik dari vendor yang sudah ada.
              </li>
            </ul>
          </div>

          {/* List of Detected New Vendors */}
          <div>
            <label className="text-[11px] font-semibold text-text uppercase tracking-wider block mb-2">
              Daftar Vendor Baru Terdeteksi ({newVendors.length}):
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-bg border border-border rounded-lg max-h-32 overflow-y-auto">
              {newVendors.map((vendorName, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border text-text font-medium text-xs shadow-2xs"
                >
                  <Building2 className="w-3.5 h-3.5 text-text-muted" />
                  {vendorName}
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold ml-1">
                    (Baru)
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Option 1: Manual Registration Guidance */}
          <div className="p-3.5 rounded-lg border border-border bg-surface space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text text-xs flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-text-muted/15 text-text flex items-center justify-center text-[10px] font-bold">1</span>
                Opsi 1: Tambahkan Vendor Manual Terlebih Dahulu
              </span>
              <span className="text-[10px] text-text-muted bg-bg px-2 py-0.5 rounded border border-border">
                Rekomendasi
              </span>
            </div>
            <p className="text-text-muted leading-relaxed">
              Jika Anda ingin mendaftarkan vendor lengkap dengan nomor kontak dan detail resmi terlebih dahulu, buka tautan di bawah pada tab baru (draf impor Anda tetap tersimpan):
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/admin/master/vendor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg hover:bg-border/40 text-text border border-border font-medium transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>Buka Data Vendor</span>
                <ExternalLink className="w-3 h-3 text-text-muted" />
              </Link>
              <Link
                href="/admin/manajemen-user"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg hover:bg-border/40 text-text border border-border font-medium transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-primary" />
                <span>Buka Manajemen User</span>
                <ExternalLink className="w-3 h-3 text-text-muted" />
              </Link>
            </div>
          </div>

          {/* Option 2: Automated Ingestion & Provisioning */}
          <div className="p-3.5 rounded-lg border border-primary/30 bg-primary-50/20 dark:bg-primary-950/10 space-y-2">
            <span className="font-semibold text-text text-xs flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">2</span>
              Opsi 2: Tetap Lanjut & Otomatis Buat Akun Vendor
            </span>
            <p className="text-text-muted leading-relaxed">
              Sistem akan otomatis mendaftarkan entitas vendor baru ke <strong className="text-text">Master Data Vendor</strong> sekaligus membuatkan akun login resmi di <strong className="text-text">Manajemen User</strong> (Role: Vendor, dengan kredensial login aktif yang dapat dikelola atau direset oleh Admin).
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-bg/30 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border hover:bg-bg text-text text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Kembali & Periksa Berkas
          </button>

          <button
            type="button"
            onClick={onConfirmAutoRegister}
            className="px-4 py-2 bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <span>Tetap Lanjut & Buat Akun Otomatis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
