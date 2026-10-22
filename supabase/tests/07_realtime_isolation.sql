-- Test suite 07: Realtime RLS isolation and notification queries
-- Executes in a transaction that always rolls back to preserve operational data

begin;

do $$
declare
  v_admin_uid uuid := gen_random_uuid();
  v_vendor_a_uid uuid := gen_random_uuid();
  v_vendor_b_uid uuid := gen_random_uuid();

  v_vendor_a_id uuid;
  v_vendor_b_id uuid;
  v_shift_id uuid;
  v_bagian_id uuid;

  v_period_a_id uuid;
  v_period_b_id uuid;
  v_order_a_id uuid;
  v_order_b_id uuid;
  v_item_a_id uuid;
  v_item_b_id uuid;
  v_rev_a_id uuid;
  v_rev_b_id uuid;

  v_notif jsonb;
  v_visible_count integer;
begin
  -- Retrieve test master references
  select id into v_shift_id from shifts limit 1;
  select id into v_bagian_id from bagian limit 1;

  select id into v_vendor_a_id from vendors order by kode asc limit 1;
  select id into v_vendor_b_id from vendors order by kode desc limit 1;

  assert v_vendor_a_id <> v_vendor_b_id, 'Test requires two distinct vendors';

  -- 1. Setup mock profiles
  insert into profiles (id, username, nama, role, vendor_id, aktif)
  values
    (v_admin_uid, 'test.realtime.admin', 'Test Realtime Admin', 'admin_ga', null, true),
    (v_vendor_a_uid, 'test.realtime.vendora', 'Test Realtime Vendor A', 'vendor', v_vendor_a_id, true),
    (v_vendor_b_uid, 'test.realtime.vendorb', 'Test Realtime Vendor B', 'vendor', v_vendor_b_id, true);

  -- 2. Setup period and final order for Vendor A
  insert into periods (tanggal, shift_id, vendor_id, keterangan)
  values ('2099-12-01', v_shift_id, v_vendor_a_id, 'Periode Vendor A')
  returning id into v_period_a_id;

  insert into catering_orders (period_id, vendor_id, status, respon_vendor, created_by)
  values (v_period_a_id, v_vendor_a_id, 'final', 'menunggu', v_admin_uid)
  returning id into v_order_a_id;

  insert into catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi, porsi)
  values (v_order_a_id, v_bagian_id, 25, 25, 25)
  returning id into v_item_a_id;

  insert into revisions (item_id, jumlah_lama, jumlah_baru, selisih, alasan, status, respon_vendor, created_by)
  values (v_item_a_id, 25, 30, 5, 'Tambahan karyawan shift A', 'menunggu', 'menunggu', v_admin_uid)
  returning id into v_rev_a_id;

  -- 3. Setup period and final order for Vendor B
  insert into periods (tanggal, shift_id, vendor_id, keterangan)
  values ('2099-12-02', v_shift_id, v_vendor_b_id, 'Periode Vendor B')
  returning id into v_period_b_id;

  insert into catering_orders (period_id, vendor_id, status, respon_vendor, created_by)
  values (v_period_b_id, v_vendor_b_id, 'final', 'menunggu', v_admin_uid)
  returning id into v_order_b_id;

  insert into catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi, porsi)
  values (v_order_b_id, v_bagian_id, 40, 40, 40)
  returning id into v_item_b_id;

  insert into revisions (item_id, jumlah_lama, jumlah_baru, selisih, alasan, status, respon_vendor, created_by)
  values (v_item_b_id, 40, 35, -5, 'Pengurangan karyawan shift B', 'menunggu', 'menunggu', v_admin_uid)
  returning id into v_rev_b_id;

  -- TEST 1: Vendor A RLS isolation on catering_orders
  perform set_config('request.jwt.claims', json_build_object('sub', v_vendor_a_uid::text, 'role', 'authenticated')::text, true);

  select count(*) into v_visible_count from catering_orders where id = v_order_b_id;
  assert v_visible_count = 0, 'TEST 1 FAILED: Vendor A was able to read Vendor B order';

  select count(*) into v_visible_count from catering_orders where id = v_order_a_id;
  assert v_visible_count = 1, 'TEST 1 FAILED: Vendor A could not read own order';

  -- TEST 2: Vendor A RLS isolation on revisions
  select count(*) into v_visible_count from revisions where id = v_rev_b_id;
  assert v_visible_count = 0, 'TEST 2 FAILED: Vendor A was able to read Vendor B revision';

  select count(*) into v_visible_count from revisions where id = v_rev_a_id;
  assert v_visible_count = 1, 'TEST 2 FAILED: Vendor A could not read own revision';

  -- TEST 3: Vendor A get_notifikasi() returns only Vendor A's items
  v_notif := public.get_notifikasi();
  assert (v_notif->>'role') = 'vendor', 'TEST 3 FAILED: Role in notification is not vendor';
  assert (v_notif->>'pesanan_baru_menunggu_respon')::integer >= 1, 'TEST 3 FAILED: Vendor A new order count missing';
  assert (v_notif->>'revisi_menunggu_respon')::integer >= 1, 'TEST 3 FAILED: Vendor A new revision count missing';
  assert jsonb_array_length(v_notif->'items') >= 2, 'TEST 3 FAILED: Vendor A items list missing';

  -- TEST 4: Admin GA get_notifikasi() returns full aggregate of pending actions
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_uid::text, 'role', 'authenticated')::text, true);
  v_notif := public.get_notifikasi();
  assert (v_notif->>'role') = 'admin_ga', 'TEST 4 FAILED: Role in notification is not admin_ga';
  assert (v_notif->>'revisi_menunggu')::integer >= 2, 'TEST 4 FAILED: Admin GA did not aggregate both revisions';
  assert (v_notif->>'total')::integer >= 2, 'TEST 4 FAILED: Admin GA total notifications mismatch';

  raise notice 'All Realtime RLS isolation tests PASSED successfully!';
end $$;

rollback;
