"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { UserRecord, resetUserPasswordApi } from "@/lib/api/users";
import { useToast } from "@/components/ui/Toast";
import { Eye, EyeOff } from "lucide-react";

interface UserResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserRecord | null;
  onSuccess?: () => void;
}

// Modal dialog allowing Admin GA to set a new password for any user account
export function UserResetPasswordDialog({
  open,
  onOpenChange,
  targetUser,
  onSuccess,
}: UserResetPasswordDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirmPassword("");
      setError(null);
      setShowPassword(false);
    }
  }, [open]);

  if (!targetUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 8) {
      setError("Password baru minimal 8 karakter");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }

    setLoading(true);
    try {
      const res = await resetUserPasswordApi({
        userId: targetUser.id,
        newPassword: password,
      });

      if (res.success) {
        toast({
          title: "Berhasil",
          description: `Password untuk akun @${targetUser.username} berhasil direset`,
          variant: "success",
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(res.error ?? "Gagal mereset password pengguna");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reset Password Pengguna"
      description={`Atur ulang kata sandi login untuk pengguna @${targetUser.username} (${targetUser.nama}).`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Info Card */}
        <div className="bg-bg border border-border rounded-[8px] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Nama Pengguna:</span>
            <span className="font-semibold text-text">{targetUser.nama}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-text-muted">Username / Email:</span>
            <span className="font-mono text-text">@{targetUser.username}</span>
          </div>
        </div>

        {/* Password Baru */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">
            Password Baru <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full h-9 pl-3 pr-10 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-2 text-text-muted hover:text-text cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Konfirmasi Password */}
        <div>
          <label className="block text-xs font-semibold text-text mb-1">
            Konfirmasi Password Baru <span className="text-danger">*</span>
          </label>
          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ulangi password baru"
            className="w-full h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-[8px] border border-border bg-surface hover:bg-bg text-xs font-medium text-text transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-9 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-xs font-medium text-white transition-colors cursor-pointer"
          >
            {loading ? "Menyimpan..." : "Reset Password"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
