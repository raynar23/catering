-- Read-only verification script for database state before UAT

-- Verify period count and date range (expected: 276 periods, 2026-10-01 to 2026-12-31)
SELECT
  count(*) AS total_periode,
  min(tanggal) AS tanggal_mulai,
  max(tanggal) AS tanggal_selesai,
  count(DISTINCT tanggal) AS total_hari,
  count(DISTINCT vendor_id) AS total_vendor_unik,
  CASE
    WHEN count(*) = 276 
     AND min(tanggal) = '2026-10-01' 
     AND max(tanggal) = '2026-12-31' 
     AND count(DISTINCT tanggal) = 92
     AND count(DISTINCT vendor_id) = 5
    THEN 'MATCH (276 periods, 92 days, 5 vendors)'
    ELSE 'NEEDS RESET / RE-IMPORT'
  END AS status_periode
FROM public.periods;

-- Orders distribution by status and date range
SELECT
  o.status,
  count(*) AS jumlah_pesanan,
  min(p.tanggal) AS rentang_tanggal_awal,
  max(p.tanggal) AS rentang_tanggal_akhir,
  count(DISTINCT p.tanggal) AS jumlah_hari
FROM public.catering_orders o
JOIN public.periods p ON p.id = o.period_id
GROUP BY o.status
ORDER BY o.status;

-- Out-of-window order check (expected: 0 rows)
SELECT
  o.id AS order_id_liar,
  p.tanggal,
  s.nama AS shift,
  v.nama AS vendor,
  o.status
FROM public.catering_orders o
JOIN public.periods p ON p.id = o.period_id
JOIN public.shifts s ON s.id = p.shift_id
JOIN public.vendors v ON v.id = o.vendor_id
WHERE p.tanggal < '2026-10-01' OR p.tanggal > '2026-12-31';

-- Active departments
SELECT
  id,
  kode,
  nama,
  kelompok,
  lokasi_antar,
  urutan,
  aktif
FROM public.bagian
WHERE aktif = true
ORDER BY urutan ASC, nama ASC;

-- User accounts and profiles
SELECT
  u.email,
  p.username,
  p.nama,
  p.role,
  p.aktif,
  v.kode AS kode_vendor,
  v.nama AS nama_vendor
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
LEFT JOIN public.vendors v ON v.id = p.vendor_id
ORDER BY p.role ASC, p.username ASC;

-- Append-only trigger statuses (expected: tgenabled = 'O')
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  t.tgenabled AS trigger_status,
  CASE t.tgenabled
    WHEN 'O' THEN 'ACTIVE (Origin / Enabled)'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'A' THEN 'ALWAYS (Always Enabled)'
    WHEN 'R' THEN 'REPLICA (Replica Only)'
    ELSE t.tgenabled::text
  END AS trigger_status_description
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE t.tgname IN (
  'trg_prevent_order_logs_mod',
  'trg_prevent_order_logs_delete',
  'trg_prevent_order_logs_update',
  'trg_prevent_revision_delete',
  'trg_revision_immutable',
  'trg_check_revision_immutable',
  'trg_guard_profiles_update'
)
ORDER BY c.relname, t.tgname;

-- Function execute privilege matrix (all public schema functions non-extension)
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.prosecdef AS is_security_definer,
  r.rolname AS granted_role
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL (
  SELECT r.rolname
  FROM pg_roles r
  WHERE has_function_privilege(r.oid, p.oid, 'EXECUTE')
    AND r.rolname IN ('anon', 'authenticated', 'service_role')
) r
WHERE n.nspname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_depend d
    WHERE d.objid = p.oid AND d.deptype = 'e'
  )
ORDER BY p.proname, r.rolname;

-- Public schema tables row-level security and access privileges
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;
