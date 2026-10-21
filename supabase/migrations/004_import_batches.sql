-- 004_import_batches.sql
-- Migration 004: Import Batches for Document Ingestion

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  nomor_batch text not null unique,
  nama_file text not null,
  tipe_file text not null,
  ukuran_bytes integer,
  status text not null default 'draft' check (status in ('draft', 'dikonfirmasi', 'dibatalkan', 'selesai')),
  total_baris integer not null default 0,
  data_parsed jsonb not null default '[]'::jsonb,
  diimpor_oleh uuid not null references profiles(id),
  dikonfirmasi_at timestamptz,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_import_batches_status on import_batches (status);
create index idx_import_batches_user on import_batches (diimpor_oleh);
create index idx_import_batches_created on import_batches (created_at desc);
