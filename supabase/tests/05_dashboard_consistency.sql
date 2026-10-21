-- Test suite 05: Dashboard mathematical consistency, role security, and range constraints
-- Runs within a transaction that always rolls back to preserve operational data

begin;

do $$
declare
  v_admin_uid uuid := gen_random_uuid();
  v_vendor_uid uuid := gen_random_uuid();
  v_vendor_id uuid;
  v_shift_id uuid;
  v_bagian_id uuid;
  v_period_id uuid;
  v_order_id uuid;
  v_dash jsonb;
  v_total_kpi bigint;
  v_sum_harian bigint;
  v_sum_shift bigint;
  v_sum_bagian bigint;
  v_sum_vendor bigint;
  v_err_caught boolean := false;
begin
  select id into v_shift_id from shifts limit 1;
  select id into v_bagian_id from bagian limit 1;
  select id into v_vendor_id from vendors limit 1;

  -- 1. Setup mock profiles
  insert into profiles (id, username, nama, role, vendor_id, aktif)
  values
    (v_admin_uid, 'test.dash.admin', 'Test Dash Admin', 'admin_ga', null, true),
    (v_vendor_uid, 'test.dash.vendor', 'Test Dash Vendor', 'vendor', v_vendor_id, true);

  -- 2. Setup mock period and final order with 75 portions
  insert into periods (tanggal, shift_id, vendor_id, keterangan)
  values ('2099-05-10', v_shift_id, v_vendor_id, 'Periode Uji Dashboard')
  returning id into v_period_id;

  insert into catering_orders (period_id, vendor_id, status, created_by)
  values (v_period_id, v_vendor_id, 'final', v_admin_uid)
  returning id into v_order_id;

  insert into catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi, porsi)
  values (v_order_id, v_bagian_id, 75, 75, 75);

  -- Also setup a draft order which MUST NOT be counted in v_rekap or dashboard
  insert into periods (tanggal, shift_id, vendor_id, keterangan)
  values ('2099-05-11', v_shift_id, v_vendor_id, 'Periode Uji Draft')
  returning id into v_period_id;

  insert into catering_orders (period_id, vendor_id, status, created_by)
  values (v_period_id, v_vendor_id, 'draft', v_admin_uid)
  returning id into v_order_id;

  insert into catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi, porsi)
  values (v_order_id, v_bagian_id, 999, 999, 999);

  -- TEST 1: Vendor caller is rejected with authorization error
  perform set_config('request.jwt.claims', json_build_object('sub', v_vendor_uid::text, 'role', 'authenticated')::text, true);
  v_err_caught := false;
  begin
    perform public.dashboard_ringkasan('2099-05-01'::date, '2099-05-31'::date);
  exception when others then
    v_err_caught := true;
  end;
  assert v_err_caught, 'TEST 1 FAILED: Vendor was able to invoke dashboard_ringkasan';

  -- Switch context to Admin GA
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_uid::text, 'role', 'authenticated')::text, true);

  -- TEST 2: Inverted date range (p_sampai < p_dari) is rejected
  v_err_caught := false;
  begin
    perform public.dashboard_ringkasan('2099-05-31'::date, '2099-05-01'::date);
  exception when others then
    v_err_caught := true;
  end;
  assert v_err_caught, 'TEST 2 FAILED: Inverted date range was not rejected';

  -- TEST 3: Range exceeding 366 days is rejected
  v_err_caught := false;
  begin
    perform public.dashboard_ringkasan('2099-01-01'::date, '2100-02-01'::date);
  exception when others then
    v_err_caught := true;
  end;
  assert v_err_caught, 'TEST 3 FAILED: Range exceeding 366 days was not rejected';

  -- TEST 4: Admin query returns mathematically consistent totals across all dimensions
  v_dash := public.dashboard_ringkasan('2099-05-01'::date, '2099-05-31'::date);

  v_total_kpi := (v_dash->>'total_porsi')::bigint;

  select coalesce(sum((item->>'total_porsi')::bigint), 0)
  into v_sum_harian
  from jsonb_array_elements(v_dash->'seri_harian') as item;

  select coalesce(sum((item->>'total_porsi')::bigint), 0)
  into v_sum_shift
  from jsonb_array_elements(v_dash->'seri_shift') as item;

  select coalesce(sum((item->>'total_porsi')::bigint), 0)
  into v_sum_bagian
  from jsonb_array_elements(v_dash->'seri_bagian') as item;

  select coalesce(sum((item->>'total_porsi')::bigint), 0)
  into v_sum_vendor
  from jsonb_array_elements(v_dash->'seri_vendor') as item;

  assert v_total_kpi = 75, format('TEST 4A FAILED: Total KPI expected 75, got %s (draft orders might have leaked)', v_total_kpi);
  assert v_sum_harian = v_total_kpi, format('TEST 4B FAILED: Sum harian (%s) != KPI (%s)', v_sum_harian, v_total_kpi);
  assert v_sum_shift = v_total_kpi, format('TEST 4C FAILED: Sum shift (%s) != KPI (%s)', v_sum_shift, v_total_kpi);
  assert v_sum_bagian = v_total_kpi, format('TEST 4D FAILED: Sum bagian (%s) != KPI (%s)', v_sum_bagian, v_total_kpi);
  assert v_sum_vendor = v_total_kpi, format('TEST 4E FAILED: Sum vendor (%s) != KPI (%s)', v_sum_vendor, v_total_kpi);

  raise notice 'All 4 dashboard consistency and security tests passed successfully.';
end;
$$;

rollback;
