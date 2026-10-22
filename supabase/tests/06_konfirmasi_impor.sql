-- Test suite 06: Verification of konfirmasi_impor RPC authorization, validation, and options
-- Runs inside a transaction that rolls back to preserve operational state

begin;

do $$
declare
  v_admin_uid uuid := gen_random_uuid();
  v_vendor_uid uuid := gen_random_uuid();
  v_vendor_id uuid;
  v_shift_id uuid;
  v_batch_id uuid;
  v_period_id uuid;
  v_order_id uuid;
  v_result jsonb;
  v_err_caught boolean := false;
  v_dummy_date date := '2099-11-01'::date;
begin
  select id into v_shift_id from shifts limit 1;
  select id into v_vendor_id from vendors limit 1;

  -- 1. Setup mock profiles
  insert into profiles (id, username, nama, role, vendor_id, aktif)
  values
    (v_admin_uid, 'test.impor.admin', 'Test Impor Admin', 'admin_ga', null, true),
    (v_vendor_uid, 'test.impor.vendor', 'Test Impor Vendor', 'vendor', v_vendor_id, true);

  -- 2. Setup mock draft import batch
  insert into import_batches (
    nomor_batch,
    nama_file,
    tipe_file,
    ukuran_bytes,
    status,
    total_baris,
    data_parsed,
    diimpor_oleh,
    jenis_dokumen,
    mesin,
    ringkasan
  )
  values (
    'IMP-20991101-TEST',
    'jadwal_test.xlsx',
    'xlsx',
    1024,
    'draft',
    1,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'row-1',
        'status', 'cocok',
        'tanggal', v_dummy_date::text,
        'shift_id', v_shift_id::text,
        'shift_alias', 'siang',
        'vendor_id', v_vendor_id::text,
        'vendor_nama', 'Vendor Uji'
      )
    ),
    v_admin_uid,
    'jadwal',
    'aturan',
    '{"total": 1, "cocok": 1}'::jsonb
  )
  returning id into v_batch_id;

  -- TEST 1: Vendor cannot execute konfirmasi_impor
  perform set_config('request.jwt.claims', json_build_object('sub', v_vendor_uid::text, 'role', 'authenticated')::text, true);
  v_err_caught := false;
  begin
    perform public.konfirmasi_impor(v_batch_id);
  exception when others then
    v_err_caught := true;
  end;
  assert v_err_caught = true, 'TEST 1 FAILED: Vendor was able to confirm import';

  -- TEST 2: Admin can confirm import batch and period is created
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_uid::text, 'role', 'authenticated')::text, true);
  v_result := public.konfirmasi_impor(v_batch_id);
  assert (v_result->>'success')::boolean = true, 'TEST 2 FAILED: konfirmasi_impor returned failure';
  assert exists (select 1 from periods where tanggal = v_dummy_date and shift_id = v_shift_id and vendor_id = v_vendor_id), 'TEST 2 FAILED: Period was not created';
  assert exists (select 1 from import_batches where id = v_batch_id and status = 'selesai' and dikonfirmasi_at is not null), 'TEST 2 FAILED: Batch status was not set to selesai';

  -- TEST 3: Cannot confirm the same batch again
  v_err_caught := false;
  begin
    perform public.konfirmasi_impor(v_batch_id);
  exception when others then
    v_err_caught := true;
  end;
  assert v_err_caught = true, 'TEST 3 FAILED: Selesai batch was confirmed again';

  -- TEST 4: Auto-create vendor when buat_vendor_baru is true
  insert into import_batches (
    nomor_batch,
    nama_file,
    tipe_file,
    ukuran_bytes,
    status,
    total_baris,
    data_parsed,
    diimpor_oleh,
    jenis_dokumen,
    mesin,
    ringkasan
  )
  values (
    'IMP-20991102-TEST',
    'jadwal_new_vendor.xlsx',
    'xlsx',
    1024,
    'draft',
    1,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'row-2',
        'status', 'baru',
        'tanggal', '2099-11-02',
        'shift_id', v_shift_id::text,
        'shift_alias', 'siang',
        'vendor_id', null,
        'vendor_nama', 'Vendor Baru Eksperimental'
      )
    ),
    v_admin_uid,
    'jadwal',
    'aturan',
    '{"total": 1, "baru": 1}'::jsonb
  )
  returning id into v_batch_id;

  v_result := public.konfirmasi_impor(v_batch_id, null, '{"buat_vendor_baru": true}'::jsonb);
  assert (v_result->>'success')::boolean = true, 'TEST 4 FAILED: Auto create vendor failed';
  assert exists (select 1 from vendors where nama = 'Vendor Baru Eksperimental'), 'TEST 4 FAILED: Vendor was not inserted into vendors table';

  -- TEST 5: Overwrite protection for non-draft periods
  select id into v_period_id from periods where tanggal = v_dummy_date and shift_id = v_shift_id;
  insert into catering_orders (period_id, vendor_id, status, created_by)
  values (v_period_id, v_vendor_id, 'final', v_admin_uid)
  returning id into v_order_id;

  -- Create a new batch attempting to overwrite without timpa_periode flag
  insert into import_batches (
    nomor_batch,
    nama_file,
    tipe_file,
    ukuran_bytes,
    status,
    total_baris,
    data_parsed,
    diimpor_oleh,
    jenis_dokumen,
    mesin
  )
  values (
    'IMP-20991103-TEST',
    'jadwal_overwrite.xlsx',
    'xlsx',
    1024,
    'draft',
    1,
    jsonb_build_array(
      jsonb_build_object(
        'id', 'row-3',
        'status', 'cocok',
        'tanggal', v_dummy_date::text,
        'shift_id', v_shift_id::text,
        'shift_alias', 'siang',
        'vendor_id', (select id from vendors where nama = 'Vendor Baru Eksperimental')::text,
        'vendor_nama', 'Vendor Baru Eksperimental'
      )
    ),
    v_admin_uid,
    'jadwal',
    'aturan'
  )
  returning id into v_batch_id;

  -- Run without timpa_periode (should skip overwrite)
  perform public.konfirmasi_impor(v_batch_id, null, '{"timpa_periode": false}'::jsonb);
  assert (select vendor_id from catering_orders where id = v_order_id) = v_vendor_id, 'TEST 5 FAILED: Order was overwritten without timpa_periode option';

  -- Now run with timpa_periode = true (should overwrite and record log)
  -- Reset batch to draft for testing the overwrite flow
  update import_batches set status = 'draft' where id = v_batch_id;
  perform public.konfirmasi_impor(v_batch_id, null, '{"timpa_periode": true}'::jsonb);
  assert (select vendor_id from catering_orders where id = v_order_id) <> v_vendor_id, 'TEST 5 FAILED: Order vendor was not updated with timpa_periode=true';
  assert exists (select 1 from order_logs where order_id = v_order_id and aksi = 'diubah'), 'TEST 5 FAILED: order_logs entry was not recorded for overwrite';

  raise notice 'All konfirmasi_impor SQL tests PASSED successfully!';
end $$;

rollback;
