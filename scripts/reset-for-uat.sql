-- Atomic operational data reset for UAT

BEGIN;

-- Create private backup schema not exposed to Data API
CREATE SCHEMA IF NOT EXISTS _backup_vault;
REVOKE ALL ON SCHEMA _backup_vault FROM public, anon, authenticated;

-- Backup operational tables to private schema before truncate
DROP TABLE IF EXISTS _backup_vault.order_logs;
CREATE TABLE _backup_vault.order_logs AS SELECT * FROM public.order_logs;
ALTER TABLE _backup_vault.order_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE _backup_vault.order_logs FROM public, anon, authenticated;

DROP TABLE IF EXISTS _backup_vault.revisions;
CREATE TABLE _backup_vault.revisions AS SELECT * FROM public.revisions;
ALTER TABLE _backup_vault.revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE _backup_vault.revisions FROM public, anon, authenticated;

DROP TABLE IF EXISTS _backup_vault.catering_items;
CREATE TABLE _backup_vault.catering_items AS SELECT * FROM public.catering_items;
ALTER TABLE _backup_vault.catering_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE _backup_vault.catering_items FROM public, anon, authenticated;

DROP TABLE IF EXISTS _backup_vault.catering_orders;
CREATE TABLE _backup_vault.catering_orders AS SELECT * FROM public.catering_orders;
ALTER TABLE _backup_vault.catering_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE _backup_vault.catering_orders FROM public, anon, authenticated;

DROP TABLE IF EXISTS _backup_vault.periods;
CREATE TABLE _backup_vault.periods AS SELECT * FROM public.periods;
ALTER TABLE _backup_vault.periods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE _backup_vault.periods FROM public, anon, authenticated;

DROP TABLE IF EXISTS _backup_vault.import_batches;
CREATE TABLE _backup_vault.import_batches AS SELECT * FROM public.import_batches;
ALTER TABLE _backup_vault.import_batches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE _backup_vault.import_batches FROM public, anon, authenticated;

-- Remove legacy backup tables from public schema
DROP TABLE IF EXISTS public._backup_order_logs CASCADE;
DROP TABLE IF EXISTS public._backup_revisions CASCADE;
DROP TABLE IF EXISTS public._backup_catering_items CASCADE;
DROP TABLE IF EXISTS public._backup_catering_orders CASCADE;
DROP TABLE IF EXISTS public._backup_periods CASCADE;
DROP TABLE IF EXISTS public._backup_import_batches CASCADE;
DROP TABLE IF EXISTS public._backup_order_logs_audit2 CASCADE;

-- Temporarily toggle triggers for truncate
ALTER TABLE public.order_logs DISABLE TRIGGER trg_prevent_order_logs_mod;
ALTER TABLE public.revisions DISABLE TRIGGER trg_prevent_revision_delete;
ALTER TABLE public.revisions DISABLE TRIGGER trg_revision_immutable;

-- Truncate operational data
TRUNCATE TABLE public.order_logs CASCADE;
TRUNCATE TABLE public.revisions CASCADE;
TRUNCATE TABLE public.catering_items CASCADE;
TRUNCATE TABLE public.catering_orders CASCADE;
TRUNCATE TABLE public.periods CASCADE;
TRUNCATE TABLE public.import_batches CASCADE;

-- Re-enable append-only triggers
ALTER TABLE public.order_logs ENABLE TRIGGER trg_prevent_order_logs_mod;
ALTER TABLE public.revisions ENABLE TRIGGER trg_prevent_revision_delete;
ALTER TABLE public.revisions ENABLE TRIGGER trg_revision_immutable;

-- Clean legacy test accounts while preserving admin and vendor accounts
DELETE FROM public.profiles WHERE username IN ('vendor') OR username LIKE 'mock.%' OR username LIKE 'test.%';
DELETE FROM auth.users WHERE email IN ('vendor@tps.co.id') OR email LIKE 'mock.%' OR email LIKE 'test.%';

-- Verify counts
SELECT
  (SELECT count(*) FROM public.periods) AS periods_count,
  (SELECT count(*) FROM public.catering_orders) AS orders_count,
  (SELECT count(*) FROM public.catering_items) AS items_count,
  (SELECT count(*) FROM public.revisions) AS revisions_count,
  (SELECT count(*) FROM public.order_logs) AS logs_count,
  (SELECT count(*) FROM public.bagian WHERE aktif = true) AS active_bagian_count,
  (SELECT count(*) FROM public.shifts) AS shifts_count,
  (SELECT count(*) FROM public.vendors WHERE aktif = true) AS vendors_count;

-- Verify trigger status
SELECT tgname, tgenabled, relname
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE tgname IN ('trg_prevent_order_logs_mod', 'trg_prevent_revision_delete', 'trg_revision_immutable');

COMMIT;
