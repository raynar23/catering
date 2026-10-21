-- Demo seed data for shifts, sections, vendors, profiles, and 29-day rolling schedule

do $$
declare
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_admin2_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  v_vendor_aisya_id uuid := '00000000-0000-0000-0000-000000000003'::uuid;
  v_vendor_ibu_id uuid := '00000000-0000-0000-0000-000000000004'::uuid;
  v_vendor_nikmat_id uuid := '00000000-0000-0000-0000-000000000005'::uuid;
  v_vendor_adhi_id uuid := '00000000-0000-0000-0000-000000000006'::uuid;
  v_vendor_nurina_id uuid := '00000000-0000-0000-0000-000000000007'::uuid;

  v_v001_id uuid;
  v_v002_id uuid;
  v_v003_id uuid;
  v_v004_id uuid;
  v_v005_id uuid;

  v_s1_id uuid;
  v_s2_id uuid;
  v_s3_id uuid;

  v_b_cc uuid;
  v_b_rtg uuid;
  v_b_mek_cc uuid;
  v_b_mek_rtg uuid;
  v_b_cfs uuid;

  v_day integer;
  v_date date;
  v_vendor_id uuid;
  v_vendor_idx integer;
  v_period_id uuid;
  v_order_id uuid;
  v_order_status order_status;
  v_resp_vendor vendor_response_status;
  v_prog_vendor vendor_progress;

  v_porsi_cc integer;
  v_porsi_rtg integer;
  v_porsi_mek_cc integer;
  v_porsi_mek_rtg integer;
  v_porsi_cfs integer;
  v_item_cc_id uuid;
  v_rev_id uuid;
begin
  -- 1. SHIFTS
  insert into shifts (nama, label, alias, jam_mulai, jam_selesai, batas_tiba, urutan, urutan_laporan, keterangan)
  values
    ('Shift 1', 'Siang', 'Siang', '08:00', '16:00', '10:00', 0, 2, 'Shift siang operasional terminal'),
    ('Shift 2', 'Sore', 'Sore', '16:00', '23:59:59', '17:00', 1, 3, 'Shift sore operasional terminal'),
    ('Shift 3', 'Malam', 'Malam', '00:00', '08:00', '01:00', 2, 1, 'Shift malam operasional terminal')
  on conflict (nama) do update set
    label = excluded.label,
    alias = excluded.alias,
    jam_mulai = excluded.jam_mulai,
    jam_selesai = excluded.jam_selesai,
    batas_tiba = excluded.batas_tiba,
    urutan = excluded.urutan,
    urutan_laporan = excluded.urutan_laporan;

  select id into v_s1_id from shifts where nama = 'Shift 1';
  select id into v_s2_id from shifts where nama = 'Shift 2';
  select id into v_s3_id from shifts where nama = 'Shift 3';

  -- 2. BAGIAN
  insert into bagian (kode, nama, kelompok, lokasi_antar, alias, keterangan, urutan)
  values
    ('CC_OP', 'CC Operator', 'Operasional', 'Dermaga / CC', 'CC Ops', 'Operator Quay Container Crane Dermaga', 1),
    ('RTG_OP', 'RTG Operator', 'Operasional', 'Lapangan RTG', 'RTG Ops', 'Operator Rubber Tyred Gantry Lapangan', 2),
    ('MEK_CC', 'Mekanik CC', 'Teknik', 'Workshop CC', 'Mek CC', 'Teknisi & Pemeliharaan Container Crane', 3),
    ('MEK_RTG', 'Mekanik RTG', 'Teknik', 'Workshop RTG', 'Mek RTG', 'Teknisi & Pemeliharaan RTG Crane', 4),
    ('CFS', 'Area Gudang CFS', 'Gudang', 'Gudang CFS', 'CFS', 'Petugas Pergudangan Container Freight Station', 5)
  on conflict (nama) do update set
    kode = excluded.kode,
    kelompok = excluded.kelompok,
    lokasi_antar = excluded.lokasi_antar,
    alias = excluded.alias,
    urutan = excluded.urutan;

  select id into v_b_cc from bagian where kode = 'CC_OP';
  select id into v_b_rtg from bagian where kode = 'RTG_OP';
  select id into v_b_mek_cc from bagian where kode = 'MEK_CC';
  select id into v_b_mek_rtg from bagian where kode = 'MEK_RTG';
  select id into v_b_cfs from bagian where kode = 'CFS';

  -- 3. VENDORS
  insert into vendors (kode, nama, kontak, alamat, urutan_rotasi)
  values
    ('V001', 'Aisya Catering', '08123456701', 'Jl. Tanjung Perak Barat No. 12, Surabaya', 0),
    ('V002', 'Catering IBU', '08123456702', 'Jl. Perak Timur No. 45, Surabaya', 1),
    ('V003', 'Nikmat Rasa', '08123456703', 'Jl. Rajawali No. 88, Surabaya', 2),
    ('V004', 'Adhi Hidayah', '08123456704', 'Jl. Kembang Jepun No. 23, Surabaya', 3),
    ('V005', 'Nurina Catering', '08123456705', 'Jl. Kalimas Barat No. 56, Surabaya', 4)
  on conflict (kode) do update set
    nama = excluded.nama,
    kontak = excluded.kontak,
    alamat = excluded.alamat,
    urutan_rotasi = excluded.urutan_rotasi;

  select id into v_v001_id from vendors where kode = 'V001';
  select id into v_v002_id from vendors where kode = 'V002';
  select id into v_v003_id from vendors where kode = 'V003';
  select id into v_v004_id from vendors where kode = 'V004';
  select id into v_v005_id from vendors where kode = 'V005';

  -- 4. AUTH USERS AND PROFILES
  -- Ensure demo auth accounts exist before referencing in profiles

  -- Admin GA 1
  select id into v_admin_id from auth.users where email = 'admin.ga@tps.co.id';
  if v_admin_id is null then
    if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000001'::uuid) then
      v_admin_id := gen_random_uuid();
    else
      v_admin_id := '00000000-0000-0000-0000-000000000001'::uuid;
    end if;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid, v_admin_id, 'authenticated', 'authenticated',
      'admin.ga@tps.co.id', crypt('TpsCatering2026!', gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nama":"Admin General Affairs 1","username":"admin.ga"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  end if;

  -- Admin GA 2
  select id into v_admin2_id from auth.users where email = 'admin2.ga@tps.co.id';
  if v_admin2_id is null then
    if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000002'::uuid) then
      v_admin2_id := gen_random_uuid();
    else
      v_admin2_id := '00000000-0000-0000-0000-000000000002'::uuid;
    end if;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid, v_admin2_id, 'authenticated', 'authenticated',
      'admin2.ga@tps.co.id', crypt('TpsCatering2026!', gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nama":"Admin General Affairs 2","username":"admin2.ga"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  end if;

  -- Vendor Aisya (V001)
  select id into v_vendor_aisya_id from auth.users where email = 'vendor.aisya@tps.co.id';
  if v_vendor_aisya_id is null then
    if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000003'::uuid) then
      v_vendor_aisya_id := gen_random_uuid();
    else
      v_vendor_aisya_id := '00000000-0000-0000-0000-000000000003'::uuid;
    end if;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid, v_vendor_aisya_id, 'authenticated', 'authenticated',
      'vendor.aisya@tps.co.id', crypt('TpsCatering2026!', gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nama":"Petugas Aisya Catering","username":"vendor.aisya"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  end if;

  -- Vendor IBU (V002)
  select id into v_vendor_ibu_id from auth.users where email = 'vendor.ibu@tps.co.id';
  if v_vendor_ibu_id is null then
    if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000004'::uuid) then
      v_vendor_ibu_id := gen_random_uuid();
    else
      v_vendor_ibu_id := '00000000-0000-0000-0000-000000000004'::uuid;
    end if;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid, v_vendor_ibu_id, 'authenticated', 'authenticated',
      'vendor.ibu@tps.co.id', crypt('TpsCatering2026!', gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nama":"Petugas Catering IBU","username":"vendor.ibu"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  end if;

  -- Vendor Nikmat Rasa (V003)
  select id into v_vendor_nikmat_id from auth.users where email = 'vendor.nikmat@tps.co.id';
  if v_vendor_nikmat_id is null then
    if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000005'::uuid) then
      v_vendor_nikmat_id := gen_random_uuid();
    else
      v_vendor_nikmat_id := '00000000-0000-0000-0000-000000000005'::uuid;
    end if;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid, v_vendor_nikmat_id, 'authenticated', 'authenticated',
      'vendor.nikmat@tps.co.id', crypt('TpsCatering2026!', gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nama":"Petugas Nikmat Rasa","username":"vendor.nikmat"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  end if;

  -- Vendor Adhi Hidayah (V004)
  select id into v_vendor_adhi_id from auth.users where email = 'vendor.adhi@tps.co.id';
  if v_vendor_adhi_id is null then
    if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000006'::uuid) then
      v_vendor_adhi_id := gen_random_uuid();
    else
      v_vendor_adhi_id := '00000000-0000-0000-0000-000000000006'::uuid;
    end if;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid, v_vendor_adhi_id, 'authenticated', 'authenticated',
      'vendor.adhi@tps.co.id', crypt('TpsCatering2026!', gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nama":"Petugas Adhi Hidayah","username":"vendor.adhi"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  end if;

  -- Vendor Nurina Catering (V005)
  select id into v_vendor_nurina_id from auth.users where email = 'vendor.nurina@tps.co.id';
  if v_vendor_nurina_id is null then
    if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000007'::uuid) then
      v_vendor_nurina_id := gen_random_uuid();
    else
      v_vendor_nurina_id := '00000000-0000-0000-0000-000000000007'::uuid;
    end if;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid, v_vendor_nurina_id, 'authenticated', 'authenticated',
      'vendor.nurina@tps.co.id', crypt('TpsCatering2026!', gen_salt('bf')), now(),
      now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nama":"Petugas Nurina Catering","username":"vendor.nurina"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  end if;

  -- Ensure matching identities exist for Supabase Auth
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id'
  ) then
    execute '
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      select
        u.id::text,
        u.id,
        u.id::text,
        format(''{"sub":"%s","email":"%s"}'', u.id::text, u.email)::jsonb,
        ''email'',
        now(),
        now(),
        now()
      from auth.users u
      where u.id in ($1, $2, $3, $4, $5, $6, $7)
        and not exists (select 1 from auth.identities i where i.user_id = u.id)
      on conflict do nothing
    ' using v_admin_id, v_admin2_id, v_vendor_aisya_id, v_vendor_ibu_id, v_vendor_nikmat_id, v_vendor_adhi_id, v_vendor_nurina_id;
  else
    execute '
      insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      select
        u.id::text,
        u.id,
        format(''{"sub":"%s","email":"%s"}'', u.id::text, u.email)::jsonb,
        ''email'',
        now(),
        now(),
        now()
      from auth.users u
      where u.id in ($1, $2, $3, $4, $5, $6, $7)
        and not exists (select 1 from auth.identities i where i.user_id = u.id)
      on conflict do nothing
    ' using v_admin_id, v_admin2_id, v_vendor_aisya_id, v_vendor_ibu_id, v_vendor_nikmat_id, v_vendor_adhi_id, v_vendor_nurina_id;
  end if;

  -- Remove stale profiles with conflicting username if ID changed
  delete from profiles where username = 'admin.ga' and id <> v_admin_id;
  delete from profiles where username = 'admin2.ga' and id <> v_admin2_id;
  delete from profiles where username = 'pic.cfs';
  delete from profiles where username = 'pic.mekanik';
  delete from profiles where username = 'pic.operator';
  delete from profiles where username = 'vendor.aisya' and id <> v_vendor_aisya_id;
  delete from profiles where username = 'vendor.ibu' and id <> v_vendor_ibu_id;
  delete from profiles where username = 'vendor.nikmat' and id <> v_vendor_nikmat_id;
  delete from profiles where username = 'vendor.adhi' and id <> v_vendor_adhi_id;
  delete from profiles where username = 'vendor.nurina' and id <> v_vendor_nurina_id;

  -- Upsert demo profiles
  insert into profiles (id, username, nama, role, vendor_id, bagian_id)
  values
    (v_admin_id, 'admin.ga', 'Admin General Affairs 1', 'admin_ga'::app_role, null, null),
    (v_admin2_id, 'admin2.ga', 'Admin General Affairs 2', 'admin_ga'::app_role, null, null),
    (v_vendor_aisya_id, 'vendor.aisya', 'Petugas Aisya Catering', 'vendor'::app_role, v_v001_id, null),
    (v_vendor_ibu_id, 'vendor.ibu', 'Petugas Catering IBU', 'vendor'::app_role, v_v002_id, null),
    (v_vendor_nikmat_id, 'vendor.nikmat', 'Petugas Nikmat Rasa', 'vendor'::app_role, v_v003_id, null),
    (v_vendor_adhi_id, 'vendor.adhi', 'Petugas Adhi Hidayah', 'vendor'::app_role, v_v004_id, null),
    (v_vendor_nurina_id, 'vendor.nurina', 'Petugas Nurina Catering', 'vendor'::app_role, v_v005_id, null)
  on conflict (id) do update set
    username = excluded.username,
    nama = excluded.nama,
    role = excluded.role,
    vendor_id = excluded.vendor_id,
    bagian_id = excluded.bagian_id;

  -- 5. ROLLING 29-DAY SCHEDULE (-14 to +14 days from current_date in Asia/Jakarta)
  for v_day in -14..14 loop
    v_date := (now() at time zone 'Asia/Jakarta')::date + v_day;

    -- Shift 1 (Siang = 0)
    v_vendor_idx := (((3 * (v_date - '2026-10-01'::date) + 0) % 5) + 5) % 5;
    select id into v_vendor_id from vendors where urutan_rotasi = v_vendor_idx;

    insert into periods (tanggal, shift_id, vendor_id, keterangan)
    values (v_date, v_s1_id, v_vendor_id, 'Jadwal reguler Shift Siang')
    on conflict (tanggal, shift_id) do update set vendor_id = excluded.vendor_id
    returning id into v_period_id;

    if v_day < 0 then
      v_order_status := 'final';
      v_resp_vendor := 'disanggupi';
      v_prog_vendor := 'selesai';
    elsif v_day = 0 then
      v_order_status := 'revisi';
      v_resp_vendor := 'disanggupi';
      v_prog_vendor := 'dikirim';
    elsif v_day = 1 then
      v_order_status := 'draft';
      v_resp_vendor := 'menunggu';
      v_prog_vendor := 'menunggu';
    else
      v_order_status := null;
    end if;

    if v_order_status is not null then
      v_porsi_cc := 20 + (abs(v_day) % 3);
      v_porsi_rtg := 18 - (abs(v_day) % 2);
      v_porsi_mek_cc := 12 + (abs(v_day) % 2);
      v_porsi_mek_rtg := 10;
      v_porsi_cfs := 20;

      insert into catering_orders (
        period_id, vendor_id, status, created_by, submitted_by, submitted_at,
        respon_vendor, progres_vendor, catatan
      ) values (
        v_period_id, v_vendor_id, v_order_status, v_admin_id, v_admin_id, now(),
        v_resp_vendor, v_prog_vendor, 'Pesanan reguler Shift 1'
      ) on conflict (period_id) do update set
        status = excluded.status,
        respon_vendor = excluded.respon_vendor,
        progres_vendor = excluded.progres_vendor
      returning id into v_order_id;

      insert into catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi)
      values
        (v_order_id, v_b_cc, v_porsi_cc, v_porsi_cc),
        (v_order_id, v_b_rtg, v_porsi_rtg, v_porsi_rtg),
        (v_order_id, v_b_mek_cc, v_porsi_mek_cc, v_porsi_mek_cc),
        (v_order_id, v_b_mek_rtg, v_porsi_mek_rtg, v_porsi_mek_rtg),
        (v_order_id, v_b_cfs, v_porsi_cfs, v_porsi_cfs)
      on conflict (order_id, bagian_id) do update set
        jumlah_karyawan = excluded.jumlah_karyawan,
        jumlah_porsi = excluded.jumlah_porsi;

      -- Add pending sample revision on Today's Shift 1 CC Operator (20 -> 23)
      if v_day = 0 then
        select id into v_item_cc_id from catering_items where order_id = v_order_id and bagian_id = v_b_cc;
        insert into revisions (
          item_id, karyawan_awal, karyawan_baru, porsi_awal, porsi_baru, alasan, status, diajukan_oleh
        ) values (
          v_item_cc_id, v_porsi_cc, v_porsi_cc + 3, v_porsi_cc, v_porsi_cc + 3,
          'Penambahan kebutuhan catering karena perubahan jumlah karyawan bertugas',
          'menunggu', v_admin2_id
        ) on conflict do nothing;
      end if;
    end if;

    -- Shift 2 (Sore = 1)
    v_vendor_idx := (((3 * (v_date - '2026-10-01'::date) + 1) % 5) + 5) % 5;
    select id into v_vendor_id from vendors where urutan_rotasi = v_vendor_idx;

    insert into periods (tanggal, shift_id, vendor_id, keterangan)
    values (v_date, v_s2_id, v_vendor_id, 'Jadwal reguler Shift Sore')
    on conflict (tanggal, shift_id) do update set vendor_id = excluded.vendor_id
    returning id into v_period_id;

    if v_day < 0 then
      v_order_status := 'final';
      v_resp_vendor := 'disanggupi';
      v_prog_vendor := 'selesai';
    elsif v_day = 0 then
      v_order_status := 'final';
      v_resp_vendor := 'disanggupi';
      v_prog_vendor := 'dipersiapkan';
    else
      v_order_status := null;
    end if;

    if v_order_status is not null then
      v_porsi_cc := 18;
      v_porsi_rtg := 16;
      v_porsi_mek_cc := 10;
      v_porsi_mek_rtg := 9;
      v_porsi_cfs := 12;

      insert into catering_orders (
        period_id, vendor_id, status, created_by, submitted_by, submitted_at,
        respon_vendor, progres_vendor, catatan
      ) values (
        v_period_id, v_vendor_id, v_order_status, v_admin_id, v_admin_id, now(),
        v_resp_vendor, v_prog_vendor, 'Pesanan reguler Shift 2'
      ) on conflict (period_id) do update set
        status = excluded.status,
        respon_vendor = excluded.respon_vendor,
        progres_vendor = excluded.progres_vendor
      returning id into v_order_id;

      insert into catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi)
      values
        (v_order_id, v_b_cc, v_porsi_cc, v_porsi_cc),
        (v_order_id, v_b_rtg, v_porsi_rtg, v_porsi_rtg),
        (v_order_id, v_b_mek_cc, v_porsi_mek_cc, v_porsi_mek_cc),
        (v_order_id, v_b_mek_rtg, v_porsi_mek_rtg, v_porsi_mek_rtg),
        (v_order_id, v_b_cfs, v_porsi_cfs, v_porsi_cfs)
      on conflict (order_id, bagian_id) do update set
        jumlah_karyawan = excluded.jumlah_karyawan,
        jumlah_porsi = excluded.jumlah_porsi;
    end if;

    -- Shift 3 (Malam = 2)
    v_vendor_idx := (((3 * (v_date - '2026-10-01'::date) + 2) % 5) + 5) % 5;
    select id into v_vendor_id from vendors where urutan_rotasi = v_vendor_idx;

    insert into periods (tanggal, shift_id, vendor_id, keterangan)
    values (v_date, v_s3_id, v_vendor_id, 'Jadwal reguler Shift Malam')
    on conflict (tanggal, shift_id) do update set vendor_id = excluded.vendor_id
    returning id into v_period_id;

    if v_day < 0 then
      v_order_status := 'final';
      v_resp_vendor := 'disanggupi';
      v_prog_vendor := 'selesai';
    elsif v_day = 0 then
      v_order_status := 'draft';
      v_resp_vendor := 'menunggu';
      v_prog_vendor := 'menunggu';
    else
      v_order_status := null;
    end if;

    if v_order_status is not null then
      v_porsi_cc := 15;
      v_porsi_rtg := 14;
      v_porsi_mek_cc := 8;
      v_porsi_mek_rtg := 7;
      v_porsi_cfs := 6;

      insert into catering_orders (
        period_id, vendor_id, status, created_by, submitted_by, submitted_at,
        respon_vendor, progres_vendor, catatan
      ) values (
        v_period_id, v_vendor_id, v_order_status, v_admin_id, v_admin_id, now(),
        v_resp_vendor, v_prog_vendor, 'Pesanan reguler Shift 3'
      ) on conflict (period_id) do update set
        status = excluded.status,
        respon_vendor = excluded.respon_vendor,
        progres_vendor = excluded.progres_vendor
      returning id into v_order_id;

      insert into catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi)
      values
        (v_order_id, v_b_cc, v_porsi_cc, v_porsi_cc),
        (v_order_id, v_b_rtg, v_porsi_rtg, v_porsi_rtg),
        (v_order_id, v_b_mek_cc, v_porsi_mek_cc, v_porsi_mek_cc),
        (v_order_id, v_b_mek_rtg, v_porsi_mek_rtg, v_porsi_mek_rtg),
        (v_order_id, v_b_cfs, v_porsi_cfs, v_porsi_cfs)
      on conflict (order_id, bagian_id) do update set
        jumlah_karyawan = excluded.jumlah_karyawan,
        jumlah_porsi = excluded.jumlah_porsi;
    end if;

  end loop;
end $$;
