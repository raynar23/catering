-- supabase/apply/020_apply_rekap_hardening.sql
-- Direct SQL paste script for Supabase SQL Editor:
-- 1. Hardens v_rekap, v_rekap_bulanan, v_utilisasi_shift to return 0 rows for vendors.
-- 2. Hardens get_rekap_harian & get_rekap_ringkasan with strict is_admin() checks and correct 7/5 argument grants.
-- 3. Provides check_triggers_status() to verify tgenabled = 'O'.

BEGIN;

-- 1. HARDEN VIEWS: Enforce public.is_admin() so vendors receive strictly 0 rows
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
where public.is_admin()
  and o.status in ('final', 'revisi');

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
where public.is_admin()
  and o.status in ('final', 'revisi')
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
where public.is_admin()
  and o.status in ('final', 'revisi')
group by s.id, s.nama, s.label, s.urutan_laporan;

-- Grant select on hardened views
grant select on public.v_rekap to authenticated;
grant select on public.v_rekap_bulanan to authenticated;
grant select on public.v_utilisasi_shift to authenticated;

-- 2. HARDEN RPC FUNCTIONS: get_rekap_harian and get_rekap_ringkasan
create or replace function public.get_rekap_harian(
  p_dari date,
  p_sampai date,
  p_vendor_id uuid default null,
  p_bagian_id uuid default null,
  p_shift_id uuid default null,
  p_page int default 1,
  p_page_size int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_offset int;
  v_limit int;
  v_total_rows int;
  v_active_columns jsonb;
  v_period_rows jsonb;
  v_totals_summary jsonb;
  v_grand_total bigint;
begin
  -- Strict Admin GA authorization check
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang dapat melihat rekapitulasi data katering.';
  end if;

  if (p_sampai - p_dari) > 366 then
    raise exception 'Rentang filter melebihi batas maksimal 366 hari.';
  end if;

  v_limit := greatest(p_page_size, 1);
  v_offset := greatest(p_page - 1, 0) * v_limit;

  -- Columns: active departments
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'kode', b.kode,
      'nama', b.nama,
      'kelompok', b.kelompok,
      'urutan', b.urutan
    ) order by b.urutan asc, b.nama asc
  ), '[]'::jsonb)
  into v_active_columns
  from public.bagian b
  where b.aktif = true
    and (p_bagian_id is null or b.id = p_bagian_id);

  -- Count total matching periods
  with filtered_periods as (
    select distinct
      p.id as period_id,
      p.tanggal,
      s.urutan_laporan
    from public.periods p
    join public.shifts s on s.id = p.shift_id
    left join public.catering_orders o on o.period_id = p.id
    left join public.catering_items ci on ci.order_id = o.id
    where p.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or p.vendor_id = p_vendor_id)
      and (p_shift_id is null or p.shift_id = p_shift_id)
      and (p_bagian_id is null or ci.bagian_id = p_bagian_id)
  )
  select count(*) into v_total_rows from filtered_periods;

  -- Page rows
  with paged_periods as (
    select
      p.id as period_id,
      p.tanggal,
      p.shift_id,
      s.nama as shift_nama,
      s.label as shift_label,
      s.urutan_laporan,
      p.vendor_id,
      v.kode as vendor_kode,
      v.nama as vendor_nama,
      o.id as order_id,
      coalesce(o.status::text, 'belum_input') as status,
      coalesce(o.respon_vendor::text, 'menunggu') as respon_vendor,
      coalesce(o.progres_vendor::text, 'menunggu') as progres_vendor
    from public.periods p
    join public.shifts s on s.id = p.shift_id
    join public.vendors v on v.id = p.vendor_id
    left join public.catering_orders o on o.period_id = p.id
    left join public.catering_items ci on ci.order_id = o.id
    where p.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or p.vendor_id = p_vendor_id)
      and (p_shift_id is null or p.shift_id = p_shift_id)
      and (p_bagian_id is null or ci.bagian_id = p_bagian_id)
    group by
      p.id, p.tanggal, p.shift_id, s.nama, s.label, s.urutan_laporan,
      p.vendor_id, v.kode, v.nama, o.id, o.status, o.respon_vendor, o.progres_vendor
    order by p.tanggal desc, s.urutan_laporan asc
    limit v_limit offset v_offset
  ),
  period_items_agg as (
    select
      pp.period_id,
      coalesce(jsonb_object_agg(
        ci.bagian_id::text,
        jsonb_build_object(
          'item_id', ci.id,
          'karyawan', ci.jumlah_karyawan,
          'porsi', ci.jumlah_porsi,
          'keterangan', ci.keterangan
        )
      ) filter (where ci.id is not null), '{}'::jsonb) as porsi_per_bagian,
      coalesce(sum(ci.jumlah_porsi), 0)::bigint as total_porsi
    from paged_periods pp
    left join public.catering_items ci on ci.order_id = pp.order_id
      and (p_bagian_id is null or ci.bagian_id = p_bagian_id)
    group by pp.period_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'period_id', pp.period_id,
      'order_id', pp.order_id,
      'tanggal', pp.tanggal,
      'shift_id', pp.shift_id,
      'shift_nama', pp.shift_nama,
      'shift_label', pp.shift_label,
      'vendor_id', pp.vendor_id,
      'vendor_kode', pp.vendor_kode,
      'vendor_nama', pp.vendor_nama,
      'status', pp.status,
      'respon_vendor', pp.respon_vendor,
      'progres_vendor', pp.progres_vendor,
      'porsi_per_bagian', pia.porsi_per_bagian,
      'total_porsi', pia.total_porsi
    ) order by pp.tanggal desc, pp.urutan_laporan asc
  ), '[]'::jsonb)
  into v_period_rows
  from paged_periods pp
  join period_items_agg pia on pia.period_id = pp.period_id;

  -- Grand total
  select coalesce(sum(ci.jumlah_porsi), 0)
  into v_grand_total
  from public.catering_orders o
  join public.periods p on p.id = o.period_id
  join public.catering_items ci on ci.order_id = o.id
  where p.tanggal between p_dari and p_sampai
    and (p_vendor_id is null or p.vendor_id = p_vendor_id)
    and (p_shift_id is null or p.shift_id = p_shift_id)
    and (p_bagian_id is null or ci.bagian_id = p_bagian_id)
    and o.status in ('final', 'revisi');

  -- Summary per department
  select coalesce(jsonb_object_agg(
    b.id::text,
    coalesce(sum_items.total, 0)
  ), '{}'::jsonb)
  into v_totals_summary
  from public.bagian b
  left join (
    select ci.bagian_id, sum(ci.jumlah_porsi) as total
    from public.catering_orders o
    join public.periods p on p.id = o.period_id
    join public.catering_items ci on ci.order_id = o.id
    where p.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or p.vendor_id = p_vendor_id)
      and (p_shift_id is null or p.shift_id = p_shift_id)
      and (p_bagian_id is null or ci.bagian_id = p_bagian_id)
      and o.status in ('final', 'revisi')
    group by ci.bagian_id
  ) sum_items on sum_items.bagian_id = b.id
  where b.aktif = true
    and (p_bagian_id is null or b.id = p_bagian_id);

  return jsonb_build_object(
    'success', true,
    'total_rows', v_total_rows,
    'page', v_page,
    'page_size', v_limit,
    'columns', v_active_columns,
    'rows', v_period_rows,
    'totals', v_totals_summary,
    'grand_total', v_grand_total
  );
end;
$$;

create or replace function public.get_rekap_ringkasan(
  p_dari date,
  p_sampai date,
  p_vendor_id uuid default null,
  p_bagian_id uuid default null,
  p_shift_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_porsi bigint;
  v_total_hari int;
  v_total_periode int;
  v_avg_porsi numeric;
  v_per_bagian jsonb;
  v_per_shift jsonb;
  v_per_vendor jsonb;
  v_per_bulan jsonb;
begin
  -- Strict Admin GA authorization check
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang dapat melihat ringkasan data katering.';
  end if;

  if (p_sampai - p_dari) > 366 then
    raise exception 'Rentang filter melebihi batas maksimal 366 hari.';
  end if;

  -- 1. Metric totals
  select
    coalesce(sum(ci.jumlah_porsi), 0),
    count(distinct p.tanggal),
    count(distinct p.id)
  into v_total_porsi, v_total_hari, v_total_periode
  from public.catering_orders o
  join public.periods p on p.id = o.period_id
  join public.catering_items ci on ci.order_id = o.id
  where p.tanggal between p_dari and p_sampai
    and (p_vendor_id is null or p.vendor_id = p_vendor_id)
    and (p_shift_id is null or p.shift_id = p_shift_id)
    and (p_bagian_id is null or ci.bagian_id = p_bagian_id)
    and o.status in ('final', 'revisi');

  if (p_sampai - p_dari + 1) > 0 then
    v_avg_porsi := round(v_total_porsi::numeric / (p_sampai - p_dari + 1), 1);
  else
    v_avg_porsi := 0;
  end if;

  -- 2. Breakdown per Bagian
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'bagian_id', b.id,
      'bagian_nama', b.nama,
      'bagian_kelompok', b.kelompok,
      'total_porsi', coalesce(agg.total, 0),
      'persentase', case when v_total_porsi > 0 then round((coalesce(agg.total, 0)::numeric / v_total_porsi) * 100, 1) else 0 end
    ) order by coalesce(agg.total, 0) desc, b.nama asc
  ), '[]'::jsonb)
  into v_per_bagian
  from public.bagian b
  left join (
    select ci.bagian_id, sum(ci.jumlah_porsi) as total
    from public.catering_orders o
    join public.periods p on p.id = o.period_id
    join public.catering_items ci on ci.order_id = o.id
    where p.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or p.vendor_id = p_vendor_id)
      and (p_shift_id is null or p.shift_id = p_shift_id)
      and (p_bagian_id is null or ci.bagian_id = p_bagian_id)
      and o.status in ('final', 'revisi')
    group by ci.bagian_id
  ) agg on agg.bagian_id = b.id
  where b.aktif = true
    and (p_bagian_id is null or b.id = p_bagian_id);

  -- 3. Breakdown per Shift
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'shift_id', s.id,
      'shift_nama', s.nama,
      'shift_label', s.label,
      'urutan_laporan', s.urutan_laporan,
      'total_porsi', coalesce(agg.total, 0),
      'persentase', case when v_total_porsi > 0 then round((coalesce(agg.total, 0)::numeric / v_total_porsi) * 100, 1) else 0 end
    ) order by s.urutan_laporan asc
  ), '[]'::jsonb)
  into v_per_shift
  from public.shifts s
  left join (
    select p.shift_id, sum(ci.jumlah_porsi) as total
    from public.catering_orders o
    join public.periods p on p.id = o.period_id
    join public.catering_items ci on ci.order_id = o.id
    where p.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or p.vendor_id = p_vendor_id)
      and (p_shift_id is null or p.shift_id = p_shift_id)
      and (p_bagian_id is null or ci.bagian_id = p_bagian_id)
      and o.status in ('final', 'revisi')
    group by p.shift_id
  ) agg on agg.shift_id = s.id
  where s.aktif = true
    and (p_shift_id is null or s.id = p_shift_id);

  -- 4. Breakdown per Vendor
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'vendor_id', v.id,
      'vendor_kode', v.kode,
      'vendor_nama', v.nama,
      'total_porsi', coalesce(agg.total, 0),
      'persentase', case when v_total_porsi > 0 then round((coalesce(agg.total, 0)::numeric / v_total_porsi) * 100, 1) else 0 end
    ) order by coalesce(agg.total, 0) desc, v.nama asc
  ), '[]'::jsonb)
  into v_per_vendor
  from public.vendors v
  left join (
    select o.vendor_id, sum(ci.jumlah_porsi) as total
    from public.catering_orders o
    join public.periods p on p.id = o.period_id
    join public.catering_items ci on ci.order_id = o.id
    where p.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or p.vendor_id = p_vendor_id)
      and (p_shift_id is null or p.shift_id = p_shift_id)
      and (p_bagian_id is null or ci.bagian_id = p_bagian_id)
      and o.status in ('final', 'revisi')
    group by o.vendor_id
  ) agg on agg.vendor_id = v.id
  where v.aktif = true
    and (p_vendor_id is null or v.id = p_vendor_id);

  -- 5. Breakdown per Month
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'bulan', agg.bulan,
      'total_porsi', agg.total
    ) order by agg.bulan asc
  ), '[]'::jsonb)
  into v_per_bulan
  from (
    select
      to_char(p.tanggal, 'YYYY-MM') as bulan,
      sum(ci.jumlah_porsi) as total
    from public.catering_orders o
    join public.periods p on p.id = o.period_id
    join public.catering_items ci on ci.order_id = o.id
    where p.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or p.vendor_id = p_vendor_id)
      and (p_shift_id is null or p.shift_id = p_shift_id)
      and (p_bagian_id is null or ci.bagian_id = p_bagian_id)
      and o.status in ('final', 'revisi')
    group by to_char(p.tanggal, 'YYYY-MM')
  ) agg;

  return jsonb_build_object(
    'success', true,
    'total_porsi', v_total_porsi,
    'total_hari', v_total_hari,
    'total_periode', v_total_periode,
    'avg_porsi_per_hari', v_avg_porsi,
    'per_bagian', v_per_bagian,
    'per_shift', v_per_shift,
    'per_vendor', v_per_vendor,
    'per_bulan', v_per_bulan
  );
end;
$$;

-- Grant execute with explicit matching argument types
grant execute on function public.get_rekap_harian(date, date, uuid, uuid, uuid, integer, integer) to authenticated;
grant execute on function public.get_rekap_ringkasan(date, date, uuid, uuid, uuid) to authenticated;

-- 3. TRIGGER STATUS INTROSPECTION HELPER (for test:db verification of tgenabled = 'O')
create or replace function public.check_triggers_status()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_triggers jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'trigger_name', tgname::text,
      'table_name', relname::text,
      'tgenabled', tgenabled::text
    ) order by relname, tgname
  ), '[]'::jsonb)
  into v_triggers
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  where tgname in (
    'trg_prevent_order_logs_mod',
    'trg_prevent_revision_delete',
    'trg_revision_immutable',
    'trg_check_revision_immutable',
    'trg_guard_profiles_update'
  );

  return v_triggers;
end;
$$;

revoke execute on function public.check_triggers_status() from public, anon;
grant execute on function public.check_triggers_status() to authenticated, service_role;

COMMIT;
