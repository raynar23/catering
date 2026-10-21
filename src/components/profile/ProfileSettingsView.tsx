"use client";

import React, { useState } from "react";
import { Profile } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { updateSelfProfileAction, changeSelfPasswordAction } from "@/lib/actions/profile";
import { useToast } from "@/components/ui/Toast";
import { getSystemInfo } from "@/lib/version";
import { Eye, EyeOff, Save, KeyRound, User } from "lucide-react";

interface ProfileSettingsViewProps {
  profile: Profile;
  vendorName?: string | null;
}

// User profile and credentials settings view with system version footer
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
      setPasswordError("Password lama wajib diisi");
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
    <div className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Card 1: Data Profil Akun */}
        <div className="bg-surface border border-border rounded-[10px] p-5 flex flex-col">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-text">Informasi Profil</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Username (Readonly) */}
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Username
                </label>
                <input
                  type="text"
                  disabled
                  value={`@${profile.username}`}
                  className="w-full h-9 px-3 rounded-[8px] border border-border bg-bg text-xs font-mono text-text-muted cursor-not-allowed"
                />
              </div>

              {/* Role & Vendor (Readonly) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Role Akun
                  </label>
                  <div className="h-9 flex items-center">
                    <StatusBadge status={profile.role} />
                  </div>
                </div>

                {profile.role === "vendor" && (
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Vendor Mitra
                    </label>
                    <div className="h-9 flex items-center text-xs font-medium text-text">
                      {vendorName || "Vendor Terdaftar"}
                    </div>
                  </div>
                )}
              </div>

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
                  className="w-full h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                  className="w-full h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {profileError && <p className="text-xs text-danger">{profileError}</p>}
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="h-9 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{profileLoading ? "Menyimpan..." : "Simpan Profil"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Keamanan Kata Sandi */}
        <div className="bg-surface border border-border rounded-[10px] p-5 flex flex-col">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
            <KeyRound className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-text">Keamanan Kata Sandi</h2>
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
                    placeholder="Masukkan password lama"
                    className="w-full h-9 pl-3 pr-10 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-2 top-2 text-text-muted hover:text-text cursor-pointer"
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
                    className="w-full h-9 pl-3 pr-10 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-2 top-2 text-text-muted hover:text-text cursor-pointer"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.
                </p>
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
                    className="w-full h-9 pl-3 pr-10 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2 top-2 text-text-muted hover:text-text cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && <p className="text-xs text-danger">{passwordError}</p>}
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="h-9 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{passwordLoading ? "Memproses..." : "Perbarui Password"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* System Version Footer (mt-auto) */}
      <footer className="mt-auto pt-6 pb-2 select-none">
        <div className="border-t border-border/60 pt-3 text-center">
          <p className="text-xs text-text-muted font-medium">
            {systemInfo.label}
          </p>
        </div>
      </footer>
    </div>
  );
}
