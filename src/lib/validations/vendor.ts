// Validation schema for Vendor records
import { z } from "zod";

export const vendorSchema = z.object({
  kode: z
    .string()
    .trim()
    .min(2, "Kode vendor minimal 2 karakter")
    .max(10, "Kode vendor maksimal 10 karakter"),
  nama: z
    .string()
    .trim()
    .min(2, "Nama vendor minimal 2 karakter")
    .max(100, "Nama vendor maksimal 100 karakter"),
  nama_kontak: z.string().trim().max(100).optional().nullable(),
  no_wa: z
    .string()
    .trim()
    .regex(/^([0-9+\-\s]{8,20})?$/, "Format nomor WhatsApp tidak valid")
    .optional()
    .nullable(),
  no_telp: z
    .string()
    .trim()
    .regex(/^([0-9+\-\s]{8,20})?$/, "Format nomor telepon tidak valid")
    .optional()
    .nullable(),
  alamat: z.string().trim().max(255).optional().nullable(),
  urutan_rotasi: z.coerce.number().int().min(0, "Urutan rotasi harus bilangan bulat").default(0),
  aktif: z.boolean().default(true),
});

export type VendorFormInput = z.infer<typeof vendorSchema>;
