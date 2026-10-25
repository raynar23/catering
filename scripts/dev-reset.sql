-- ==============================================================================
-- scripts/dev-reset.sql: Manual Development & Testing Operational Data Reset
-- PERINGATAN: SKRIP INI HANYA UNTUK LINGKUNGAN PENGEMBANGAN / TESTING LOKAL
-- JANGAN DIJALANKAN DI PRODUKSI KARENA MENGHAPUS SELURUH LOG DAN TRANSAKSI
-- ==============================================================================

do $$
declare
  v_count_periods integer := 0;
  v_count_orders integer := 0;
begin
  -- Bypass audit immutability trigger for manual dev reset
  perform set_config('app.bypass_order_logs_immutability', 'on', true);

  select count(*) into v_count_periods from public.periods;
  select count(*) into v_count_orders from public.catering_orders;

  -- Delete in foreign key dependency order
  delete from public.order_logs;
  delete from public.revisions;
  delete from public.catering_items;
  delete from public.catering_orders;
  delete from public.periods;

  raise notice 'Pembersihan data dev selesai: % periode dan % pesanan dihapus.', v_count_periods, v_count_orders;
end $$;
