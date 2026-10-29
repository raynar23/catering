"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ImportBatchRecord {
  id: string;
  nomor_batch: string;
  nama_file: string;
  tipe_file: string;
  ukuran_bytes: number;
  jenis_dokumen: string | null;
  mesin: string | null;
  status: "draft" | "dikonfirmasi" | "dibatalkan" | "selesai" | string;
  total_baris: number;
  data_parsed: unknown[];
  diimpor_oleh: string;
  diimpor_oleh_nama: string;
  dikonfirmasi_at: string | null;
  catatan: string | null;
  created_at: string;
  ringkasan?: Record<string, unknown>;
}

// Fetch list of import batches for audit trail and history view
export async function getImportBatchesAction(): Promise<{
  success: boolean;
  data: ImportBatchRecord[];
  error?: string;
}> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, data: [], error: "Akses ditolak: Hanya Admin GA yang diizinkan melihat riwayat impor" };
  }

  const adminClient = createAdminClient();

  const { data: batches, error } = await adminClient
    .from("import_batches")
    .select(`
      id,
      nomor_batch,
      nama_file,
      tipe_file,
      ukuran_bytes,
      jenis_dokumen,
      mesin,
      status,
      total_baris,
      data_parsed,
      diimpor_oleh,
      dikonfirmasi_at,
      catatan,
      created_at,
      ringkasan,
      profiles!import_batches_diimpor_oleh_fkey ( nama )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, data: [], error: error.message || "Gagal memuat riwayat berkas impor" };
  }

  const mapped: ImportBatchRecord[] = (batches || []).map((b: any) => ({
    id: b.id,
    nomor_batch: b.nomor_batch,
    nama_file: b.nama_file,
    tipe_file: b.tipe_file,
    ukuran_bytes: b.ukuran_bytes || 0,
    jenis_dokumen: b.jenis_dokumen || "jadwal",
    mesin: b.mesin || "heuristik",
    status: b.status,
    total_baris: b.total_baris || 0,
    data_parsed: b.data_parsed || [],
    diimpor_oleh: b.diimpor_oleh,
    diimpor_oleh_nama: b.profiles?.nama || "Admin GA",
    dikonfirmasi_at: b.dikonfirmasi_at,
    catatan: b.catatan,
    created_at: b.created_at,
    ringkasan: b.ringkasan || {},
  }));

  return { success: true, data: mapped };
}

// Delete an import batch and optionally purge associated imported periods
export async function deleteImportBatchAction(
  batchId: string,
  deleteAssociatedPeriods: boolean = false
): Promise<{
  success: boolean;
  message?: string;
  deletedPeriodsCount?: number;
  error?: string;
}> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_ga") {
    return { success: false, error: "Akses ditolak: Hanya Admin GA yang diizinkan menghapus riwayat impor" };
  }

  const adminClient = createAdminClient();

  // 1. Fetch batch to obtain batch number
  const { data: batch, error: batchErr } = await adminClient
    .from("import_batches")
    .select("id, nomor_batch, nama_file")
    .eq("id", batchId)
    .single();

  if (batchErr || !batch) {
    return { success: false, error: "Data berkas batch impor tidak ditemukan" };
  }

  let deletedPeriodsCount = 0;

  // 2. If requested, purge periods created from this batch
  if (deleteAssociatedPeriods) {
    const { data: periods } = await adminClient
      .from("periods")
      .select("id")
      .like("keterangan", `Diimpor dari batch ${batch.nomor_batch}%`);

    if (periods && periods.length > 0) {
      const periodIds = periods.map((p) => p.id);
      const { data: rpcRes, error: rpcErr } = await adminClient.rpc("delete_selected_periods", {
        p_period_ids: periodIds,
      });

      if (rpcErr) {
        return {
          success: false,
          error: `Gagal menghapus jadwal periode terkait: ${rpcErr.message}`,
        };
      }
      deletedPeriodsCount = (rpcRes as any)?.deleted_count || periodIds.length;
    }
  }

  // 3. Delete the batch record
  const { error: delErr } = await adminClient
    .from("import_batches")
    .delete()
    .eq("id", batchId);

  if (delErr) {
    return { success: false, error: `Gagal menghapus riwayat batch: ${delErr.message}` };
  }

  revalidatePath("/admin/impor-data");
  revalidatePath("/admin/periode");
  revalidatePath("/admin/master/periode");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/rekapitulasi");

  const msg = deleteAssociatedPeriods && deletedPeriodsCount > 0
    ? `Riwayat batch "${batch.nama_file}" dan ${deletedPeriodsCount} jadwal terkait berhasil dihapus.`
    : `Riwayat batch "${batch.nama_file}" berhasil dihapus.`;

  return {
    success: true,
    message: msg,
    deletedPeriodsCount,
  };
}
