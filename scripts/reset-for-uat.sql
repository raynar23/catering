-- scripts/reset-for-uat.sql
-- Manual UAT Operational Data Reset for Catering TPS
-- Execution: Run in Supabase SQL Editor as a single atomic transaction.
-- Preserves: auth.users (standard UAT accounts), master shifts, master vendors, and 5 active bagian.
-- Backs up: operational data into temporary _backup_* tables before truncating.

BEGIN;

-- 1. Backup operational data into timestamped backup tables
DROP TABLE IF EXISTS _backup_order_logs;
CREATE TABLE _backup_order_logs AS SELECT * FROM public.order_logs;

DROP TABLE IF EXISTS _backup_revisions;
CREATE TABLE _backup_revisions AS SELECT * FROM public.revisions;

DROP TABLE IF EXISTS _backup_catering_items;
CREATE TABLE _backup_catering_items AS SELECT * FROM public.catering_items;

DROP TABLE IF EXISTS _backup_catering_orders;
CREATE TABLE _backup_catering_orders AS SELECT * FROM public.catering_orders;

DROP TABLE IF EXISTS _backup_periods;
CREATE TABLE _backup_periods AS SELECT * FROM public.periods;

DROP TABLE IF EXISTS _backup_import_batches;
CREATE TABLE _backup_import_batches AS SELECT * FROM public.import_batches;

-- 2. Temporarily disable append-only triggers
ALTER TABLE public.order_logs DISABLE TRIGGER trg_prevent_order_logs_mod;
ALTER TABLE public.revisions DISABLE TRIGGER trg_prevent_revision_delete;
ALTER TABLE public.revisions DISABLE TRIGGER trg_revision_immutable;

-- 3. Truncate operational tables in cascading foreign-key order
TRUNCATE TABLE public.order_logs CASCADE;
TRUNCATE TABLE public.revisions CASCADE;
TRUNCATE TABLE public.catering_items CASCADE;
TRUNCATE TABLE public.catering_orders CASCADE;
TRUNCATE TABLE public.periods CASCADE;
TRUNCATE TABLE public.import_batches CASCADE;

-- 4. Re-enable append-only triggers
ALTER TABLE public.order_logs ENABLE TRIGGER trg_prevent_order_logs_mod;
ALTER TABLE public.revisions ENABLE TRIGGER trg_prevent_revision_delete;
ALTER TABLE public.revisions ENABLE TRIGGER trg_revision_immutable;

-- 5. Remove deprecated legacy user accounts (admin@tps.co.id and vendor@tps.co.id)
DELETE FROM public.profiles WHERE username IN ('admin', 'vendor');
DELETE FROM auth.users WHERE email IN ('admin@tps.co.id', 'vendor@tps.co.id');

-- 6. Verification queries (output results to confirm clean state)
SELECT
  (SELECT count(*) FROM public.periods) AS periods_count,
  (SELECT count(*) FROM public.catering_orders) AS orders_count,
  (SELECT count(*) FROM public.catering_items) AS items_count,
  (SELECT count(*) FROM public.revisions) AS revisions_count,
  (SELECT count(*) FROM public.order_logs) AS logs_count,
  (SELECT count(*) FROM public.bagian WHERE aktif = true) AS active_bagian_count,
  (SELECT count(*) FROM public.shifts) AS shifts_count,
  (SELECT count(*) FROM public.vendors WHERE aktif = true) AS vendors_count;

-- 7. Verify triggers are fully re-enabled ('O' = enabled)
SELECT tgname, tgenabled, relname
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE tgname IN ('trg_prevent_order_logs_mod', 'trg_prevent_revision_delete', 'trg_revision_immutable');

COMMIT;
