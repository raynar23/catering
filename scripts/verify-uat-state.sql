-- scripts/verify-uat-state.sql
-- Read-Only Verification Script for Catering TPS Database State Before Client UAT.
-- Run in Supabase SQL Editor. Does NOT mutate or write any data.

-- ============================================================================
-- 1. JUMLAH & RENTANG PERIODE (Target: 276 periode, 2026-10-01 s.d. 2026-12-31)
-- ============================================================================
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
    THEN 'SESUAI (276 periode, 92 hari, 5 vendor)'
    ELSE 'PERLU RESET / IMPOR ULANG'
  END AS status_periode
FROM public.periods;

-- ============================================================================
-- 2. PESANAN MENURUT STATUS & RENTANG TANGGAL (Jendela UAT: 14 hari lalu s.d. +3 hari)
-- ============================================================================
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

-- Periksa apakah ada pesanan liar di luar rentang Q4 2026 (harus 0 baris)
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

-- ============================================================================
-- 3. BAGIAN AKTIF (Target: Tepat 5 bagian aktif)
-- ============================================================================
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

-- ============================================================================
-- 4. DAFTAR AKUN PENGGUNA & STATUS PROFIL
-- ============================================================================
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

-- ============================================================================
-- 5. STATUS TRIGGER APPEND-ONLY (Target: Seluruh tgenabled = 'O' / Teraktifkan)
-- ============================================================================
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  t.tgenabled AS trigger_status,
  CASE t.tgenabled
    WHEN 'O' THEN 'AKTIF (Origin / Enabled)'
    WHEN 'D' THEN 'NONAKTIF (Disabled - BAHAYA!)'
    WHEN 'A' THEN 'ALWAYS (Enabled Always)'
    WHEN 'R' THEN 'REPLICA (Replica Only)'
    ELSE t.tgenabled::text
  END AS status_keterangan
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

-- ============================================================================
-- 6. MATRIKS HAK EKSEKUSI FUNGSI (EXECUTE PRIVILEGE MATRIX)
-- ============================================================================
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
  AND p.proname IN (
    'is_admin',
    'my_vendor_id',
    'simpan_catering',
    'kirim_catering',
    'ajukan_revisi',
    'verifikasi_revisi',
    'ganti_vendor_periode',
    'konfirmasi_impor',
    'dashboard_ringkasan',
    'get_rekap_harian',
    'get_rekap_ringkasan',
    'delete_selected_periods',
    'respon_periode_vendor',
    'respon_revisi_vendor',
    'update_progres_vendor',
    'get_notifikasi',
    'check_db_count_and_sync',
    'check_triggers_status'
  )
ORDER BY p.proname, r.rolname;
