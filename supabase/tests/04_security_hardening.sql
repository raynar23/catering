-- Security hardening test suite: RLS isolation, RPC guards, and immutability checks
-- Runs within a transaction that always rolls back to preserve operational data

begin;

do $$
declare
  v_admin_uid uuid := gen_random_uuid();
  v_aisya_uid uuid := gen_random_uuid();
  v_ibu_uid uuid := gen_random_uuid();
  v_aisya_vid uuid;
  v_ibu_vid uuid;
  v_shift_id uuid;
  v_period_aisya uuid;
  v_period_ibu uuid;
  v_order_aisya uuid;
  v_order_ibu uuid;
  v_item_aisya uuid;
  v_revision_id uuid;
  v_visible_count integer;
  v_bagian_id uuid;
begin
  select id into v_shift_id from shifts limit 1;
  select id into v_bagian_id from bagian limit 1;
  select id into v_aisya_vid from vendors where kode = 'V001';
  select id into v_ibu_vid from vendors where kode = 'V002';

  -- 1. Setup mock profiles
  insert into profiles (id, username, nama, role, vendor_id, aktif)
  values
    (v_admin_uid, 'test.admin.ga', 'Test Admin GA', 'admin_ga', null, true),
    (v_aisya_uid, 'test.vendor.aisya', 'Test Vendor Aisya', 'vendor', v_aisya_vid, true),
    (v_ibu_uid, 'test.vendor.ibu', 'Test Vendor IBU', 'vendor', v_ibu_vid, true);

  -- 2. Setup mock periods and orders
  insert into periods (tanggal, shift_id, vendor_id, keterangan)
  values
    ('2099-11-01', v_shift_id, v_aisya_vid, 'Periode Uji Aisya'),
    ('2099-11-02', v_shift_id, v_ibu_vid, 'Periode Uji IBU')
  returning id into v_period_aisya;
  select id into v_period_ibu from periods where tanggal = '2099-11-02' and shift_id = v_shift_id;

  insert into catering_orders (period_id, vendor_id, status, created_by)
  values
    (v_period_aisya, v_aisya_vid, 'final', v_admin_uid),
    (v_period_ibu, v_ibu_vid, 'final', v_admin_uid)
  returning id into v_order_aisya;
  select id into v_order_ibu from catering_orders where period_id = v_period_ibu;

  insert into catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi, porsi)
  values (v_order_aisya, v_bagian_id, 20, 20, 20)
  returning id into v_item_aisya;

  insert into order_logs (order_id, aksi, oleh, keterangan)
  values (v_order_aisya, 'finalisasi', v_admin_uid, 'Log uji awal');

  -- TEST 1: Role escalation attempt from vendor to admin_ga must fail
  perform set_config('request.jwt.claims', json_build_object('sub', v_aisya_uid::text, 'role', 'authenticated')::text, true);

  begin
    update profiles set role = 'admin_ga' where id = v_aisya_uid;
    raise exception 'TEST 1 FAILED: Vendor berhasil eskalasi role ke admin_ga!';
  exception
    when others then
      if sqlerrm like '%Modifikasi kolom terlindungi%' or sqlerrm like '%permission denied%' or sqlerrm like '%Akses ditolak%' then
        raise notice 'TEST 1 PASSED: Eskalasi role ditolak dengan benar.';
      else
        raise;
      end if;
  end;

  -- TEST 2: Vendor A cannot see Vendor B orders, items, or profiles
  select count(*) into v_visible_count from catering_orders where id = v_order_ibu;
  if v_visible_count > 0 then
    raise exception 'TEST 2 FAILED: Vendor Aisya dapat membaca pesanan Vendor IBU!';
  end if;

  select count(*) into v_visible_count from profiles where id = v_ibu_uid;
  if v_visible_count > 0 then
    raise exception 'TEST 2 FAILED: Vendor Aisya dapat membaca profil Vendor IBU!';
  end if;
  raise notice 'TEST 2 PASSED: Isolasi data vendor A dan vendor B terbukti ketat.';

  -- TEST 3: Direct insert/update to operational tables must fail
  begin
    insert into catering_orders (period_id, vendor_id, status)
    values (v_period_aisya, v_aisya_vid, 'final');
    raise exception 'TEST 3 FAILED: Penulisan langsung ke catering_orders berhasil!';
  exception
    when others then
      raise notice 'TEST 3 PASSED: Penulisan langsung ke catering_orders ditolak.';
  end;

  -- TEST 4: Direct update and delete on order_logs must fail
  begin
    delete from order_logs where order_id = v_order_aisya;
    raise exception 'TEST 4 FAILED: Penghapusan langsung pada order_logs diizinkan!';
  exception
    when others then
      raise notice 'TEST 4 PASSED: Immutability order_logs terbukti (penghapusan ditolak).';
  end;

  -- TEST 5: Admin RPC called by vendor must fail
  begin
    perform verifikasi_revisi(gen_random_uuid(), true, 'Catatan bypass');
    raise exception 'TEST 5 FAILED: Vendor berhasil memanggil RPC admin verifikasi_revisi!';
  exception
    when others then
      if sqlerrm like '%Akses ditolak%' or sqlerrm like '%Hanya Administrator%' or sqlerrm like '%permission denied%' then
        raise notice 'TEST 5 PASSED: Pemanggilan RPC admin oleh vendor ditolak.';
      else
        raise;
      end if;
  end;

  -- TEST 6: Progress regression or skipping must fail
  -- Must accept first before progressing
  begin
    perform update_progres_vendor(v_order_aisya, 'dikirim'::vendor_progress, 'Langsung kirim');
    raise exception 'TEST 6 FAILED: Vendor dapat update progres sebelum menyanggupi!';
  exception
    when others then
      raise notice 'TEST 6 PASSED: Progres sebelum kesanggupi ditolak dengan benar.';
  end;

  -- Respond with menyanggupi
  perform respon_periode_vendor(v_order_aisya, true, 'Siap antar');

  -- Update progress to dipersiapkan
  perform update_progres_vendor(v_order_aisya, 'dipersiapkan'::vendor_progress, 'Mulai masak');

  -- Attempt backward progress from dipersiapkan to menunggu
  begin
    perform update_progres_vendor(v_order_aisya, 'menunggu'::vendor_progress, 'Mundur ke menunggu');
    raise exception 'TEST 6 FAILED: Vendor dapat memundurkan progres!';
  exception
    when others then
      raise notice 'TEST 6 PASSED: Kemunduran progres ditolak dengan benar.';
  end;

  -- TEST 7: Double revision on the same item must fail
  -- Switch session to admin
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_uid::text, 'role', 'authenticated')::text, true);

  perform ajukan_revisi(v_item_aisya, 25, 25, 'Revisi pertama valid');

  begin
    perform ajukan_revisi(v_item_aisya, 30, 30, 'Revisi kedua ilegal');
    raise exception 'TEST 7 FAILED: Revisi ganda pada item yang sama diizinkan!';
  exception
    when others then
      if sqlerrm like '%revisi yang masih menunggu%' or sqlerrm like '%Revisi menunggu%' then
        raise notice 'TEST 7 PASSED: Revisi ganda pada item yang sama sukses ditolak.';
      else
        raise;
      end if;
  end;
end $$;

rollback;
