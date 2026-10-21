// Validation schema for Bagian (department) records
import { z } from "zod";

export const bagianSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(2, "Nama bagian minimal 2 karakter")
    .max(100, "Nama bagian maksimal 100 karakter"),
  kode: z.string().trim().max(20).optional().nullable(),
  kelompok: z.string().trim().max(50).optional().nullable(),
  lokasi_antar: z.string().trim().max(100).optional().nullable(),
  catatan_antar: z.string().trim().max(200).optional().nullable(),
  keterangan: z.string().trim().max(255).optional().nullable(),
  alias: z.union([
    z.string().trim(),
    z.array(z.string().trim()),
  ]).optional().nullable(),
  urutan: z.coerce.number().int().min(0, "Urutan harus bilangan non-negatif").default(0),
  aktif: z.boolean().default(true),
});

export type BagianFormInput = z.infer<typeof bagianSchema>;
