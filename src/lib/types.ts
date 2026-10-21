// Strict TypeScript types representing Supabase Database Schema and Domain Models
export type AppRole = 'admin_ga' | 'vendor';
export type OrderStatus = 'draft' | 'diajukan' | 'final' | 'revisi';
export type RevisionStatus = 'menunggu' | 'disetujui' | 'ditolak';
export type VendorResponseStatus = 'menunggu' | 'disanggupi' | 'tidak_sanggup';
export type VendorProgress = 'menunggu' | 'dipersiapkan' | 'dikirim' | 'sampai' | 'selesai';
export type LogAction =
  | 'input_awal'
  | 'diajukan'
  | 'disetujui'
  | 'dikembalikan'
  | 'kirim_ke_vendor'
  | 'ganti_vendor'
  | 'vendor_sanggup'
  | 'vendor_tidak_sanggup'
  | 'vendor_update_progres'
  | 'revisi_diajukan'
  | 'revisi_respon_vendor'
  | 'revisi_disetujui'
  | 'revisi_ditolak'
  | 'impor_dokumen';

export interface Shift {
  id: string;
  nama: string; // e.g. "Shift 1"
  label: string; // e.g. "Siang"
  alias: string[]; // e.g. ["siang", "pagi"]
  jam_mulai: string; // "08:00:00"
  jam_selesai: string; // "16:00:00"
  batas_tiba: string; // "10:00:00"
  urutan: number; // 0, 1, 2 for rotation
  urutan_laporan: number; // 1, 2, 3
  keterangan: string | null;
  aktif: boolean;
  created_at: string;
}

export interface Bagian {
  id: string;
  kode: string | null;
  nama: string;
  kelompok: string | null;
  lokasi_antar: string | null;
  catatan_antar?: string | null;
  alias: string[] | null;
  keterangan: string | null;
  urutan: number;
  aktif: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  kode: string; // V001..V005
  nama: string;
  nama_kontak?: string | null;
  no_wa?: string | null;
  no_telp?: string | null;
  alias?: string[] | null;
  kontak: string | null;
  alamat: string | null;
  urutan_rotasi: number; // 0..4
  aktif: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  nama: string;
  role: AppRole;
  vendor_id: string | null;
  bagian_id: string | null;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Period {
  id: string;
  tanggal: string; // YYYY-MM-DD
  shift_id: string;
  vendor_id: string;
  keterangan: string | null;
  created_at: string;
}

export interface CateringOrder {
  id: string;
  period_id: string;
  vendor_id: string;
  status: order_status_type;
  created_by: string;
  submitted_by: string | null;
  submitted_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  catatan: string | null;
  respon_vendor: VendorResponseStatus;
  respon_vendor_at: string | null;
  catatan_vendor: string | null;
  progres_vendor: VendorProgress;
  progres_vendor_at: string | null;
  created_at: string;
  updated_at: string;
}

type order_status_type = OrderStatus;

export interface CateringItem {
  id: string;
  order_id: string;
  bagian_id: string;
  jumlah_karyawan: number;
  jumlah_porsi: number;
  keterangan: string | null;
  created_at: string;
  updated_at: string;
}

export interface Revision {
  id: string;
  item_id: string;
  karyawan_awal: number;
  karyawan_baru: number;
  porsi_awal: number;
  porsi_baru: number;
  selisih_porsi: number;
  alasan: string;
  status: RevisionStatus;
  diajukan_oleh: string;
  diajukan_at: string;
  diverifikasi_oleh: string | null;
  diverifikasi_at: string | null;
  catatan_verifikator: string | null;
  respon_vendor: VendorResponseStatus;
  respon_vendor_at: string | null;
  catatan_vendor: string | null;
  created_at: string;
}

export interface OrderLog {
  id: string;
  order_id: string;
  item_id: string | null;
  revision_id: string | null;
  aksi: LogAction;
  jumlah_awal: number | null;
  selisih: number | null;
  jumlah_baru: number | null;
  keterangan: string | null;
  oleh: string;
  created_at: string;
}

export interface ImportBatch {
  id: string;
  nomor_batch: string;
  nama_file: string;
  tipe_file: string;
  ukuran_bytes: number | null;
  status: 'draft' | 'dikonfirmasi' | 'dibatalkan' | 'selesai';
  total_baris: number;
  data_parsed: unknown;
  diimpor_oleh: string;
  dikonfirmasi_at: string | null;
  catatan: string | null;
  jenis_dokumen?: string | null;
  mesin?: string | null;
  ringkasan?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface RekapRow {
  order_id: string;
  period_id: string;
  tanggal: string;
  shift_id: string;
  shift_nama: string;
  shift_label: string;
  shift_alias: string;
  shift_urutan: number;
  shift_urutan_laporan: number;
  vendor_id: string;
  vendor_kode: string;
  vendor_nama: string;
  bagian_id: string;
  bagian_kode: string | null;
  bagian_nama: string;
  bagian_kelompok: string | null;
  bagian_lokasi_antar: string | null;
  bagian_urutan: number;
  jumlah_karyawan: number;
  jumlah_porsi: number;
  keterangan_item: string | null;
  order_status: OrderStatus;
  respon_vendor: VendorResponseStatus;
  respon_vendor_at: string | null;
  progres_vendor: VendorProgress;
  progres_vendor_at: string | null;
}

export interface TimelineVendorRow {
  log_id: string;
  order_id: string;
  vendor_id: string;
  aksi: LogAction;
  jumlah_awal: number | null;
  selisih: number | null;
  jumlah_baru: number | null;
  keterangan: string | null;
  nama_pengupdate: string;
  created_at: string;
}

export interface NotifikasiSummary {
  role: AppRole;
  revisi_menunggu?: number;
  vendor_tidak_sanggup?: number;
  pesanan_draft?: number;
  pesanan_baru_menunggu_respon?: number;
  revisi_menunggu_respon?: number;
  pesanan_aktif_dalam_pengiriman?: number;
}
