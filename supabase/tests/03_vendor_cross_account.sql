-- Test Suite: Cross-account vendor isolation and progress validation
-- Verifies that vendor.aisya and vendor.ibu only access their own periods and orders

begin;

do $$
declare
  v_aisya_uid uuid;
  v_ibu_uid uuid;
  v_aisya_vendor_id uuid;
  v_ibu_vendor_id uuid;
  v_aisya_order_count integer;
  v_ibu_order_count integer;
  v_cross_order_count integer;
  v_test_order_aisya uuid;
  v_test_order_ibu uuid;
  v_shift_id uuid;
begin
  -- Retrieve real seed users
  select id into v_aisya_uid from auth.users where email = 'vendor.aisya@tps.co.id';
  select id into v_ibu_uid from auth.users where email = 'vendor.ibu@tps.co.id';
  select id into v_shift_id from shifts limit 1;

  select id into v_aisya_vendor_id from vendors where kode = 'V001';
  select id into v_ibu_vendor_id from vendors where kode = 'V002';

  if v_aisya_uid is null or v_ibu_uid is null then
    raise notice 'Seed users not found in auth.users, using profiles directly';
    select id into v_aisya_uid from profiles where username = 'vendor.aisya';
    select id into v_ibu_uid from profiles where username = 'vendor.ibu';
  end if;

  -- Create fresh isolated test periods
  insert into periods (tanggal, shift_id, vendor_id, keterangan)
  values ('2099-12-01', v_shift_id, v_aisya_vendor_id, 'Periode Khusus Aisya')
  on conflict (tanggal, shift_id) do update set vendor_id = v_aisya_vendor_id;

  select p.id into v_test_order_aisya from periods p where p.tanggal = '2099-12-01' and p.shift_id = v_shift_id;

  insert into catering_orders (period_id, vendor_id, status, created_by)
  values (v_test_order_aisya, v_aisya_vendor_id, 'final', v_aisya_uid)
  on conflict (period_id) do update set status = 'final', vendor_id = v_aisya_vendor_id
  returning id into v_test_order_aisya;

  -- Test Case 1: Act as vendor.aisya - Ensure visibility of own orders
  perform set_config('request.jwt.claims', json_build_object('sub', v_aisya_uid::text)::text, true);

  select count(*) into v_aisya_order_count
  from catering_orders
  where vendor_id = v_aisya_vendor_id and status in ('final', 'revisi');

  if v_aisya_order_count = 0 then
    raise exception 'TEST FAILED: vendor.aisya harus dapat melihat pesanan miliknya sendiri';
  end if;

  -- Test Case 2: Act as vendor.aisya - Ensure zero visibility of vendor.ibu orders
  select count(*) into v_cross_order_count
  from catering_orders
  where vendor_id = v_ibu_vendor_id;

  if v_cross_order_count > 0 then
    raise exception 'TEST FAILED: Isolasi jebol! vendor.aisya dapat melihat % pesanan vendor.ibu', v_cross_order_count;
  end if;

  -- Test Case 3: Act as vendor.ibu - Ensure zero visibility of vendor.aisya orders
  perform set_config('request.jwt.claims', json_build_object('sub', v_ibu_uid::text)::text, true);

  select count(*) into v_cross_order_count
  from catering_orders
  where vendor_id = v_aisya_vendor_id;

  if v_cross_order_count > 0 then
    raise exception 'TEST FAILED: Isolasi jebol! vendor.ibu dapat melihat % pesanan vendor.aisya', v_cross_order_count;
  end if;

  -- Test Case 4: Act as vendor.ibu - Attempt to call update_progres_vendor on vendor.aisya order
  begin
    perform update_progres_vendor(v_test_order_aisya, 'dipersiapkan'::vendor_progress, 'Percobaan sabotase');
    raise exception 'TEST FAILED: vendor.ibu berhasil memanggil update_progres_vendor pada pesanan vendor.aisya!';
  exception
    when others then
      if sqlerrm like '%Akses ditolak%' then
        raise notice 'TEST PASSED: update_progres_vendor sukses menolak akses silang antar vendor';
      else
        raise;
      end if;
  end;

  raise notice 'SUCCESS: Seluruh tes isolasi lintas akun vendor.aisya dan vendor.ibu BERHASIL!';
end $$;

rollback;
