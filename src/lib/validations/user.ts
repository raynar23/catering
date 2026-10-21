// Validation schemas for user account creation, profile update, and password reset
import { z } from "zod";

// Username must be 3-30 lowercase characters with numbers, dots, or underscores
export const usernameRegex = /^[a-z0-9._]+$/;

// Phone number regex allowing optional + and 8-20 numeric/dash characters
export const phoneRegex = /^[+]?[0-9\s-]{8,20}$/;

export const createUserSchema = z
  .object({
    nama: z
      .string()
      .trim()
      .min(2, "Nama pengguna minimal 2 karakter")
      .max(100, "Nama pengguna maksimal 100 karakter"),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Username minimal 3 karakter")
      .max(30, "Username maksimal 30 karakter")
      .regex(usernameRegex, "Username hanya boleh huruf kecil, angka, titik, dan garis bawah"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(100, "Password maksimal 100 karakter"),
    role: z.enum(["admin_ga", "vendor"]),
    vendor_id: z.string().uuid("ID Vendor tidak valid").optional().nullable(),
    no_hp: z
      .string()
      .trim()
      .regex(phoneRegex, "Format nomor HP tidak valid (contoh: 08123456789)")
      .optional()
      .nullable()
      .or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.role === "vendor") {
        return !!data.vendor_id;
      }
      return true;
    },
    {
      message: "Akun vendor wajib memilih vendor",
      path: ["vendor_id"],
    }
  );

export const updateUserSchema = z
  .object({
    id: z.string().uuid("ID pengguna tidak valid"),
    nama: z
      .string()
      .trim()
      .min(2, "Nama pengguna minimal 2 karakter")
      .max(100, "Nama pengguna maksimal 100 karakter"),
    role: z.enum(["admin_ga", "vendor"]),
    vendor_id: z.string().uuid("ID Vendor tidak valid").optional().nullable(),
    no_hp: z
      .string()
      .trim()
      .regex(phoneRegex, "Format nomor HP tidak valid (contoh: 08123456789)")
      .optional()
      .nullable()
      .or(z.literal("")),
    aktif: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.role === "vendor") {
        return !!data.vendor_id;
      }
      return true;
    },
    {
      message: "Akun vendor wajib memilih vendor",
      path: ["vendor_id"],
    }
  );

export const resetPasswordSchema = z.object({
  userId: z.string().uuid("ID pengguna tidak valid"),
  newPassword: z
    .string()
    .min(8, "Password baru minimal 8 karakter")
    .max(100, "Password baru maksimal 100 karakter"),
});

export const updateSelfProfileSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(2, "Nama pengguna minimal 2 karakter")
    .max(100, "Nama pengguna maksimal 100 karakter"),
  no_hp: z
    .string()
    .trim()
    .regex(phoneRegex, "Format nomor HP tidak valid (contoh: 08123456789)")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const changeSelfPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter")
      .max(100, "Password baru maksimal 100 karakter"),
    confirmPassword: z.string().min(8, "Konfirmasi password minimal 8 karakter"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password baru tidak cocok",
    path: ["confirmPassword"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateSelfProfileInput = z.infer<typeof updateSelfProfileSchema>;
export type ChangeSelfPasswordInput = z.infer<typeof changeSelfPasswordSchema>;
