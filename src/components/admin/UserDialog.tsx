"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { UserRecord, createUserApi, updateUserApi } from "@/lib/api/users";
import { useToast } from "@/components/ui/Toast";
import { VendorRecord, getVendorList } from "@/lib/actions/vendor";
import { usernameRegex } from "@/lib/validations/user";
import {
  canDeactivateUser,
  canChangeUserRole,
  UserGuardTarget,
} from "@/lib/auth/user-guard";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit?: UserRecord | null;
  currentUserId: string;
  allUsers: UserRecord[];
  onSuccess: () => void;
}

// Dialog for adding and editing user accounts with validation and role constraints
export function UserDialog({
  open,
  onOpenChange,
  userToEdit,
  currentUserId,
  allUsers,
  onSuccess,
}: UserDialogProps) {
  const { toast } = useToast();
  const isEdit = !!userToEdit;

  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin_ga" | "vendor">("admin_ga");
  const [vendorId, setVendorId] = useState("");
  const [noHp, setNoHp] = useState("");
  const [aktif, setAktif] = useState(true);

  // Load vendors list for vendor selection dropdown
  useEffect(() => {
    let active = true;
    async function loadVendors() {
      const res = await getVendorList();
      if (active && res.data) {
        setVendors(res.data.filter((v) => v.aktif));
      }
    }
    loadVendors();
    return () => {
      active = false;
    };
  }, []);

  // Initialize form fields when opening or switching mode
  useEffect(() => {
    if (open) {
      setErrors({});
      if (userToEdit) {
        setNama(userToEdit.nama);
        setUsername(userToEdit.username);
        setPassword("");
        setRole(userToEdit.role);
        setVendorId(userToEdit.vendor_id ?? "");
        setNoHp(userToEdit.no_hp ?? "");
        setAktif(userToEdit.aktif);
      } else {
        setNama("");
        setUsername("");
        setPassword("");
        setRole("admin_ga");
        setVendorId("");
        setNoHp("");
        setAktif(true);
      }
    }
  }, [open, userToEdit]);

  const isSelf = userToEdit?.id === currentUserId;

  // Check if role change is permitted
  const guardTargets: UserGuardTarget[] = allUsers.map((u) => ({
    id: u.id,
    role: u.role,
    aktif: u.aktif,
  }));

  const roleChangeAllowed = userToEdit
    ? canChangeUserRole(
        { id: userToEdit.id, role: userToEdit.role, aktif: userToEdit.aktif },
        role === "admin_ga" ? "vendor" : "admin_ga",
        currentUserId,
        guardTargets
      ).allowed
    : true;

  const deactivationAllowed = userToEdit
    ? canDeactivateUser(
        { id: userToEdit.id, role: userToEdit.role, aktif: userToEdit.aktif },
        currentUserId,
        guardTargets
      ).allowed
    : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const errs: Record<string, string> = {};
    if (!nama.trim() || nama.trim().length < 2) {
      errs.nama = "Nama pengguna minimal 2 karakter";
    }

    if (!isEdit) {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        errs.username = "Username minimal 3 karakter";
      } else if (!usernameRegex.test(cleanUsername)) {
        errs.username = "Username hanya boleh huruf kecil, angka, titik, dan garis bawah";
      }

      if (!password || password.length < 8) {
        errs.password = "Password awal minimal 8 karakter";
      }
    }

    if (role === "vendor" && !vendorId) {
      errs.vendor_id = "Akun vendor wajib memilih vendor mitra";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const res = await updateUserApi({
          id: userToEdit.id,
          nama: nama.trim(),
          role,
          vendor_id: role === "vendor" ? vendorId : null,
          no_hp: noHp.trim() || null,
          aktif,
        });

        if (res.success) {
          toast({
            title: "Berhasil",
            description: res.message ?? "Data pengguna berhasil diperbarui",
            variant: "success",
          });
          onOpenChange(false);
          onSuccess();
        } else {
          toast({
            title: "Gagal Memperbarui",
            description: res.error ?? "Terjadi kesalahan",
            variant: "danger",
          });
        }
      } else {
        const res = await createUserApi({
          nama: nama.trim(),
          username: username.trim().toLowerCase(),
          password,
          role,
          vendor_id: role === "vendor" ? vendorId : null,
          no_hp: noHp.trim() || null,
        });

        if (res.success) {
          toast({
            title: "Berhasil",
            description: res.message ?? "Pengguna baru berhasil ditambahkan",
            variant: "success",
          });
          onOpenChange(false);
          onSuccess();
        } else {
          toast({
            title: "Gagal Menambahkan",
            description: res.error ?? "Terjadi kesalahan",
            variant: "danger",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Data Pengguna" : "Tambah Pengguna Baru"}
      description={
        isEdit
          ? "Perbarui informasi akun, role otorisasi, dan status aktif pengguna."
          : "Buat akun login sistem baru dengan domain internal @tps.co.id."
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama Lengkap */}
        <div>
          <label className="block text-[12px] font-semibold text-[#1D1D1F] tracking-tight mb-1">
            Nama Lengkap <span className="text-[#FF3B30] font-bold">*</span>
          </label>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Muhammad Raynar"
            className="w-full h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-placeholder shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all"
          />
          {errors.nama && <p className="text-[11px] font-medium text-[#FF3B30] mt-1">{errors.nama}</p>}
        </div>

        {/* Username */}
        <div>
          <label className="block text-[12px] font-semibold text-[#1D1D1F] tracking-tight mb-1">
            Username {!isEdit && <span className="text-[#FF3B30] font-bold">*</span>}
          </label>
          <div className="relative">
            <input
              type="text"
              value={username}
              disabled={isEdit}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
              placeholder="Contoh: pic.lapangan"
              className="w-full h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-placeholder disabled:bg-[#F2F2F7] disabled:text-[#86868B] shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all"
            />
          </div>
          <p className="text-[11px] text-[#86868B] mt-1">
            Email login: {username.trim() ? `${username.trim().toLowerCase()}@tps.co.id` : "username@tps.co.id"}
          </p>
          {errors.username && <p className="text-[11px] font-medium text-[#FF3B30] mt-1">{errors.username}</p>}
        </div>

        {/* Initial Password (only when creating) */}
        {!isEdit && (
          <div>
            <label className="block text-[12px] font-semibold text-[#1D1D1F] tracking-tight mb-1">
              Password Awal <span className="text-[#FF3B30] font-bold">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-placeholder shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all"
            />
            {errors.password && <p className="text-[11px] font-medium text-[#FF3B30] mt-1">{errors.password}</p>}
          </div>
        )}

        {/* Role Selection (Apple Segmented Control) */}
        <div>
          <label className="block text-[12px] font-semibold text-[#1D1D1F] tracking-tight mb-1">
            Role Otorisasi <span className="text-[#FF3B30] font-bold">*</span>
          </label>
          <div className="bg-[#E5E5EA]/70 p-[2.5px] rounded-[8px] flex items-center">
            <button
              type="button"
              disabled={isSelf}
              onClick={() => {
                setRole("admin_ga");
                setVendorId("");
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-[6px] transition-all cursor-pointer ${
                role === "admin_ga"
                  ? "bg-white text-[#1D1D1F] shadow-[0_1px_2.5px_rgba(0,0,0,0.12),0_0.5px_1px_rgba(0,0,0,0.06)]"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              } ${isSelf ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Admin GA
            </button>
            <button
              type="button"
              disabled={isSelf || (isEdit && !roleChangeAllowed)}
              onClick={() => setRole("vendor")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-[6px] transition-all cursor-pointer ${
                role === "vendor"
                  ? "bg-white text-[#1D1D1F] shadow-[0_1px_2.5px_rgba(0,0,0,0.12),0_0.5px_1px_rgba(0,0,0,0.06)]"
                  : "text-[#6E6E73] hover:text-[#1D1D1F]"
              } ${isSelf || (isEdit && !roleChangeAllowed) ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Vendor Catering
            </button>
          </div>
          {isSelf && (
            <p className="text-[11px] text-[#86868B] mt-1">
              Role akun Anda sendiri tidak dapat diubah demi keamanan akses.
            </p>
          )}
        </div>

        {/* Vendor Selection (if role === 'vendor') */}
        {role === "vendor" && (
          <div>
            <label className="block text-[12px] font-semibold text-[#1D1D1F] tracking-tight mb-1">
              Pilih Vendor Mitra <span className="text-[#FF3B30] font-bold">*</span>
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full h-8.5 pl-3 pr-8 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all cursor-pointer"
            >
              <option value="">-- Pilih Vendor Mitra --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nama} ({v.kode})
                </option>
              ))}
            </select>
            {errors.vendor_id && <p className="text-[11px] font-medium text-[#FF3B30] mt-1">{errors.vendor_id}</p>}
          </div>
        )}

        {/* No. Handphone / WhatsApp */}
        <div>
          <label className="block text-[12px] font-semibold text-[#1D1D1F] tracking-tight mb-1">
            Nomor HP / WhatsApp (Opsional)
          </label>
          <input
            type="text"
            value={noHp}
            onChange={(e) => setNoHp(e.target.value)}
            placeholder="Contoh: 081234567890"
            className="w-full h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-placeholder shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all tabular-nums"
          />
        </div>

        {/* Status Aktif (only when editing) */}
        {isEdit && (
          <div className="pt-2 border-t border-[#E5E5EA]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text">Status Akun</p>
                <p className="text-[11px] text-[#86868B]">
                  {aktif ? "Akun aktif dan dapat login" : "Akun dinonaktifkan (login diblokir)"}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={aktif}
                  disabled={isSelf || (!aktif && false) || (aktif && !deactivationAllowed)}
                  onChange={(e) => setAktif(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-[#E5E5EA] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[18px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all after:shadow-sm peer-checked:bg-[#34C759]"></div>
              </label>
            </div>
            {isSelf && (
              <p className="text-[11px] text-[#86868B] mt-1">
                Anda tidak dapat menonaktifkan akun sendiri.
              </p>
            )}
            {!isSelf && !deactivationAllowed && aktif && (
              <p className="text-[11px] font-medium text-[#FF3B30] mt-1">
                Tidak dapat menonaktifkan akun: minimal satu Admin GA aktif harus tersisa.
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5EA]">
          <button
            type="button"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-8.5 px-4 rounded-[8px] bg-[#E5E5EA]/80 hover:bg-[#DCDCE2] active:bg-[#D1D1D6] text-xs font-semibold text-[#1D1D1F] transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-8.5 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-xs font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-3 focus:ring-primary/20"
          >
            {loading ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Akun"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
