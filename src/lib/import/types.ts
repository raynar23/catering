// Core types and interfaces for intelligent document ingestion pipeline

export type DocumentType =
  | "otomatis"
  | "jadwal"
  | "vendor"
  | "bagian"
  | "rekap_harian";

export type RowStatus = "cocok" | "baru" | "perlu_cek" | "error";

export type ImportEngine = "aturan" | "ocr" | "ai";

export interface ParsedRowSource {
  sheet?: string;
  cell?: string;
  page?: number;
  line?: number;
}

export interface BaseParsedRow {
  id: string;
  status: RowStatus;
  alasan?: string;
  sumber: ParsedRowSource;
}

export interface JadwalParsedRow extends BaseParsedRow {
  tanggal: string; // YYYY-MM-DD
  shift_id: string | null;
  shift_nama: string; // Shift 1, Shift 2, Shift 3
  shift_alias: string; // siang, sore, malam
  vendor_id: string | null;
  vendor_nama: string;
  vendor_kode: string | null;
  is_new_vendor?: boolean;
}

export interface VendorParsedRow extends BaseParsedRow {
  kode: string;
  nama: string;
  kontak?: string;
  penanggung_jawab?: string;
  alamat?: string;
}

export interface BagianParsedRow extends BaseParsedRow {
  kode: string;
  nama: string;
  kelompok: string;
  lokasi_antar?: string;
  catatan_antar?: string;
  urutan?: number;
}

export interface RekapHarianParsedRow extends BaseParsedRow {
  tanggal: string; // YYYY-MM-DD
  shift_id: string | null;
  shift_nama: string;
  vendor_id: string | null;
  vendor_nama: string;
  items: Record<string, number>; // bagian_id -> porsi
  total_porsi: number;
}

export type ParsedRow =
  | JadwalParsedRow
  | VendorParsedRow
  | BagianParsedRow
  | RekapHarianParsedRow;

export interface RawTableCell {
  value: string | number | boolean | null;
  formula?: string;
  isMerged?: boolean;
}

export interface RawTableData {
  sheetName?: string;
  headers: string[];
  rows: (string | number | boolean | Date | null)[][];
}

export interface DetectionResult {
  jenis: DocumentType;
  keyakinan: number; // 0.0 - 1.0
  alasan: string;
  format: "xlsx" | "csv" | "docx" | "pdf" | "image";
}

export interface ExtractorInterface {
  extract(buffer: Buffer, filename: string): Promise<RawTableData[]>;
}

export interface ImportBatchSummary {
  total: number;
  cocok: number;
  baru: number;
  perlu_cek: number;
  error: number;
}

export interface KonfirmasiOpsi {
  buat_vendor_baru?: boolean;
  timpa_periode?: boolean;
}

export interface AnalysisResult {
  batchId?: string;
  nomorBatch: string;
  namaFile: string;
  tipeFile: string;
  ukuranBytes: number;
  jenisDokumen: DocumentType;
  mesin: ImportEngine;
  keyakinan: number;
  ringkasan: ImportBatchSummary;
  rows: ParsedRow[];
}
