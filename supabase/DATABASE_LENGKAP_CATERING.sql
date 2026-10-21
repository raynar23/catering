-- Unified schema and seed for Catering TPS

-- Migration: 001_enums_master.sql
-- Enums and master tables

create extension if not exists "pgcrypto";

-- Enums
create type app_role as enum ('admin_ga', 'vendor');
create type order_status as enum ('draft', 'diajukan', 'final', 'revisi');
create type revision_status as enum ('menunggu', 'disetujui', 'ditolak');
create type vendor_response_status as enum ('menunggu', 'disanggupi', 'tidak_sanggup');
create type vendor_progress as enum ('menunggu', 'dipersiapkan', 'dikirim', 'sampai', 'selesai');
create type log_action as enum (
  'input_awal',
  'diajukan',
  'disetujui',
  'dikembalikan',
  'kirim_ke_vendor',
  'ganti_vendor',
  'vendor_sanggup',
  'vendor_tidak_sanggup',
  'vendor_update_progres',
  'revisi_diajukan',
  'revisi_respon_vendor',
  'revisi_disetujui',
  'revisi_ditolak',
  'impor_dokumen'
);

-- Master Shifts
create table shifts (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  label text not null,
  alias text not null,
  jam_mulai time not null,
  jam_selesai time not null,
  batas_tiba time not null,
  urutan integer not null default 0,
  urutan_laporan integer not null default 0,
  keterangan text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Master Bagian
create table bagian (
  id uuid primary key default gen_random_uuid(),
  kode text unique,
  nama text not null unique,
  kelompok text,
  lokasi_antar text,
  alias text,
  keterangan text,
  urutan integer not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Master Vendors
create table vendors (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  kontak text,
  alamat text,
  urutan_rotasi integer not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- User Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  nama text not null,
  role app_role not null,
  vendor_id uuid references vendors(id) on delete set null,
  bagian_id uuid references bagian(id) on delete set null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_shifts_urutan on shifts (urutan);
create index idx_shifts_laporan on shifts (urutan_laporan);
create index idx_bagian_urutan on bagian (urutan);
create index idx_vendors_rotasi on vendors (urutan_rotasi);
create index idx_profiles_role on profiles (role);
create index idx_profiles_vendor on profiles (vendor_id);

-- Migration: 002_periods_items.sql
-- Periods, catering orders, and catering items
create table periods (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  shift_id uuid not null references shifts(id) on delete restrict,
  vendor_id uuid not null references vendors(id) on delete restrict,
  keterangan text,
  created_at timestamptz not null default now(),
  unique (tanggal, shift_id)
);

-- Catering Orders for each Period
create table catering_orders (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null unique references periods(id) on delete restrict,
  vendor_id uuid not null references vendors(id) on delete restrict,
  status order_status not null default 'draft',
  created_by uuid not null references profiles(id),
  submitted_by uuid references profiles(id),
  submitted_at timestamptz,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  catatan text,
  respon_vendor vendor_response_status not null default 'menunggu',
  respon_vendor_at timestamptz,
  catatan_vendor text,
  progres_vendor vendor_progress not null default 'menunggu',
  progres_vendor_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Catering Items per Bagian
create table catering_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references catering_orders(id) on delete cascade,
  bagian_id uuid not null references bagian(id) on delete restrict,
  jumlah_karyawan integer not null check (jumlah_karyawan >= 0),
  jumlah_porsi integer not null check (jumlah_porsi >= 0),
  keterangan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, bagian_id)
);

-- Indexes
create index idx_periods_tanggal on periods (tanggal);
create index idx_periods_shift on periods (shift_id);
create index idx_periods_vendor on periods (vendor_id);
create index idx_orders_period on catering_orders (period_id);
create index idx_orders_vendor on catering_orders (vendor_id);
create index idx_orders_status on catering_orders (status);
create index idx_orders_vendor_status on catering_orders (vendor_id, status);
create index idx_items_order on catering_items (order_id);
create index idx_items_bagian on catering_items (bagian_id);

-- Migration: 003_revisions_logs.sql
-- Revisions, append-only order logs, and integrity triggers
create table revisions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references catering_items(id) on delete cascade,
  karyawan_awal integer not null,
  karyawan_baru integer not null check (karyawan_baru >= 0),
  porsi_awal integer not null,
  porsi_baru integer not null check (porsi_baru >= 0),
  selisih_porsi integer generated always as (porsi_baru - porsi_awal) stored,
  alasan text not null check (length(trim(alasan)) > 0),
  status revision_status not null default 'menunggu',
  diajukan_oleh uuid not null references profiles(id),
  diajukan_at timestamptz not null default now(),
  diverifikasi_oleh uuid references profiles(id),
  diverifikasi_at timestamptz,
  catatan_verifikator text,
  respon_vendor vendor_response_status not null default 'menunggu',
  respon_vendor_at timestamptz,
  catatan_vendor text,
  created_at timestamptz not null default now()
);

-- Timeline / Audit Logs (Append-Only)
create table order_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references catering_orders(id) on delete cascade,
  item_id uuid references catering_items(id) on delete set null,
  revision_id uuid references revisions(id) on delete set null,
  aksi log_action not null,
  jumlah_awal integer,
  selisih integer,
  jumlah_baru integer,
  keterangan text,
  oleh uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Unique index: At most one pending revision per catering item
create unique index idx_revisions_one_menunggu on revisions (item_id) where (status = 'menunggu');

-- Indexes
create index idx_revisions_item on revisions (item_id);
create index idx_revisions_status on revisions (status);
create index idx_order_logs_order on order_logs (order_id);
create index idx_order_logs_created on order_logs (created_at desc);

-- Trigger: Revisions immutable core columns
create or replace function check_revision_immutable()
returns trigger as $$
begin
  if old.item_id <> new.item_id
     or old.karyawan_awal <> new.karyawan_awal
     or old.karyawan_baru <> new.karyawan_baru
     or old.porsi_awal <> new.porsi_awal
     or old.porsi_baru <> new.porsi_baru
     or old.alasan <> new.alasan
     or old.diajukan_oleh <> new.diajukan_oleh
     or old.diajukan_at <> new.diajukan_at
  then
    raise exception 'Kolom inti revisi bersifat tetap dan tidak boleh diubah.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_revision_immutable
before update on revisions
for each row execute function check_revision_immutable();

create or replace function prevent_revision_delete()
returns trigger as $$
begin
  raise exception 'Data revisi tidak boleh dihapus.';
end;
$$ language plpgsql;

create trigger trg_prevent_revision_delete
before delete on revisions
for each row execute function prevent_revision_delete();

-- Trigger: Order logs strictly append-only
create or replace function prevent_order_logs_mod()
returns trigger as $$
begin
  raise exception 'Riwayat order_logs bersifat append-only dan tidak boleh diubah atau dihapus.';
end;
$$ language plpgsql;

create trigger trg_prevent_order_logs_mod
before update or delete on order_logs
for each row execute function prevent_order_logs_mod();

-- Migration: 004_import_batches.sql
-- Import batches for document ingestion

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  nomor_batch text not null unique,
  nama_file text not null,
  tipe_file text not null,
  ukuran_bytes integer,
  status text not null default 'draft' check (status in ('draft', 'dikonfirmasi', 'dibatalkan', 'selesai')),
  total_baris integer not null default 0,
  data_parsed jsonb not null default '[]'::jsonb,
  diimpor_oleh uuid not null references profiles(id),
  dikonfirmasi_at timestamptz,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_import_batches_status on import_batches (status);
create index idx_import_batches_user on import_batches (diimpor_oleh);
create index idx_import_batches_created on import_batches (created_at desc);

-- Migration: 005_views.sql
-- Analytical and vendor safe views
create or replace view v_rekap with (security_invoker = true) as
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
from catering_orders o
join periods p on p.id = o.period_id
join shifts s on s.id = p.shift_id
join vendors v on v.id = o.vendor_id
join catering_items ci on ci.order_id = o.id
join bagian b on b.id = ci.bagian_id
where o.status in ('final', 'revisi');

-- View v_timeline_vendor: Safe timeline view masking GA internal staff identities
create or replace view v_timeline_vendor with (security_invoker = true) as
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
from order_logs ol
join catering_orders o on o.id = ol.order_id
join profiles pr on pr.id = ol.oleh;

-- Migration: 006_rls.sql
-- Row Level Security policies and vendor isolation

-- Helper security functions
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin_ga'
      and aktif = true
  );
$$ language sql stable security definer set search_path = public, pg_temp;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.my_vendor_id()
returns uuid as $$
  select vendor_id from public.profiles
  where id = auth.uid()
    and role = 'vendor'
    and aktif = true;
$$ language sql stable security definer set search_path = public, pg_temp;

revoke execute on function public.my_vendor_id() from public;
grant execute on function public.my_vendor_id() to authenticated;

create or replace function public.is_admin_or_pic()
returns boolean as $$
  select public.is_admin();
$$ language sql stable security definer set search_path = public, pg_temp;

revoke execute on function public.is_admin_or_pic() from public;
grant execute on function public.is_admin_or_pic() to authenticated;

create or replace function current_user_role()
returns app_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function current_user_vendor_id()
returns uuid as $$
  select public.my_vendor_id();
$$ language sql stable security definer set search_path = public, pg_temp;

-- Enable RLS on all operational and master tables
alter table profiles enable row level security;
alter table shifts enable row level security;
alter table bagian enable row level security;
alter table vendors enable row level security;
alter table periods enable row level security;
alter table catering_orders enable row level security;
alter table catering_items enable row level security;
alter table revisions enable row level security;
alter table order_logs enable row level security;
alter table import_batches enable row level security;

-- PROFILES
create policy "profiles_select_policy" on profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_policy" on profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Revoke blanket table update and grant only to safe self-service column nama
revoke update on public.profiles from authenticated, anon;
grant update (nama) on public.profiles to authenticated;

-- Trigger guard: prevent unauthorized changes to sensitive profile columns
create or replace function public.guard_profiles_update()
returns trigger as $$
begin
  -- Allow service_role or superuser to update any column
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

-- SHIFTS
create policy "shifts_select_policy" on shifts
  for select to authenticated
  using (true);

create policy "shifts_manage_policy" on shifts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- BAGIAN
create policy "bagian_select_policy" on bagian
  for select to authenticated
  using (true);

create policy "bagian_manage_policy" on bagian
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- VENDORS (Vendor Isolation)
create policy "vendors_select_policy" on vendors
  for select to authenticated
  using (public.is_admin() or id = public.my_vendor_id());

create policy "vendors_manage_policy" on vendors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- PERIODS (Vendor Isolation: Vendor only sees assigned periods)
create policy "periods_select_policy" on periods
  for select to authenticated
  using (public.is_admin() or vendor_id = public.my_vendor_id());

create policy "periods_manage_policy" on periods
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- CATERING ORDERS (Vendors only see their own orders with status Final or Revisi)
create policy "orders_select_policy" on catering_orders
  for select to authenticated
  using (
    public.is_admin()
    or (vendor_id = public.my_vendor_id() and status in ('final', 'revisi'))
  );

-- CATERING ITEMS (Vendors only see items from their own Final or Revisi orders)
create policy "items_select_policy" on catering_items
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from catering_orders o
      where o.id = catering_items.order_id
        and o.vendor_id = public.my_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- REVISIONS (Vendors only see revisions for their own items)
create policy "revisions_select_policy" on revisions
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from catering_items ci
      join catering_orders o on o.id = ci.order_id
      where ci.id = revisions.item_id
        and o.vendor_id = public.my_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- ORDER LOGS (Vendors only see logs for their own orders)
create policy "order_logs_select_policy" on order_logs
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from catering_orders o
      where o.id = order_logs.order_id
        and o.vendor_id = public.my_vendor_id()
        and o.status in ('final', 'revisi')
    )
  );

-- IMPORT BATCHES (GA only)
create policy "import_batches_policy" on import_batches
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Revoke all table and routine permissions from anon on public schema
revoke all on all tables in schema public from anon;
revoke all on all routines in schema public from anon;

-- Revoke direct writes from authenticated on operational tables (mutations only via security definer RPCs)
revoke insert, update, delete on public.catering_orders from authenticated;
revoke insert, update, delete on public.catering_items from authenticated;
revoke insert, update, delete on public.revisions from authenticated;
revoke insert, update, delete on public.order_logs from authenticated;
revoke insert, update, delete on public.import_batches from authenticated;

-- Ensure select access on tables for authenticated users according to RLS
grant select on public.catering_orders to authenticated;
grant select on public.catering_items to authenticated;
grant select on public.revisions to authenticated;
grant select on public.order_logs to authenticated;
grant select on public.import_batches to authenticated;
grant select on public.shifts to authenticated;
grant select on public.bagian to authenticated;
grant select on public.vendors to authenticated;
grant select on public.periods to authenticated;

-- Migration: 007_rpc_admin.sql
-- Administrative RPC functions
-- simpan_catering: save draft order
create or replace function simpan_catering(
  p_period_id uuid,
  p_items jsonb,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_period record;
  v_order_id uuid;
  v_item jsonb;
  v_bagian_id uuid;
  v_karyawan integer;
  v_porsi integer;
  v_ket text;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin_ga' then
    raise exception 'Akses ditolak: hanya General Affairs yang dapat menginput data catering.';
  end if;

  select * into v_period from periods where id = p_period_id;
  if not found then
    raise exception 'Periode catering tidak ditemukan.';
  end if;

  select id, status into v_order_id from catering_orders where period_id = p_period_id;
  if found and v_order_id is not null then
    if (select status from catering_orders where id = v_order_id) not in ('draft') then
      raise exception 'Pesanan sudah berstatus % dan tidak dapat diubah langsung. Gunakan alur revisi.', (select status from catering_orders where id = v_order_id);
    end if;
    update catering_orders
    set catatan = coalesce(p_catatan, catatan),
        updated_at = now()
    where id = v_order_id;

    insert into order_logs (order_id, aksi, keterangan, oleh)
    values (v_order_id, 'simpan_draft', 'Memperbarui draft kebutuhan catering', auth.uid());
  else
    insert into catering_orders (
      period_id,
      vendor_id,
      status,
      created_by,
      catatan
    ) values (
      p_period_id,
      v_period.vendor_id,
      'draft',
      auth.uid(),
      p_catatan
    ) returning id into v_order_id;

    insert into order_logs (order_id, aksi, keterangan, oleh)
    values (v_order_id, 'input_awal', 'Membuat draft kebutuhan catering', auth.uid());
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_bagian_id := (v_item->>'bagian_id')::uuid;
    v_karyawan := coalesce((v_item->>'jumlah_karyawan')::integer, 0);
    v_porsi := coalesce((v_item->>'jumlah_porsi')::integer, v_karyawan);
    v_ket := v_item->>'keterangan';

    insert into catering_items (order_id, bagian_id, jumlah_karyawan, jumlah_porsi, keterangan)
    values (v_order_id, v_bagian_id, v_karyawan, v_porsi, v_ket)
    on conflict (order_id, bagian_id)
    do update set
      jumlah_karyawan = excluded.jumlah_karyawan,
      jumlah_porsi = excluded.jumlah_porsi,
      keterangan = excluded.keterangan,
      updated_at = now();
  end loop;

  return v_order_id;
end;
$$;

-- kirim_catering: finalize and send order to vendor
create or replace function kirim_catering(
  p_order_id uuid,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_order record;
  v_total_aktif integer;
  v_total_terisi integer;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin_ga' then
    raise exception 'Akses ditolak: hanya Admin GA yang dapat mengirim pesanan ke vendor.';
  end if;

  select * into v_order from catering_orders where id = p_order_id;
  if not found then
    raise exception 'Pesanan catering tidak ditemukan.';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'Pesanan sudah berstatus % dan tidak dapat dikirim ulang.', v_order.status;
  end if;

  select count(*) into v_total_aktif from bagian where aktif = true;
  select count(distinct ci.bagian_id) into v_total_terisi
  from catering_items ci
  join bagian b on b.id = ci.bagian_id
  where ci.order_id = p_order_id
    and b.aktif = true
    and ci.jumlah_porsi >= 0;

  if v_total_terisi < v_total_aktif then
    raise exception 'Pengiriman ditolak: seluruh bagian aktif wajib diisi jumlah porsinya sebelum dikirim ke vendor.';
  end if;

  update catering_orders
  set status = 'final',
      submitted_by = auth.uid(),
      submitted_at = now(),
      respon_vendor = 'menunggu',
      progres_vendor = 'menunggu',
      catatan = coalesce(p_catatan, catatan),
      updated_at = now()
  where id = p_order_id;

  insert into order_logs (order_id, aksi, keterangan, oleh)
  values (p_order_id, 'kirim_ke_vendor', coalesce(p_catatan, 'Pesanan difinalisasi dan dikirim ke vendor'), auth.uid());

  return p_order_id;
end;
$$;

-- ajukan_revisi: submit portion revision
create or replace function ajukan_revisi(
  p_item_id uuid,
  p_karyawan_baru integer,
  p_porsi_baru integer,
  p_alasan text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_item record;
  v_order record;
  v_revision_id uuid;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin_ga' then
    raise exception 'Akses ditolak: hanya Admin GA yang memiliki izin mengajukan revisi.';
  end if;

  if p_alasan is null or length(trim(p_alasan)) = 0 then
    raise exception 'Alasan revisi wajib diisi.';
  end if;

  if p_karyawan_baru < 0 or p_porsi_baru < 0 then
    raise exception 'Jumlah karyawan dan porsi baru tidak boleh negatif.';
  end if;

  select ci.*, o.status as order_status, o.id as order_id
  into v_item
  from catering_items ci
  join catering_orders o on o.id = ci.order_id
  where ci.id = p_item_id;

  if not found then
    raise exception 'Data item catering tidak ditemukan.';
  end if;

  if v_item.order_status not in ('final', 'revisi') then
    raise exception 'Revisi hanya dapat diajukan pada pesanan yang sudah Final.';
  end if;

  if exists (select 1 from revisions where item_id = p_item_id and status = 'menunggu') then
    raise exception 'Masih ada pengajuan revisi yang menunggu verifikasi untuk bagian ini.';
  end if;

  if p_karyawan_baru = v_item.jumlah_karyawan and p_porsi_baru = v_item.jumlah_porsi then
    raise exception 'Jumlah karyawan atau porsi revisi harus berbeda dari data saat ini.';
  end if;

  insert into revisions (
    item_id,
    karyawan_awal,
    karyawan_baru,
    porsi_awal,
    porsi_baru,
    alasan,
    status,
    diajukan_oleh,
    diajukan_at
  ) values (
    p_item_id,
    v_item.jumlah_karyawan,
    p_karyawan_baru,
    v_item.jumlah_porsi,
    p_porsi_baru,
    p_alasan,
    'menunggu',
    auth.uid(),
    now()
  ) returning id into v_revision_id;

  update catering_orders
  set status = 'revisi',
      updated_at = now()
  where id = v_item.order_id;

  insert into order_logs (
    order_id,
    item_id,
    revision_id,
    aksi,
    jumlah_awal,
    selisih,
    jumlah_baru,
    keterangan,
    oleh
  ) values (
    v_item.order_id,
    p_item_id,
    v_revision_id,
    'revisi_diajukan',
    v_item.jumlah_porsi,
    (p_porsi_baru - v_item.jumlah_porsi),
    p_porsi_baru,
    p_alasan,
    auth.uid()
  );

  return v_revision_id;
end;
$$;

-- verifikasi_revisi: approve or reject revision
create or replace function verifikasi_revisi(
  p_revision_id uuid,
  p_setuju boolean,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_rev record;
  v_order_id uuid;
  v_remaining_menunggu integer;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin_ga' then
    raise exception 'Akses ditolak: hanya Admin GA yang berhak menyetujui atau menolak revisi.';
  end if;

  select r.*, ci.order_id
  into v_rev
  from revisions r
  join catering_items ci on ci.id = r.item_id
  where r.id = p_revision_id;

  if not found then
    raise exception 'Data pengajuan revisi tidak ditemukan.';
  end if;

  if v_rev.status <> 'menunggu' then
    raise exception 'Pengajuan revisi sudah diproses sebelumnya dengan status %.', v_rev.status;
  end if;

  -- Allow verification by authorized admin_ga
  v_order_id := v_rev.order_id;

  if p_setuju then
    update catering_items
    set jumlah_karyawan = v_rev.karyawan_baru,
        jumlah_porsi = v_rev.porsi_baru,
        updated_at = now()
    where id = v_rev.item_id;

    update revisions
    set status = 'disetujui',
        diverifikasi_oleh = auth.uid(),
        diverifikasi_at = now(),
        catatan_verifikator = p_catatan
    where id = p_revision_id;

    insert into order_logs (
      order_id,
      item_id,
      revision_id,
      aksi,
      jumlah_awal,
      selisih,
      jumlah_baru,
      keterangan,
      oleh
    ) values (
      v_order_id,
      v_rev.item_id,
      p_revision_id,
      'revisi_disetujui',
      v_rev.porsi_awal,
      v_rev.selisih_porsi,
      v_rev.porsi_baru,
      coalesce(p_catatan, 'Revisi disetujui'),
      auth.uid()
    );
  else
    if p_catatan is null or length(trim(p_catatan)) = 0 then
      raise exception 'Catatan penolakan wajib diisi saat menolak revisi.';
    end if;

    update revisions
    set status = 'ditolak',
        diverifikasi_oleh = auth.uid(),
        diverifikasi_at = now(),
        catatan_verifikator = p_catatan
    where id = p_revision_id;

    insert into order_logs (
      order_id,
      item_id,
      revision_id,
      aksi,
      jumlah_awal,
      selisih,
      jumlah_baru,
      keterangan,
      oleh
    ) values (
      v_order_id,
      v_rev.item_id,
      p_revision_id,
      'revisi_ditolak',
      v_rev.porsi_awal,
      0,
      v_rev.porsi_awal,
      p_catatan,
      auth.uid()
    );
  end if;

  select count(*) into v_remaining_menunggu
  from revisions r
  join catering_items ci on ci.id = r.item_id
  where ci.order_id = v_order_id and r.status = 'menunggu';

  if v_remaining_menunggu = 0 then
    update catering_orders
    set status = 'final',
        updated_at = now()
    where id = v_order_id;
  end if;

  return p_revision_id;
end;
$$;

-- ganti_vendor_periode: change period vendor
create or replace function ganti_vendor_periode(
  p_period_id uuid,
  p_vendor_baru_id uuid,
  p_alasan text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_order_id uuid;
  v_vendor_lama_nama text;
  v_vendor_baru_nama text;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin_ga' then
    raise exception 'Akses ditolak: hanya Admin GA yang dapat mengganti vendor periode.';
  end if;

  if p_alasan is null or length(trim(p_alasan)) = 0 then
    raise exception 'Alasan penggantian vendor wajib diisi.';
  end if;

  if not exists (select 1 from vendors where id = p_vendor_baru_id and aktif = true) then
    raise exception 'Vendor baru tidak ditemukan atau sedang dinonaktifkan.';
  end if;

  select v.nama into v_vendor_lama_nama
  from periods p
  join vendors v on v.id = p.vendor_id
  where p.id = p_period_id;

  select nama into v_vendor_baru_nama from vendors where id = p_vendor_baru_id;

  update periods
  set vendor_id = p_vendor_baru_id
  where id = p_period_id;

  select id into v_order_id from catering_orders where period_id = p_period_id;
  if found and v_order_id is not null then
    update catering_orders
    set vendor_id = p_vendor_baru_id,
        respon_vendor = 'menunggu',
        progres_vendor = 'menunggu',
        updated_at = now()
    where id = v_order_id;

    insert into order_logs (order_id, aksi, keterangan, oleh)
    values (
      v_order_id,
      'ganti_vendor',
      format('Vendor diubah dari %s ke %s. Alasan: %s', v_vendor_lama_nama, v_vendor_baru_nama, p_alasan),
      auth.uid()
    );
  end if;

  return p_period_id;
end;
$$;

-- konfirmasi_impor: apply imported batch
create or replace function konfirmasi_impor(
  p_batch_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_batch record;
  v_row jsonb;
  v_tgl date;
  v_shift_id uuid;
  v_vendor_id uuid;
  v_period_id uuid;
  v_order_id uuid;
  v_items jsonb;
  v_applied_count integer := 0;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role <> 'admin_ga' then
    raise exception 'Akses ditolak: hanya Admin GA yang dapat mengonfirmasi impor data.';
  end if;

  select * into v_batch from import_batches where id = p_batch_id;
  if not found then
    raise exception 'Batch impor tidak ditemukan.';
  end if;

  if v_batch.status <> 'draft' then
    raise exception 'Batch impor sudah berstatus % dan tidak dapat dikonfirmasi ulang.', v_batch.status;
  end if;

  for v_row in select * from jsonb_array_elements(v_batch.data_parsed) loop
    v_tgl := (v_row->>'tanggal')::date;
    v_shift_id := (v_row->>'shift_id')::uuid;
    v_vendor_id := (v_row->>'vendor_id')::uuid;
    v_items := v_row->'items';

    select id into v_period_id from periods where tanggal = v_tgl and shift_id = v_shift_id;
    if not found then
      insert into periods (tanggal, shift_id, vendor_id, keterangan)
      values (v_tgl, v_shift_id, v_vendor_id, 'Dibuat otomatis lewat impor batch ' || v_batch.nomor_batch)
      returning id into v_period_id;
    end if;

    perform simpan_catering(v_period_id, v_items, 'Diimpor dari berkas ' || v_batch.nama_file);
    v_applied_count := v_applied_count + 1;
  end loop;

  update import_batches
  set status = 'selesai',
      dikonfirmasi_at = now(),
      updated_at = now()
  where id = p_batch_id;

  return v_applied_count;
end;
$$;

-- Migration: 008_rpc_vendor.sql
-- Vendor RPC functions
-- Map vendor_progress to numeric rank
create or replace function get_progress_rank(p_progres vendor_progress)
returns integer as $$
begin
  case p_progres
    when 'menunggu' then return 1;
    when 'dipersiapkan' then return 2;
    when 'dikirim' then return 3;
    when 'sampai' then return 4;
    when 'selesai' then return 5;
    else return 0;
  end case;
end;
$$ language plpgsql immutable;

-- respon_periode_vendor: vendor accepts or rejects order
create or replace function respon_periode_vendor(
  p_order_id uuid,
  p_sanggup boolean,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_vendor_id uuid;
  v_order record;
  v_status_respon vendor_response_status;
begin
  select role, vendor_id into v_role, v_vendor_id from profiles where id = auth.uid();
  if v_role <> 'vendor' then
    raise exception 'Akses ditolak: hanya akun vendor yang dapat memberikan respon kesanggupan.';
  end if;

  select * into v_order from catering_orders where id = p_order_id;
  if not found then
    raise exception 'Pesanan catering tidak ditemukan.';
  end if;

  if v_order.vendor_id <> v_vendor_id then
    raise exception 'Akses ditolak: Anda tidak memiliki akses ke pesanan vendor lain.';
  end if;

  if v_order.status not in ('final', 'revisi') then
    raise exception 'Pesanan belum difinalisasi oleh General Affairs.';
  end if;

  v_status_respon := case when p_sanggup then 'disanggupi'::vendor_response_status else 'tidak_sanggup'::vendor_response_status end;

  update catering_orders
  set respon_vendor = v_status_respon,
      respon_vendor_at = now(),
      catatan_vendor = coalesce(p_catatan, catatan_vendor),
      updated_at = now()
  where id = p_order_id;

  insert into order_logs (order_id, aksi, keterangan, oleh)
  values (
    p_order_id,
    case when p_sanggup then 'vendor_sanggup'::log_action else 'vendor_tidak_sanggup'::log_action end,
    coalesce(p_catatan, case when p_sanggup then 'Vendor menyanggupi pesanan' else 'Vendor menyatakan tidak sanggup' end),
    auth.uid()
  );

  return p_order_id;
end;
$$;

-- respon_revisi_vendor: vendor responds to revision
create or replace function respon_revisi_vendor(
  p_revision_id uuid,
  p_sanggup boolean,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_vendor_id uuid;
  v_rev record;
  v_status_respon vendor_response_status;
begin
  select role, vendor_id into v_role, v_vendor_id from profiles where id = auth.uid();
  if v_role <> 'vendor' then
    raise exception 'Akses ditolak: hanya vendor yang dapat memberikan respon revisi.';
  end if;

  select r.*, o.id as order_id, o.vendor_id as order_vendor_id
  into v_rev
  from revisions r
  join catering_items ci on ci.id = r.item_id
  join catering_orders o on o.id = ci.order_id
  where r.id = p_revision_id;

  if not found then
    raise exception 'Pengajuan revisi tidak ditemukan.';
  end if;

  if v_rev.order_vendor_id <> v_vendor_id then
    raise exception 'Akses ditolak: revisi ini bukan milik pesanan vendor Anda.';
  end if;

  if v_rev.status <> 'menunggu' then
    raise exception 'Revisi ini sudah selesai diverifikasi.';
  end if;

  v_status_respon := case when p_sanggup then 'disanggupi'::vendor_response_status else 'tidak_sanggup'::vendor_response_status end;

  update revisions
  set respon_vendor = v_status_respon,
      respon_vendor_at = now(),
      catatan_vendor = coalesce(p_catatan, catatan_vendor)
  where id = p_revision_id;

  insert into order_logs (order_id, item_id, revision_id, aksi, keterangan, oleh)
  values (
    v_rev.order_id,
    v_rev.item_id,
    p_revision_id,
    'revisi_respon_vendor',
    coalesce(p_catatan, case when p_sanggup then 'Vendor menyanggupi perubahan revisi' else 'Vendor tidak menyanggupi revisi' end),
    auth.uid()
  );

  return p_revision_id;
end;
$$;

-- update_progres_vendor: forward vendor delivery progress
create or replace function update_progres_vendor(
  p_order_id uuid,
  p_progres vendor_progress,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_vendor_id uuid;
  v_order record;
  v_current_rank integer;
  v_new_rank integer;
begin
  select role, vendor_id into v_role, v_vendor_id from profiles where id = auth.uid();
  if v_role <> 'vendor' then
    raise exception 'Akses ditolak: hanya vendor yang dapat memperbarui progres pengiriman.';
  end if;

  select * into v_order from catering_orders where id = p_order_id;
  if not found then
    raise exception 'Pesanan catering tidak ditemukan.';
  end if;

  if v_order.vendor_id <> v_vendor_id then
    raise exception 'Akses ditolak: Anda tidak memiliki akses ke pesanan vendor lain.';
  end if;

  if v_order.respon_vendor <> 'disanggupi' then
    raise exception 'Progres hanya dapat diperbarui setelah pesanan disanggupi.';
  end if;

  v_current_rank := get_progress_rank(v_order.progres_vendor);
  v_new_rank := get_progress_rank(p_progres);

  if v_new_rank <= v_current_rank then
    raise exception 'Pembaruan progres ditolak: tahapan progres hanya dapat bergerak maju (status saat ini: %).', v_order.progres_vendor;
  end if;

  update catering_orders
  set progres_vendor = p_progres,
      progres_vendor_at = now(),
      updated_at = now()
  where id = p_order_id;

  insert into order_logs (order_id, aksi, keterangan, oleh)
  values (
    p_order_id,
    'vendor_update_progres',
    format('Tahap progres diperbarui menjadi %s. %s', p_progres, coalesce(p_catatan, '')),
    auth.uid()
  );

  return p_order_id;
end;
$$;

-- get_notifikasi: fetch user notification counts
create or replace function get_notifikasi()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role app_role;
  v_vendor_id uuid;
  v_result jsonb;
begin
  select role, vendor_id into v_role, v_vendor_id from profiles where id = auth.uid();

  if v_role = 'admin_ga' then
    select jsonb_build_object(
      'role', v_role,
      'revisi_menunggu', (select count(*) from revisions where status = 'menunggu'),
      'vendor_tidak_sanggup', (select count(*) from catering_orders where respon_vendor = 'tidak_sanggup' and status in ('final', 'revisi')),
      'pesanan_draft', (select count(*) from catering_orders where status = 'draft')
    ) into v_result;
  elsif v_role = 'vendor' then
    select jsonb_build_object(
      'role', v_role,
      'pesanan_baru_menunggu_respon', (
        select count(*) from catering_orders
        where vendor_id = v_vendor_id and status in ('final', 'revisi') and respon_vendor = 'menunggu'
      ),
      'revisi_menunggu_respon', (
        select count(*)
        from revisions r
        join catering_items ci on ci.id = r.item_id
        join catering_orders o on o.id = ci.order_id
        where o.vendor_id = v_vendor_id and r.status = 'menunggu' and r.respon_vendor = 'menunggu'
      ),
      'pesanan_aktif_dalam_pengiriman', (
        select count(*) from catering_orders
        where vendor_id = v_vendor_id and respon_vendor = 'disanggupi' and progres_vendor not in ('selesai')
      )
    ) into v_result;
  else
    v_result := '{}'::jsonb;
  end if;

  return v_result;
end;
$$;

-- Migration: 009_realtime.sql
-- Realtime publication configuration

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'catering_orders'
    ) then
      alter publication supabase_realtime add table catering_orders;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'revisions'
    ) then
      alter publication supabase_realtime add table revisions;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'order_logs'
    ) then
      alter publication supabase_realtime add table order_logs;
    end if;
  end if;
exception
  when others then
    null;
end $$;

-- Migration: 010_view_periode_ringkas.sql
-- Migration: 010_view_periode_ringkas
-- Fast period summary view preventing N+1 queries and adding index optimizations

create or replace view v_periode_ringkas with (security_invoker = true) as
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
from periods p
join shifts s on s.id = p.shift_id
join vendors v on v.id = p.vendor_id
left join catering_orders co on co.period_id = p.id
left join lateral (
  select coalesce(sum(ci.porsi), 0)::integer as total_porsi
  from catering_items ci
  where ci.order_id = co.id
) ci_agg on true
left join profiles prof_sub on prof_sub.id = co.submitted_by
left join profiles prof_upd on prof_upd.id = co.verified_by
left join profiles prof_cre on prof_cre.id = co.created_by;

-- Performance indexes for period lookups and order aggregates
create index if not exists idx_periods_tanggal_shift on periods(tanggal, shift_id);
create index if not exists idx_periods_vendor_id on periods(vendor_id);
create index if not exists idx_catering_orders_period_id on catering_orders(period_id);
create index if not exists idx_catering_items_order_id on catering_items(order_id);

-- Migration: 011_schema_alignment.sql
-- Migration: 011_schema_alignment
-- Schema alignment for vendors, bagian, shifts, sync triggers, and analytical views

-- 1. VENDORS ALIGNMENT
alter table vendors
  add column if not exists nama_kontak text,
  add column if not exists no_wa text,
  add column if not exists no_telp text,
  add column if not exists alias text[] default '{}'::text[];

-- Migrate existing kontak column into no_wa
update vendors
set no_wa = coalesce(no_wa, kontak)
where kontak is not null and (no_wa is null or no_wa = '');

-- 2. BAGIAN ALIGNMENT
alter table bagian
  add column if not exists catatan_antar text;

-- Convert alias to text[] if not already an array
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'bagian' and column_name = 'alias' and data_type = 'text'
  ) then
    alter table bagian alter column alias type text[] using case
      when alias is null or alias = '' then '{}'::text[]
      else string_to_array(alias, ',')
    end;
    alter table bagian alter column alias set default '{}'::text[];
  end if;
end $$;

-- 3. SHIFTS ALIGNMENT
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'shifts' and column_name = 'alias' and data_type = 'text'
  ) then
    alter table shifts alter column alias type text[] using case
      when alias is null or alias = '' then '{}'::text[]
      else string_to_array(alias, ',')
    end;
    alter table shifts alter column alias set default '{}'::text[];
  end if;
end $$;

-- Update shift aliases to match client document terms:
-- Shift 1 = {"siang", "pagi"}, Shift 2 = {"sore"}, Shift 3 = {"malam"}
update shifts set alias = array['siang', 'pagi'] where nama = 'Shift 1' or urutan = 1 or label like '%Pagi%';
update shifts set alias = array['sore'] where nama = 'Shift 2' or urutan = 2 or label like '%Siang%';
update shifts set alias = array['malam'] where nama = 'Shift 3' or urutan = 0 or label like '%Malam%';

-- 4. IMPORT BATCHES ALIGNMENT
alter table import_batches
  add column if not exists jenis_dokumen text,
  add column if not exists mesin text,
  add column if not exists ringkasan jsonb default '{}'::jsonb;

-- 5. VENDOR SYNCHRONIZATION TRIGGER (catering_orders.vendor_id must match periods.vendor_id)
create or replace function public.sync_order_vendor_id()
returns trigger as $$
declare
  v_expected_vendor_id uuid;
begin
  select vendor_id into v_expected_vendor_id from periods where id = new.period_id;
  if v_expected_vendor_id is not null and (new.vendor_id is null or new.vendor_id <> v_expected_vendor_id) then
    new.vendor_id := v_expected_vendor_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_sync_order_vendor_id on catering_orders;
create trigger trg_sync_order_vendor_id
  before insert or update on catering_orders
  for each row
  execute function public.sync_order_vendor_id();

-- 6. VIEWS ALIGNMENT (only final and revisi, security_invoker = true)
create or replace view v_rekap_bulanan with (security_invoker = true) as
select
  to_char(p.tanggal, 'YYYY-MM') as bulan,
  v.id as vendor_id,
  v.kode as vendor_kode,
  v.nama as vendor_nama,
  sum(ci.jumlah_porsi) as total_porsi,
  count(distinct p.id) as total_periode
from catering_orders o
join periods p on p.id = o.period_id
join vendors v on v.id = o.vendor_id
join catering_items ci on ci.order_id = o.id
where o.status in ('final', 'revisi')
group by to_char(p.tanggal, 'YYYY-MM'), v.id, v.kode, v.nama;

create or replace view v_utilisasi_shift with (security_invoker = true) as
select
  s.id as shift_id,
  s.nama as shift_nama,
  s.label as shift_label,
  s.urutan_laporan,
  count(distinct p.id) as total_periode,
  sum(ci.jumlah_karyawan) as total_karyawan,
  sum(ci.jumlah_porsi) as total_porsi
from catering_orders o
join periods p on p.id = o.period_id
join shifts s on s.id = p.shift_id
join catering_items ci on ci.order_id = o.id
where o.status in ('final', 'revisi')
group by s.id, s.nama, s.label, s.urutan_laporan;

-- Seed data
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
  v_id_type text;
  v_has_provider_id boolean;

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
        where u.id in ($1, $2, $3, $4, $5, $6, $7)
          and not exists (select 1 from auth.identities i where i.user_id = u.id)
        on conflict do nothing
      ' using v_admin_id, v_admin2_id, v_vendor_aisya_id, v_vendor_ibu_id, v_vendor_nikmat_id, v_vendor_adhi_id, v_vendor_nurina_id;
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
        where u.id in ($1, $2, $3, $4, $5, $6, $7)
          and not exists (select 1 from auth.identities i where i.user_id = u.id)
        on conflict do nothing
      ' using v_admin_id, v_admin2_id, v_vendor_aisya_id, v_vendor_ibu_id, v_vendor_nikmat_id, v_vendor_adhi_id, v_vendor_nurina_id;
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
