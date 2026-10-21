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
