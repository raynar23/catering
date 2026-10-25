"use client";

import React, { useState } from "react";
import { Profile } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { updateSelfProfileAction, changeSelfPasswordAction } from "@/lib/actions/profile";
import { useToast } from "@/components/ui/Toast";
import { getSystemInfo } from "@/lib/version";
import { formatDate } from "@/lib/format";
import {
  Eye,
  EyeOff,
  Save,
  KeyRound,
  User,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Lock,
} from "lucide-react";

interface ProfileSettingsViewProps {
  profile: Profile;
  vendorName?: string | null;
}

// Full container profile and security settings view styled to Apple HIG standards
export function ProfileSettingsView({ profile, vendorName }: ProfileSettingsViewProps) {
  const { toast } = useToast();
  const systemInfo = getSystemInfo();

  // Profile form state
  const [nama, setNama] = useState(profile.nama);
  const [noHp, setNoHp] = useState(profile.no_hp ?? "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const initials = profile.nama
    ? profile.nama
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (!nama.trim() || nama.trim().length < 2) {
      setProfileError("Nama lengkap minimal 2 karakter");
      return;
    }

    setProfileLoading(true);
    try {
      const res = await updateSelfProfileAction({
        nama: nama.trim(),
        no_hp: noHp.trim() || null,
      });

      if (res.success) {
        toast({
          title: "Berhasil",
          description: "Profil pengguna berhasil diperbarui",
          variant: "success",
        });
      } else {
        setProfileError(res.error ?? "Gagal memperbarui profil");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // Change account password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Password saat ini wajib diisi");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password baru tidak cocok");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changeSelfPasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        toast({
          title: "Berhasil",
          description: "Password berhasil diperbarui. Silakan gunakan password baru pada login berikutnya.",
          variant: "success",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(res.error ?? "Gagal mengubah password");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto w-full gap-4 sm:gap-5 pb-2">
      {/* Account Hero Summary Banner - Full Container Width */}
      <div className="w-full bg-surface border border-border rounded-[10px] p-4 sm:p-5 shadow-xs shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#006CA2] to-[#0E63A1] text-white font-bold text-base sm:text-lg flex items-center justify-center shrink-0 shadow-xs ring-4 ring-primary/10 select-none">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-text truncate">
                {profile.nama}
              </h1>
              <StatusBadge status={profile.role} />
              {profile.role === "vendor" && vendorName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[6px] text-xs font-medium bg-[#006CA2]/10 text-primary border border-[#006CA2]/15">
                  <Building2 className="w-3 h-3" />
                  {vendorName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted mt-1.5 flex-wrap">
              <span className="font-mono text-text-muted/90">@{profile.username}</span>
              <span className="text-border">|</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Akun Aktif
              </span>
              {profile.created_at && (
                <>
                  <span className="text-border">|</span>
                  <span className="inline-flex items-center gap-1 text-text-muted">
                    <Calendar className="w-3.5 h-3.5" />
                    Terdaftar {formatDate(profile.created_at)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <div className="px-3 py-1.5 rounded-[8px] bg-bg border border-border text-[11.5px] text-text-muted flex items-center gap-1.5 select-none">
            <Lock className="w-3.5 h-3.5 text-text-muted/70" />
            <span>
              {profile.role === "admin_ga"
                ? "Hak Akses Penuh Admin GA"
                : "Hak Akses Vendor Catering"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Cards Grid - Full Container Width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 flex-1 min-h-0 w-full">
        {/* Card 1: Data Profil Akun */}
        <div className="bg-surface border border-border rounded-[10px] p-5 sm:p-6 flex flex-col shadow-xs">
          <div className="flex items-start gap-3 pb-4 mb-4 border-b border-border shrink-0">
            <div className="w-9 h-9 rounded-[8px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">Informasi Profil</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Kelola nama lengkap dan nomor kontak koordinasi akun Anda
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Username & Role Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`@${profile.username}`}
                    className="w-full h-9 px-3 rounded-[8px] border border-border bg-bg text-xs font-mono text-text-muted cursor-not-allowed select-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Role Akun
                  </label>
                  <div className="h-9 px-3 rounded-[8px] border border-border bg-bg flex items-center">
                    <StatusBadge status={profile.role} />
                  </div>
                </div>
              </div>

              {profile.role === "vendor" && (
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Vendor Mitra
                  </label>
                  <div className="h-9 px-3 rounded-[8px] border border-border bg-bg flex items-center text-xs font-medium text-text">
                    <Building2 className="w-3.5 h-3.5 text-text-muted mr-2" />
                    {vendorName || "Vendor Terdaftar"}
                  </div>
                </div>
              )}

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Nama Lengkap <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="w-full h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Nama ini ditampilkan pada seluruh rekapitulasi dan verifikasi operasional
                </p>
              </div>

              {/* Nomor Handphone / WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Nomor Handphone / WhatsApp
                </label>
                <input
                  type="text"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Digunakan untuk notifikasi dan kontak darurat operasional
                </p>
              </div>

              {profileError && (
                <div className="p-2.5 rounded-[8px] bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
                  {profileError}
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-border flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11.5px] text-text-muted hidden sm:inline">
                Perubahan data profil langsung berlaku di sistem
              </span>
              <button
                type="submit"
                disabled={profileLoading}
                className="h-9 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50 ml-auto"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{profileLoading ? "Menyimpan..." : "Simpan Profil"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Keamanan Kata Sandi */}
        <div className="bg-surface border border-border rounded-[10px] p-5 sm:p-6 flex flex-col shadow-xs">
          <div className="flex items-start gap-3 pb-4 mb-4 border-b border-border shrink-0">
            <div className="w-9 h-9 rounded-[8px] bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <KeyRound className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text">Keamanan Kata Sandi</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Perbarui kata sandi secara berkala untuk menjaga keamanan akun
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Password Lama */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Password Saat Ini <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    className="w-full h-9 pl-3 pr-10 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-2 top-2 p-1 text-text-muted hover:text-text cursor-pointer transition-colors"
                    title={showCurrent ? "Sembunyikan" : "Tampilkan"}
                    aria-label={showCurrent ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Password Baru <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full h-9 pl-3 pr-10 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-2 top-2 p-1 text-text-muted hover:text-text cursor-pointer transition-colors"
                    title={showNew ? "Sembunyikan" : "Tampilkan"}
                    aria-label={showNew ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Konfirmasi Password Baru <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full h-9 pl-3 pr-10 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2 top-2 p-1 text-text-muted hover:text-text cursor-pointer transition-colors"
                    title={showConfirm ? "Sembunyikan" : "Tampilkan"}
                    aria-label={showConfirm ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Hint */}
              <div className="p-2.5 rounded-[8px] bg-bg border border-border text-[11.5px] text-text-muted flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Gunakan minimal 8 karakter dengan kombinasi huruf dan angka untuk keamanan optimal.</span>
              </div>

              {passwordError && (
                <div className="p-2.5 rounded-[8px] bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
                  {passwordError}
                </div>
              )}
            </div>

            <div className="pt-4 mt-6 border-t border-border flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11.5px] text-text-muted hidden sm:inline">
                Sesi login aktif Anda tetap berlanjut
              </span>
              <button
                type="submit"
                disabled={passwordLoading}
                className="h-9 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50 ml-auto"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{passwordLoading ? "Memproses..." : "Perbarui Password"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* System Version Footer */}
      <footer className="mt-auto pt-3 pb-1 select-none shrink-0">
        <div className="border-t border-border/60 pt-3 text-center">
          <p className="text-xs text-text-muted font-medium">
            {systemInfo.label}
          </p>
        </div>
      </footer>
    </div>
  );
}
