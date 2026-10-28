-- Apply script for Migration 022: Schema Drift Reconciliation
-- Run in Supabase SQL Editor as a single atomic transaction

BEGIN;

ALTER TABLE public.import_batches
  ADD COLUMN IF NOT EXISTS jenis_dokumen text,
  ADD COLUMN IF NOT EXISTS mesin text,
  ADD COLUMN IF NOT EXISTS ringkasan jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_import_batches_jenis ON public.import_batches (jenis_dokumen);
CREATE INDEX IF NOT EXISTS idx_import_batches_mesin ON public.import_batches (mesin);

COMMIT;
