-- ==============================================================================
-- SQL Script: Pembuatan Akun Uji Coba Admin GA & Vendor
-- ==============================================================================
-- 1. admin@tps.co.id (username: admin) | Password: gatps2026 | Role: admin_ga
-- 2. vendor@tps.co.id (username: vendor) | Password: vendortps2026 | Role: vendor (V001)
-- ==============================================================================

create extension if not exists "pgcrypto";

do $$
declare
  v_admin_id uuid;
  v_vendor_id uuid;
  v_v001_id uuid;
  v_id_type text;
  v_has_provider_id boolean;
begin
  -- 1. Ambil vendor default V001 (Aisya Catering)
  select id into v_v001_id from vendors where kode = 'V001';
  if v_v001_id is null then
    select id into v_v001_id from vendors limit 1;
  end if;

  -- 2. Tambah / Perbarui admin@tps.co.id pada auth.users
  select id into v_admin_id from auth.users where email = 'admin@tps.co.id';
  if v_admin_id is null then
    v_admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_admin_id,
      'authenticated',
      'authenticated',
      'admin@tps.co.id',
      crypt('gatps2026', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nama":"Administrator General Affairs","username":"admin"}'::jsonb,
      now(),
      now(),
      '', '', '', ''
    );
  else
    update auth.users
    set encrypted_password = crypt('gatps2026', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now(),
        raw_user_meta_data = '{"nama":"Administrator General Affairs","username":"admin"}'::jsonb
    where id = v_admin_id;
  end if;

  -- 3. Tambah / Perbarui vendor@tps.co.id pada auth.users
  select id into v_vendor_id from auth.users where email = 'vendor@tps.co.id';
  if v_vendor_id is null then
    v_vendor_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_vendor_id,
      'authenticated',
      'authenticated',
      'vendor@tps.co.id',
      crypt('vendortps2026', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nama":"Vendor Catering TPS","username":"vendor"}'::jsonb,
      now(),
      now(),
      '', '', '', ''
    );
  else
    update auth.users
    set encrypted_password = crypt('vendortps2026', gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now(),
        raw_user_meta_data = '{"nama":"Vendor Catering TPS","username":"vendor"}'::jsonb
    where id = v_vendor_id;
  end if;

  -- 4. Tambah / Perbarui identitas autentikasi pada auth.identities
  select data_type into v_id_type
  from information_schema.columns
  where table_schema = 'auth' and table_name = 'identities' and column_name = 'id';

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id'
  ) into v_has_provider_id;

  if v_has_provider_id then
    if v_id_type = 'uuid' then
      execute '
        insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        select
          u.id,
          u.id,
          u.id::text,
          format(''{"sub":"%s","email":"%s"}'', u.id::text, u.email)::jsonb,
          ''email'',
          now(),
          now(),
          now()
        from auth.users u
        where u.id in ($1, $2)
          and not exists (select 1 from auth.identities i where i.user_id = u.id)
        on conflict do nothing
      ' using v_admin_id, v_vendor_id;
    else
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
        where u.id in ($1, $2)
          and not exists (select 1 from auth.identities i where i.user_id = u.id)
        on conflict do nothing
      ' using v_admin_id, v_vendor_id;
    end if;
  else
    if v_id_type = 'uuid' then
      execute '
        insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        select
          u.id,
          u.id,
          format(''{"sub":"%s","email":"%s"}'', u.id::text, u.email)::jsonb,
          ''email'',
          now(),
          now(),
          now()
        from auth.users u
        where u.id in ($1, $2)
          and not exists (select 1 from auth.identities i where i.user_id = u.id)
        on conflict do nothing
      ' using v_admin_id, v_vendor_id;
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
        where u.id in ($1, $2)
          and not exists (select 1 from auth.identities i where i.user_id = u.id)
        on conflict do nothing
      ' using v_admin_id, v_vendor_id;
    end if;
  end if;

  -- 5. Tambah / Perbarui public.profiles
  delete from profiles where username = 'admin' and id <> v_admin_id;
  delete from profiles where username = 'vendor' and id <> v_vendor_id;

  insert into profiles (id, username, nama, role, vendor_id, bagian_id, aktif)
  values
    (v_admin_id, 'admin', 'Administrator General Affairs', 'admin_ga'::app_role, null, null, true),
    (v_vendor_id, 'vendor', 'Vendor Catering TPS', 'vendor'::app_role, v_v001_id, null, true)
  on conflict (id) do update set
    username = excluded.username,
    nama = excluded.nama,
    role = excluded.role,
    vendor_id = excluded.vendor_id,
    bagian_id = excluded.bagian_id,
    aktif = true;

  raise notice 'Penyetelan akun admin@tps.co.id dan vendor@tps.co.id berhasil diselesaikan!';
end $$;

-- 6. Pastikan kebijakan SELECT pada profiles bebas dari infinite recursion
drop policy if exists "profiles_select_policy" on profiles;
create policy "profiles_select_policy" on profiles
  for select to authenticated
  using (true);
