-- Test suite: RPC business rules and append-only constraints

begin;

do $$
declare
  v_admin_id uuid := gen_random_uuid();
  v_pic_id uuid := gen_random_uuid();
  v_vendor_user uuid := gen_random_uuid();
  v_vendor_id uuid;
  v_shift_id uuid;
  v_b_cc uuid;
  v_b_rtg uuid;
  v_period_id uuid;
  v_order_id uuid;
  v_item_id uuid;
  v_rev_id uuid;
  v_rekap_count integer;
  v_items_json jsonb;
begin
  select id into v_shift_id from shifts limit 1;
  select id into v_vendor_id from vendors where kode = 'V001';
  select id into v_b_cc from bagian where kode = 'CC_OP';
  select id into v_b_rtg from bagian where kode = 'RTG_OP';

  insert into profiles (id, username, nama, role, vendor_id)
  values
    (v_admin_id, 'mock.admin', 'Admin Mock', 'admin_ga', null),
    (v_pic_id, 'mock.pic', 'PIC Mock', 'pic_unit', null),
    (v_vendor_user, 'mock.vendor', 'Vendor Mock', 'vendor', v_vendor_id);

  insert into periods (tanggal, shift_id, vendor_id, keterangan)
  values ('2099-05-01', v_shift_id, v_vendor_id, 'Period Test Rules')
  returning id into v_period_id;

  -- 1. TEST DIRECT CLIENT WRITE BLOCKED BY RLS
  perform set_config('request.jwt.claims', json_build_object('sub', v_pic_id::text)::text, true);
  begin
    insert into catering_orders (period_id, vendor_id, status, created_by)
    values (v_period_id, v_vendor_id, 'draft', v_pic_id);
    raise exception 'TEST FAILED: Klien dapat melakukan INSERT langsung ke catering_orders!';
  exception
    when others then
      if sqlerrm like '%violates row-level security policy%' or sqlerrm like '%denied%' then
        raise notice 'TEST PASSED: Direct write to catering_orders dicegah oleh RLS.';
      else
        raise;
      end if;
  end;

  -- 2. TEST simpan_catering (Via Security Definer RPC)
  v_items_json := jsonb_build_array(
    jsonb_build_object('bagian_id', v_b_cc, 'jumlah_karyawan', 20, 'jumlah_porsi', 20)
  );
  v_order_id := simpan_catering(v_period_id, v_items_json, 'Test Draft');
  if v_order_id is null then
    raise exception 'TEST FAILED: simpan_catering gagal membuat draft.';
  else
    raise notice 'TEST PASSED: simpan_catering berhasil membuat draft.';
  end if;

  -- 3. TEST kirim_catering MENOLAK JIKA ADA BAGIAN KOSONG
  -- Only CC_OP was filled, RTG_OP and others are active but missing!
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text)::text, true);
  begin
    perform kirim_catering(v_order_id, 'Pengiriman Belum Lengkap');
    raise exception 'TEST FAILED: kirim_catering mengizinkan pengiriman saat ada bagian yang kosong!';
  exception
    when others then
      if sqlerrm like '%seluruh bagian aktif wajib diisi%' then
        raise notice 'TEST PASSED: kirim_catering sukses menolak pesanan tidak lengkap.';
      else
        raise;
      end if;
  end;

  -- Complete all active sections
  v_items_json := jsonb_build_array(
    jsonb_build_object('bagian_id', v_b_cc, 'jumlah_karyawan', 20, 'jumlah_porsi', 20),
    jsonb_build_object('bagian_id', v_b_rtg, 'jumlah_karyawan', 18, 'jumlah_porsi', 18),
    jsonb_build_object('bagian_id', (select id from bagian where kode = 'MEK_CC'), 'jumlah_karyawan', 12, 'jumlah_porsi', 12),
    jsonb_build_object('bagian_id', (select id from bagian where kode = 'MEK_RTG'), 'jumlah_karyawan', 10, 'jumlah_porsi', 10),
    jsonb_build_object('bagian_id', (select id from bagian where kode = 'CFS'), 'jumlah_karyawan', 20, 'jumlah_porsi', 20)
  );
  perform simpan_catering(v_period_id, v_items_json, 'Draft Lengkap');
  perform kirim_catering(v_order_id, 'Kirim Final');
  raise notice 'TEST PASSED: kirim_catering sukses difinalisasi saat seluruh bagian terisi.';

  -- 4. TEST v_rekap MEMUAT DATA FINAL
  select count(*) into v_rekap_count from v_rekap where order_id = v_order_id;
  if v_rekap_count <> 5 then
    raise exception 'TEST FAILED: v_rekap tidak memuat 5 baris bagian untuk pesanan Final!';
  else
    raise notice 'TEST PASSED: v_rekap berhasil menampilkan data berlaku (Final).';
  end if;

  -- 5. TEST ajukan_revisi
  select id into v_item_id from catering_items where order_id = v_order_id and bagian_id = v_b_cc;
  perform set_config('request.jwt.claims', json_build_object('sub', v_pic_id::text)::text, true);
  v_rev_id := ajukan_revisi(v_item_id, 23, 23, 'Karyawan lembur shift');

  -- 6. TEST SATU REVISI MENUNGGU PER ITEM (UNIQUE CONSTRAINT)
  begin
    perform ajukan_revisi(v_item_id, 25, 25, 'Revisi kedua tumpuk');
    raise exception 'TEST FAILED: Mengizinkan revisi ganda berstatus menunggu pada item yang sama!';
  exception
    when others then
      if sqlerrm like '%Masih ada pengajuan revisi yang menunggu%' or sqlerrm like '%idx_revisions_one_menunggu%' then
        raise notice 'TEST PASSED: Satu revisi menunggu per item ditegakkan.';
      else
        raise;
      end if;
  end;

  -- 7. TEST REVISIONS IMMUTABLE TRIGGER
  begin
    update revisions set porsi_baru = 99 where id = v_rev_id;
    raise exception 'TEST FAILED: Kolom inti revisi dapat diubah!';
  exception
    when others then
      if sqlerrm like '%Kolom inti revisi bersifat tetap%' then
        raise notice 'TEST PASSED: Kolom inti revisi terlindungi dari UPDATE langsung.';
      else
        raise;
      end if;
  end;

  -- 8. TEST PENGAJU TIDAK DAPAT MEMVERIFIKASI REVISINYA SENDIRI
  -- v_pic_id was the submitter, trying to verify
  begin
    perform verifikasi_revisi(v_rev_id, true, 'Self approval');
    raise exception 'TEST FAILED: Pengaju dapat memverifikasi revisinya sendiri!';
  exception
    when others then
      if sqlerrm like '%Pengaju tidak diperbolehkan memverifikasi%' then
        raise notice 'TEST PASSED: Self-verification dicegah.';
      else
        raise;
      end if;
  end;

  -- 9. TEST verifikasi_revisi MENERAPKAN ANGKA BARU HANYA SAAT DISETUJUI
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text)::text, true);
  perform verifikasi_revisi(v_rev_id, true, 'Disetujui Admin GA');
  if (select jumlah_porsi from catering_items where id = v_item_id) <> 23 then
    raise exception 'TEST FAILED: Angka baru tidak diterapkan setelah revisi disetujui!';
  else
    raise notice 'TEST PASSED: verifikasi_revisi menerapkan angka baru saat disetujui.';
  end if;

  -- 10. TEST update_progres_vendor HANYA SETELAH MENYANGGUPI & HANYA MAJU
  perform set_config('request.jwt.claims', json_build_object('sub', v_vendor_user::text)::text, true);
  -- Currently respon_vendor is 'menunggu'
  begin
    perform update_progres_vendor(v_order_id, 'dipersiapkan'::vendor_progress, 'Mulai masak');
    raise exception 'TEST FAILED: Vendor dapat update progres sebelum menyanggupi pesanan!';
  exception
    when others then
      if sqlerrm like '%hanya dapat diperbarui setelah pesanan disanggupi%' then
        raise notice 'TEST PASSED: Progres sebelum kesanggupan berhasil ditolak.';
      else
        raise;
      end if;
  end;

  -- Respond sanggup
  perform respon_periode_vendor(v_order_id, true, 'Siap antar');
  -- Progress: dipersiapkan
  perform update_progres_vendor(v_order_id, 'dipersiapkan'::vendor_progress, 'Sedang dipersiapkan');
  -- Progress: dikirim
  perform update_progres_vendor(v_order_id, 'dikirim'::vendor_progress, 'Kurir berangkat');

  -- Progress mundur (dikirim -> dipersiapkan) must be rejected
  begin
    perform update_progres_vendor(v_order_id, 'dipersiapkan'::vendor_progress, 'Mundur status');
    raise exception 'TEST FAILED: Progres vendor dapat bergerak mundur!';
  exception
    when others then
      if sqlerrm like '%hanya dapat bergerak maju%' then
        raise notice 'TEST PASSED: Progres mundur sukses dicegah.';
      else
        raise;
      end if;
  end;

  -- 11. TEST ORDER_LOGS APPEND-ONLY
  begin
    delete from order_logs where order_id = v_order_id;
    raise exception 'TEST FAILED: order_logs dapat dihapus!';
  exception
    when others then
      if sqlerrm like '%order_logs bersifat append-only%' then
        raise notice 'TEST PASSED: order_logs dilindungi dari DELETE.';
      else
        raise;
      end if;
  end;

  raise notice 'ALL DATABASE RPC AND BUSINESS RULES TESTS PASSED!';
end $$;

rollback;
