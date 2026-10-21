-- Test suite: vendor isolation policies and RPC guards

begin;

-- 1. Setup mock profiles for Vendor A (Aisya) and Vendor B (IBU)
do $$
declare
  v_aisya_vendor_id uuid;
  v_ibu_vendor_id uuid;
  v_user_aisya uuid := gen_random_uuid();
  v_user_ibu uuid := gen_random_uuid();
  v_order_aisya uuid;
  v_order_ibu uuid;
  v_period_aisya uuid;
  v_period_ibu uuid;
  v_s1 uuid;
  v_visible_count integer;
begin
  select id into v_s1 from shifts limit 1;
  select id into v_aisya_vendor_id from vendors where kode = 'V001';
  select id into v_ibu_vendor_id from vendors where kode = 'V002';

  insert into profiles (id, username, nama, role, vendor_id)
  values
    (v_user_aisya, 'mock.vendor.aisya', 'Vendor Aisya', 'vendor', v_aisya_vendor_id),
    (v_user_ibu, 'mock.vendor.ibu', 'Vendor IBU', 'vendor', v_ibu_vendor_id);

  -- Create isolated periods and orders
  insert into periods (tanggal, shift_id, vendor_id, keterangan)
  values
    ('2099-01-01', v_s1, v_aisya_vendor_id, 'Period Vendor Aisya'),
    ('2099-01-02', v_s1, v_ibu_vendor_id, 'Period Vendor IBU')
  returning id into v_period_aisya;
  select id into v_period_ibu from periods where tanggal = '2099-01-02' and shift_id = v_s1;

  insert into catering_orders (period_id, vendor_id, status, created_by)
  values
    (v_period_aisya, v_aisya_vendor_id, 'final', v_user_aisya),
    (v_period_ibu, v_ibu_vendor_id, 'final', v_user_ibu)
  returning id into v_order_aisya;
  select id into v_order_ibu from catering_orders where period_id = v_period_ibu;

  -- Test 1: Vendor A query to catering_orders should only return Aisya's order
  -- Set session auth to Vendor A
  perform set_config('request.jwt.claims', json_build_object('sub', v_user_aisya::text)::text, true);

  select count(*) into v_visible_count from catering_orders where id = v_order_ibu;
  if v_visible_count > 0 then
    raise exception 'TEST FAILED: Vendor Aisya dapat melihat pesanan Vendor IBU!';
  end if;

  -- Test 2: Vendor A trying to respond to Vendor B's order via RPC must fail
  begin
    perform respon_periode_vendor(v_order_ibu, true, 'Upaya bajak order');
    raise exception 'TEST FAILED: RPC respon_periode_vendor mengizinkan vendor lain membalas pesanan!';
  exception
    when others then
      if sqlerrm like '%Akses ditolak%' then
        raise notice 'TEST PASSED: RPC respon_periode_vendor sukses menolak akses silang vendor.';
      else
        raise;
      end if;
  end;

  -- Test 3: Vendor A trying to update progress on Vendor B's order must fail
  begin
    perform update_progres_vendor(v_order_ibu, 'dipersiapkan'::vendor_progress, 'Ilegal');
    raise exception 'TEST FAILED: RPC update_progres_vendor mengizinkan vendor lain memperbarui progres!';
  exception
    when others then
      if sqlerrm like '%Akses ditolak%' then
        raise notice 'TEST PASSED: RPC update_progres_vendor sukses menolak pembaruan progres silang vendor.';
      else
        raise;
      end if;
  end;

  raise notice 'ALL VENDOR ISOLATION TESTS PASSED!';
end $$;

rollback;
