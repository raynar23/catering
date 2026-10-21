// Validation schema for catering period scheduling
import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const periodSchema = z.object({
  tanggal: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  shift_id: z.string().trim().regex(UUID_REGEX, "Pilihan shift tidak valid"),
  vendor_id: z.string().trim().regex(UUID_REGEX, "Pilihan vendor tidak valid"),
  keterangan: z.string().trim().max(255).optional().nullable(),
});

export const gantiVendorSchema = z.object({
  period_id: z.string().trim().regex(UUID_REGEX, "ID periode tidak valid"),
  vendor_baru_id: z.string().trim().regex(UUID_REGEX, "Pilihan vendor baru tidak valid"),
  alasan: z
    .string()
    .trim()
    .min(5, "Alasan penggantian vendor minimal 5 karakter")
    .max(255, "Alasan penggantian vendor maksimal 255 karakter"),
});

export type PeriodFormInput = z.infer<typeof periodSchema>;
export type GantiVendorInput = z.infer<typeof gantiVendorSchema>;
