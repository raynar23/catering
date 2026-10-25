-- ==============================================================================
-- 017_apply.sql: Idempotent Security Hardening, Vendor Isolation & Audit Fix
-- PT Terminal Petikemas Surabaya - Sistem Pengelolaan Data Catering Karyawan
-- ==============================================================================

-- 1. EXTENSIONS & APP_ROLE ENUM CONSTRAINT (F5)
do $$
begin
  -- Enforce valid roles: only admin_ga and vendor
  alter table public.profiles drop constraint if exists chk_profiles_role_valid;
  alter table public.profiles add constraint chk_profiles_role_valid check (role in ('admin_ga', 'vendor'));
exception when others then null;
end $$;

-- 2. HELPER FUNCTIONS FOR RLS (Security Definer, Search Path Hardened)
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin_ga'
      and aktif = true
  );
$$ language sql stable security definer set search_path = public, pg_temp;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.my_vendor_id()
returns uuid as $$
  select vendor_id from public.profiles
  where id = auth.uid()
    and role = 'vendor'
    and aktif = true;
$$ language sql stable security definer set search_path = public, pg_temp;

revoke execute on function public.my_vendor_id() from public, anon;
grant execute on function public.my_vendor_id() to authenticated;

-- 3. PROFILES: ISOLATION, COLUMN PRIVILEGES & UPDATE TRIGGER GUARD (F1)
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_policy" on public.profiles;
create policy "profiles_update_policy" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (
    public.is_admin() or (
      id = auth.uid()
      and role = (select p.role from public.profiles p where p.id = auth.uid())
      and coalesce(vendor_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce((select p.vendor_id from public.profiles p where p.id = auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
      and aktif = (select p.aktif from public.profiles p where p.id = auth.uid())
    )
  );

-- Revoke blanket update privilege and grant only to self-service columns (nama, no_hp)
revoke update on public.profiles from authenticated, anon;
grant update (nama, no_hp) on public.profiles to authenticated;

-- Hardened Trigger: Block any unauthorized modification to sensitive columns
create or replace function public.guard_profiles_update()
returns trigger as $$
begin
  if current_user in ('postgres', 'service_role') or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role or
     new.vendor_id is distinct from old.vendor_id or
     new.aktif is distinct from old.aktif or
     new.bagian_id is distinct from old.bagian_id or
     new.id is distinct from old.id or
     new.username is distinct from old.username then
    raise exception 'Modifikasi kolom terlindungi pada profiles tidak diizinkan';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_guard_profiles_update on public.profiles;
create trigger trg_guard_profiles_update
  before update on public.profiles
  for each row
  execute function public.guard_profiles_update();

-- 4. PERIODS & OPERATIONAL TRANSACTION TABLES RLS (F1)
alter table public.periods enable row level security;
alter table public.catering_orders enable row level security;
alter table public.catering_items enable row level security;
alter table public.revisions enable row level security;
alter table public.order_logs enable row level security;
alter table public.import_batches enable row level security;

-- PERIODS
drop policy if exists "periods_select_policy" on public.periods;
create policy "periods_select_policy" on public.periods
  for select to authenticated
  using (public.is_admin() or vendor_id = public.my_vendor_id());

drop policy if exists "periods_manage_policy" on public.periods;
create policy "periods_manage_policy" on public.periods
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- CATERING ORDERS
drop policy if exists "orders_select_policy" on public.catering_orders;
create policy "orders_select_policy" on public.catering_orders
  for select to authenticated
  using (
    public.is_admin()
    or (vendor_id = public.my_vendor_id() and status in ('final', 'revisi'))
  );

-- CATERING ITEMS
drop policy if exists "items_select_policy" on public.catering_items;
create policy "items_select_policy" on public.catering_items
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.catering_orders o
      where o.id = catering_items.order_id
        and o.vendor_id = public.my_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- REVISIONS
drop policy if exists "revisions_select_policy" on public.revisions;
create policy "revisions_select_policy" on public.revisions
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.catering_items ci
      join public.catering_orders o on o.id = ci.order_id
      where ci.id = revisions.item_id
        and o.vendor_id = public.my_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- ORDER LOGS
drop policy if exists "order_logs_select_policy" on public.order_logs;
create policy "order_logs_select_policy" on public.order_logs
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.catering_orders o
      where o.id = order_logs.order_id
        and o.vendor_id = public.my_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

drop policy if exists "order_logs_no_update" on public.order_logs;
create policy "order_logs_no_update" on public.order_logs
  for update to authenticated
  using (false);

drop policy if exists "order_logs_no_delete" on public.order_logs;
create policy "order_logs_no_delete" on public.order_logs
  for delete to authenticated
  using (false);

-- IMPORT BATCHES
drop policy if exists "import_batches_policy" on public.import_batches;
create policy "import_batches_policy" on public.import_batches
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5. REVOKE DIRECT WRITES FROM AUTHENTICATED & ANON (RPC-ONLY MUTATIONS)
revoke insert, update, delete on public.catering_orders from authenticated, anon;
revoke insert, update, delete on public.catering_items from authenticated, anon;
revoke insert, update, delete on public.revisions from authenticated, anon;
revoke insert, update, delete on public.order_logs from authenticated, anon;
revoke insert, update, delete on public.import_batches from authenticated, anon;

-- Ensure SELECT rights on tables for authenticated users
grant select on public.profiles to authenticated;
grant select on public.shifts to authenticated;
grant select on public.bagian to authenticated;
grant select on public.vendors to authenticated;
grant select on public.periods to authenticated;
grant select on public.catering_orders to authenticated;
grant select on public.catering_items to authenticated;
grant select on public.revisions to authenticated;
grant select on public.order_logs to authenticated;
grant select on public.import_batches to authenticated;

-- Complete lock down of anon role (no public access to operational/master tables or routines)
revoke all on all tables in schema public from anon;
revoke all on all routines in schema public from anon;
revoke all on all sequences in schema public from anon;

-- 6. VIEWS HARDENING (security_invoker = true)
create or replace view public.v_rekap with (security_invoker = true) as
select
  o.id as order_id,
  p.id as period_id,
  p.tanggal,
  s.id as shift_id,
  s.nama as shift_nama,
  s.label as shift_label,
  s.alias as shift_alias,
  s.urutan as shift_urutan,
  s.urutan_laporan as shift_urutan_laporan,
  v.id as vendor_id,
  v.kode as vendor_kode,
  v.nama as vendor_nama,
  b.id as bagian_id,
  b.kode as bagian_kode,
  b.nama as bagian_nama,
  b.kelompok as bagian_kelompok,
  b.lokasi_antar as bagian_lokasi_antar,
  b.urutan as bagian_urutan,
  ci.jumlah_karyawan,
  ci.jumlah_porsi,
  ci.keterangan as keterangan_item,
  o.status as order_status,
  o.respon_vendor,
  o.respon_vendor_at,
  o.progres_vendor,
  o.progres_vendor_at
from public.catering_orders o
join public.periods p on p.id = o.period_id
join public.shifts s on s.id = p.shift_id
join public.vendors v on v.id = o.vendor_id
join public.catering_items ci on ci.order_id = o.id
join public.bagian b on b.id = ci.bagian_id
where o.status in ('final', 'revisi');

create or replace view public.v_timeline_vendor with (security_invoker = true) as
select
  ol.id as log_id,
  ol.order_id,
  o.vendor_id,
  ol.aksi,
  ol.jumlah_awal,
  ol.selisih,
  ol.jumlah_baru,
  ol.keterangan,
  case
    when pr.role = 'admin_ga' then 'Tim General Affairs'
    else pr.nama
  end as nama_pengupdate,
  ol.created_at
from public.order_logs ol
join public.catering_orders o on o.id = ol.order_id
join public.profiles pr on pr.id = ol.oleh;

create or replace view public.v_periode_ringkas with (security_invoker = true) as
select
  p.id as period_id,
  p.tanggal,
  p.shift_id,
  p.vendor_id,
  p.keterangan as period_keterangan,
  p.created_at as period_created_at,
  s.nama as shift_nama,
  s.label as shift_label,
  s.alias as shift_alias,
  s.jam_mulai as shift_jam_mulai,
  s.jam_selesai as shift_jam_selesai,
  s.batas_tiba as shift_batas_tiba,
  s.urutan as shift_urutan,
  s.urutan_laporan as shift_urutan_laporan,
  v.kode as vendor_kode,
  v.nama as vendor_nama,
  v.kontak as vendor_kontak,
  v.alamat as vendor_alamat,
  co.id as order_id,
  coalesce(co.status::text, 'belum_input') as status,
  coalesce(co.respon_vendor::text, 'menunggu') as respon_vendor,
  coalesce(co.progres_vendor::text, 'menunggu') as progres_vendor,
  coalesce(ci_agg.total_porsi, 0) as total_porsi,
  co.created_by,
  co.submitted_by,
  co.updated_at as order_updated_at,
  coalesce(prof_sub.nama, prof_upd.nama, prof_cre.nama) as diupdate_oleh
from public.periods p
join public.shifts s on s.id = p.shift_id
join public.vendors v on v.id = p.vendor_id
left join public.catering_orders co on co.period_id = p.id
left join lateral (
  select coalesce(sum(ci.jumlah_porsi), 0)::integer as total_porsi
  from public.catering_items ci
  where ci.order_id = co.id
) ci_agg on true
left join public.profiles prof_sub on prof_sub.id = co.submitted_by
left join public.profiles prof_upd on prof_upd.id = co.verified_by
left join public.profiles prof_cre on prof_cre.id = co.created_by;

create or replace view public.v_rekap_bulanan with (security_invoker = true) as
select
  to_char(p.tanggal, 'YYYY-MM') as bulan,
  v.id as vendor_id,
  v.kode as vendor_kode,
  v.nama as vendor_nama,
  sum(ci.jumlah_porsi) as total_porsi,
  count(distinct p.id) as total_periode
from public.catering_orders o
join public.periods p on p.id = o.period_id
join public.vendors v on v.id = o.vendor_id
join public.catering_items ci on ci.order_id = o.id
where o.status in ('final', 'revisi')
group by to_char(p.tanggal, 'YYYY-MM'), v.id, v.kode, v.nama;

create or replace view public.v_utilisasi_shift with (security_invoker = true) as
select
  s.id as shift_id,
  s.nama as shift_nama,
  s.label as shift_label,
  s.urutan_laporan,
  count(distinct p.id) as total_periode,
  sum(ci.jumlah_karyawan) as total_karyawan,
  sum(ci.jumlah_porsi) as total_porsi
from public.catering_orders o
join public.periods p on p.id = o.period_id
join public.shifts s on s.id = p.shift_id
join public.catering_items ci on ci.order_id = o.id
where o.status in ('final', 'revisi')
group by s.id, s.nama, s.label, s.urutan_laporan;

grant select on public.v_rekap to authenticated;
grant select on public.v_timeline_vendor to authenticated;
grant select on public.v_periode_ringkas to authenticated;
grant select on public.v_rekap_bulanan to authenticated;
grant select on public.v_utilisasi_shift to authenticated;

-- 7. F2: REVOKE RESET_OPERATIONAL_DATA FROM API & AUTHENTICATED
do $$
begin
  -- Cabut execute dari semua role selain service_role
  revoke execute on function public.reset_operational_data(text) from public, anon, authenticated;
exception when others then null;
end $$;

-- 8. F4: SERVER-SIDE SQL COUNT & SYNC AUDIT FUNCTION
create or replace function public.check_db_count_and_sync()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count_periods bigint;
  v_count_orders bigint;
  v_count_items bigint;
  v_count_logs bigint;
  v_count_revisions bigint;
  v_desync_vendor bigint;
  v_orphan_orders bigint;
  v_orphan_items bigint;
  v_status_breakdown jsonb;
begin
  select count(*) into v_count_periods from public.periods;
  select count(*) into v_count_orders from public.catering_orders;
  select count(*) into v_count_items from public.catering_items;
  select count(*) into v_count_logs from public.order_logs;
  select count(*) into v_count_revisions from public.revisions;

  -- Cek ketidaksinkronan vendor antara period dan order
  select count(*) into v_desync_vendor
  from public.catering_orders o
  join public.periods p on p.id = o.period_id
  where o.vendor_id is distinct from p.vendor_id;

  -- Cek orphan orders
  select count(*) into v_orphan_orders
  from public.catering_orders o
  left join public.periods p on p.id = o.period_id
  where p.id is null;

  -- Cek orphan items
  select count(*) into v_orphan_items
  from public.catering_items ci
  left join public.catering_orders o on o.id = ci.order_id
  where o.id is null;

  -- Breakdown status order
  select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb) into v_status_breakdown
  from (
    select status::text, count(*) as cnt
    from public.catering_orders
    group by status
  ) s;

  return jsonb_build_object(
    'total_periods', v_count_periods,
    'total_orders', v_count_orders,
    'total_items', v_count_items,
    'total_logs', v_count_logs,
    'total_revisions', v_count_revisions,
    'desync_vendor_count', v_desync_vendor,
    'orphan_orders_count', v_orphan_orders,
    'orphan_items_count', v_orphan_items,
    'status_breakdown', v_status_breakdown,
    'is_consistent', (v_desync_vendor = 0 and v_orphan_orders = 0 and v_orphan_items = 0)
  );
end;
$$;

revoke execute on function public.check_db_count_and_sync() from public, anon;
grant execute on function public.check_db_count_and_sync() to authenticated, service_role;

-- 9. REALTIME PUBLICATION & REPLICA IDENTITY FULL (F1.g)
alter table public.periods replica identity full;
alter table public.catering_orders replica identity full;
alter table public.revisions replica identity full;
alter table public.order_logs replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.periods;
    exception when others then null;
    end;
    begin
      alter publication supabase_realtime add table public.catering_orders;
    exception when others then null;
    end;
    begin
      alter publication supabase_realtime add table public.revisions;
    exception when others then null;
    end;
    begin
      alter publication supabase_realtime add table public.order_logs;
    exception when others then null;
    end;
  end if;
end $$;
