// Validation schema for Shift records
import { z } from "zod";
import { isValidTimeString } from "@/lib/date";

export const shiftSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(2, "Nama shift minimal 2 karakter")
    .max(50, "Nama shift maksimal 50 karakter"),
  label: z
    .string()
    .trim()
    .min(2, "Label shift minimal 2 karakter")
    .max(50, "Label shift maksimal 50 karakter"),
  alias: z.union([
    z.string().trim().min(1, "Alias shift minimal 1 karakter"),
    z.array(z.string().trim()).min(1, "Alias shift minimal 1 elemen"),
  ]),
  jam_mulai: z
    .string()
    .trim()
    .refine(isValidTimeString, "Format jam mulai tidak valid (contoh: 08:00)"),
  jam_selesai: z
    .string()
    .trim()
    .refine(isValidTimeString, "Format jam selesai tidak valid (contoh: 16:00 atau 24:00)"),
  batas_tiba: z
    .string()
    .trim()
    .refine(isValidTimeString, "Format batas tiba tidak valid (contoh: 10:00)"),
  urutan: z.coerce.number().int().min(0, "Urutan harus bilangan bulat non-negatif").default(0),
  urutan_laporan: z.coerce.number().int().min(1, "Urutan laporan minimal 1").default(1),
  keterangan: z.string().trim().max(255).optional().nullable(),
  aktif: z.boolean().default(true),
});

export type ShiftFormInput = z.infer<typeof shiftSchema>;
