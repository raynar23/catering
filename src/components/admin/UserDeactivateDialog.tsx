"use client";

import React, { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UserRecord, updateUserApi } from "@/lib/api/users";
import { useToast } from "@/components/ui/Toast";
import {
  canDeactivateUser,
  UserGuardTarget,
} from "@/lib/auth/user-guard";

interface UserDeactivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserRecord | null;
  currentUserId: string;
  allUsers: UserRecord[];
  onSuccess: () => void;
}

// Confirmation dialog for activating or deactivating user accounts with guard enforcement
export function UserDeactivateDialog({
  open,
  onOpenChange,
  targetUser,
  currentUserId,
  allUsers,
  onSuccess,
}: UserDeactivateDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!targetUser) return null;

  const isDeactivating = targetUser.aktif;

  // Run business rule guards if deactivating
  let guardBlocked = false;
  let guardReason = "";

  if (isDeactivating) {
    const guardTargets: UserGuardTarget[] = allUsers.map((u) => ({
      id: u.id,
      role: u.role,
      aktif: u.aktif,
    }));

    const check = canDeactivateUser(
      { id: targetUser.id, role: targetUser.role, aktif: targetUser.aktif },
      currentUserId,
      guardTargets
    );

    if (!check.allowed) {
      guardBlocked = true;
      guardReason = check.reason ?? "Aksi tidak diizinkan oleh sistem";
    }
  }

  const handleConfirm = async () => {
    if (guardBlocked) return;

    setLoading(true);
    try {
      const res = await updateUserApi({
        id: targetUser.id,
        nama: targetUser.nama,
        role: targetUser.role,
        vendor_id: targetUser.vendor_id,
        no_hp: targetUser.no_hp,
        aktif: !targetUser.aktif,
      });

      if (res.success) {
        toast({
          title: "Berhasil",
          description: `Akun @${targetUser.username} berhasil ${
            isDeactivating ? "dinonaktifkan" : "diaktifkan kembali"
          }`,
          variant: "success",
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: "Gagal Mengubah Status",
          description: res.error ?? "Terjadi kesalahan",
          variant: "danger",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const title = isDeactivating
    ? `Nonaktifkan Akun @${targetUser.username}?`
    : `Aktifkan Kembali Akun @${targetUser.username}?`;

  const description = guardBlocked
    ? guardReason
    : isDeactivating
    ? `Pengguna "${targetUser.nama}" tidak akan dapat masuk ke sistem selama akun dalam status nonaktif. Seluruh data historis tetap aman.`
    : `Pengguna "${targetUser.nama}" akan dapat masuk kembali ke sistem menggunakan kata sandi yang telah terdaftar.`;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={
        guardBlocked
          ? "Tidak Dapat Dilanjutkan"
          : loading
          ? "Memproses..."
          : isDeactivating
          ? "Nonaktifkan Akun"
          : "Aktifkan Akun"
      }
      variant={isDeactivating ? "danger" : "primary"}
      onConfirm={handleConfirm}
      isProcessing={loading}
    />
  );
}
