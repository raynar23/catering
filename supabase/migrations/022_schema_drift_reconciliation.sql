-- Reconcile schema drift for import_batches metadata columns
-- Idempotent migration adding jenis_dokumen, mesin, and ringkasan columns

ALTER TABLE public.import_batches
  ADD COLUMN IF NOT EXISTS jenis_dokumen text,
  ADD COLUMN IF NOT EXISTS mesin text,
  ADD COLUMN IF NOT EXISTS ringkasan jsonb DEFAULT '{}'::jsonb;

-- Add indexes for fast querying of batch types and engines
CREATE INDEX IF NOT EXISTS idx_import_batches_jenis ON public.import_batches (jenis_dokumen);
CREATE INDEX IF NOT EXISTS idx_import_batches_mesin ON public.import_batches (mesin);
