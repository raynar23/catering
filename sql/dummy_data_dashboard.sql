-- =============================================================================
-- DUMMY DATA: Catering TPS Dashboard - 1 Year of Historical Data
-- Covers: October 2025 through 2 days before today (3 shifts/day, skip Sundays)
-- Paste this entire script into the Supabase SQL Editor and click Run.
-- =============================================================================

do $$
declare
  v_admin_id        uuid := '26273c94-99df-4327-b6d3-4426bf389b76';
  v_shift1_id       uuid := 'f40067af-896e-4d44-8823-5e8601b68e69';
  v_shift2_id       uuid := 'f35cf99b-1db8-46d2-8b21-573423e7c179';
  v_shift3_id       uuid := 'b73ab020-51d4-440d-9175-831387d9f960';
  v_cc_op_id        uuid := 'fb7b4be2-a185-4d88-b4a0-7d1ba42b9415';
  v_rtg_op_id       uuid := '29a5a1af-33c2-4735-878f-a19fcce2381c';
  v_mek_cc_id       uuid := '68b877da-2687-47cf-83bf-54eb51625fb5';
  v_mek_rtg_id      uuid := '13539827-a6eb-49ec-bf9a-b748e7c2e7f1';
  v_cfs_id          uuid := 'cda2caab-744a-42aa-b408-c9067e421c47';
  v_vendors         uuid[] := array[
    '724eccc2-9331-4812-b6d4-0576553374ca'::uuid,
    '9bd68d07-9c64-43d9-a6ce-d9bb6a2c7167'::uuid,
    '455bca99-4132-44fb-92a0-935421db1c95'::uuid,
    'a89355f1-be63-4832-bf6f-1c8b697cdd70'::uuid,
    '2971f161-74fc-41a0-ac94-1137419d9d93'::uuid
  ];
  v_shifts          uuid[] := array[
    'f40067af-896e-4d44-8823-5e8601b68e69'::uuid,
    'f35cf99b-1db8-46d2-8b21-573423e7c179'::uuid,
    'b73ab020-51d4-440d-9175-831387d9f960'::uuid
  ];
  v_day             date;
  v_day_index       integer := 0;
  v_vendor_id       uuid;
  v_shift_id        uuid;
  v_period_id       uuid;
  v_order_id        uuid;
  v_item_id         uuid;
  v_rev_id          uuid;
  v_porsi_cc        integer;
  v_porsi_rtg       integer;
  v_porsi_mek_cc    integer;
  v_porsi_mek_rtg   integer;
  v_porsi_cfs       integer;
  v_shift_loop      integer;
begin
  for v_day in select gs::date from generate_series('2025-10-01'::date, current_date - 2, '1 day') gs loop
    if extract(dow from v_day) = 0 then continue; end if;
    v_day_index := v_day_index + 1;
    v_vendor_id := v_vendors[((v_day_index - 1) % 5) + 1];
    for v_shift_loop in 1..3 loop
      v_shift_id := v_shifts[v_shift_loop];
      if exists(select 1 from periods where tanggal = v_day and shift_id = v_shift_id) then continue; end if;
      v_porsi_cc      := 40 + (extract(day from v_day)::int % 12);
      v_porsi_rtg     := 55 + (extract(day from v_day)::int % 15);
      v_porsi_mek_cc  := 18 + (extract(day from v_day)::int % 6);
      v_porsi_mek_rtg := 22 + (extract(day from v_day)::int % 8);
      v_porsi_cfs     := 14 + (extract(day from v_day)::int % 5);
      insert into periods(id, tanggal, shift_id, vendor_id, created_at)
        values(gen_random_uuid(), v_day, v_shift_id, v_vendor_id, v_day + interval '7h')
        returning id into v_period_id;
      insert into catering_orders(id, period_id, vendor_id, status, created_by, submitted_by, submitted_at,
        verified_by, verified_at, respon_vendor, respon_vendor_at, progres_vendor, progres_vendor_at, created_at, updated_at)
        values(gen_random_uuid(), v_period_id, v_vendor_id, 'final', v_admin_id, v_admin_id, v_day + interval '8h',
          v_admin_id, v_day + interval '9h', 'disanggupi', v_day + interval '10h', 'selesai', v_day + interval '14h',
          v_day + interval '7h', v_day + interval '14h')
        returning id into v_order_id;
      insert into catering_items(id, order_id, bagian_id, jumlah_karyawan, jumlah_porsi, created_at, updated_at) values
        (gen_random_uuid(), v_order_id, v_cc_op_id,    v_porsi_cc,     v_porsi_cc,     v_day + interval '8h', v_day + interval '8h'),
        (gen_random_uuid(), v_order_id, v_rtg_op_id,   v_porsi_rtg,    v_porsi_rtg,    v_day + interval '8h', v_day + interval '8h'),
        (gen_random_uuid(), v_order_id, v_mek_cc_id,   v_porsi_mek_cc, v_porsi_mek_cc, v_day + interval '8h', v_day + interval '8h'),
        (gen_random_uuid(), v_order_id, v_mek_rtg_id,  v_porsi_mek_rtg,v_porsi_mek_rtg,v_day + interval '8h', v_day + interval '8h'),
        (gen_random_uuid(), v_order_id, v_cfs_id,      v_porsi_cfs,    v_porsi_cfs,    v_day + interval '8h', v_day + interval '8h');
      insert into order_logs(id, order_id, aksi, keterangan, oleh, created_at) values
        (gen_random_uuid(), v_order_id, 'input_awal',     'Data awal diinput oleh admin GA', v_admin_id, v_day + interval '7h30m'),
        (gen_random_uuid(), v_order_id, 'kirim_ke_vendor','Pesanan dikirim ke vendor',        v_admin_id, v_day + interval '8h'),
        (gen_random_uuid(), v_order_id, 'vendor_sanggup', 'Vendor menyanggupi pesanan',       v_admin_id, v_day + interval '10h');
      -- Add revision on every 5th Shift-1 entry
      if v_shift_id = v_shift1_id and (v_day_index % 5) = 0 then
        select id into v_item_id from catering_items where order_id = v_order_id and bagian_id = v_cc_op_id limit 1;
        if v_item_id is not null then
          insert into revisions(id, item_id, karyawan_awal, karyawan_baru, porsi_awal, porsi_baru,
            alasan, status, diajukan_oleh, diajukan_at, diverifikasi_oleh, diverifikasi_at,
            catatan_verifikator, respon_vendor, respon_vendor_at, created_at)
            values(gen_random_uuid(), v_item_id, v_porsi_cc, v_porsi_cc+2, v_porsi_cc, v_porsi_cc+2,
              'Penambahan 2 karyawan lembur mendadak', 'disetujui', v_admin_id, v_day + interval '11h',
              v_admin_id, v_day + interval '12h', 'Disetujui sesuai data absensi lembur',
              'disanggupi', v_day + interval '12h30m', v_day + interval '11h')
            returning id into v_rev_id;
          insert into order_logs(id, order_id, revision_id, item_id, aksi, jumlah_awal, selisih, jumlah_baru, keterangan, oleh, created_at) values
            (gen_random_uuid(), v_order_id, v_rev_id, v_item_id, 'revisi_diajukan',  v_porsi_cc, 2, v_porsi_cc+2, 'Revisi diajukan', v_admin_id, v_day + interval '11h'),
            (gen_random_uuid(), v_order_id, v_rev_id, v_item_id, 'revisi_disetujui', v_porsi_cc, 2, v_porsi_cc+2, 'Revisi disetujui', v_admin_id, v_day + interval '12h');
        end if;
      end if;
    end loop;
  end loop;
  raise notice 'Dummy data OK: % days processed', v_day_index;
end $$;

-- Quick check after running:
-- select count(*) from periods;       -- expect ~950+
-- select count(*) from catering_orders; -- same
-- select count(*) from catering_items;  -- 5x orders
-- select count(*) from revisions;       -- ~1/5 of weekday count
