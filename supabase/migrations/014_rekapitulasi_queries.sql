-- Migration 014: High performance rekapitulasi and reporting queries
-- Provides atomic server-side matrix aggregation and summary analytics for Admin GA

-- 1. Function: get_rekap_harian
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
set search_path = public
as $$
declare
  v_result jsonb;
  v_offset int;
  v_limit int;
  v_total_rows int;
  v_active_columns jsonb;
  v_period_rows jsonb;
  v_totals_summary jsonb;
  v_grand_total bigint;
begin
  -- 1. Security enforcement
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang dapat melihat rekapitulasi data katering.';
  end if;

  -- 2. Range restriction
  if (p_sampai - p_dari) > 366 then
    raise exception 'Rentang filter melebihi batas maksimal 366 hari.';
  end if;

  v_limit := greatest(p_page_size, 1);
  v_offset := greatest(p_page - 1, 0) * v_limit;

  -- 3. Retrieve ordered active departments as table matrix columns
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

  -- 4. Count total matching periods in range
  with filtered_periods as (
    select distinct
      p.id as period_id,
      p.tanggal,
      s.urutan_laporan as shift_urutan_laporan
    from public.v_rekap vr
    join public.periods p on p.id = vr.period_id
    join public.shifts s on s.id = vr.shift_id
    where vr.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or vr.vendor_id = p_vendor_id)
      and (p_bagian_id is null or vr.bagian_id = p_bagian_id)
      and (p_shift_id is null or vr.shift_id = p_shift_id)
  )
  select count(*) into v_total_rows from filtered_periods;

  -- 5. Paginated period rows with portion aggregation per department
  with period_base as (
    select
      vr.period_id,
      vr.tanggal,
      vr.shift_id,
      vr.shift_nama,
      vr.shift_label,
      vr.shift_urutan_laporan,
      vr.vendor_id,
      vr.vendor_kode,
      vr.vendor_nama,
      sum(vr.jumlah_porsi) as total_porsi
    from public.v_rekap vr
    where vr.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or vr.vendor_id = p_vendor_id)
      and (p_bagian_id is null or vr.bagian_id = p_bagian_id)
      and (p_shift_id is null or vr.shift_id = p_shift_id)
    group by
      vr.period_id,
      vr.tanggal,
      vr.shift_id,
      vr.shift_nama,
      vr.shift_label,
      vr.shift_urutan_laporan,
      vr.vendor_id,
      vr.vendor_kode,
      vr.vendor_nama
    order by
      vr.tanggal desc,
      vr.shift_urutan_laporan asc
    limit v_limit
    offset v_offset
  ),
  period_items as (
    select
      vr.period_id,
      jsonb_object_agg(vr.bagian_id::text, vr.jumlah_porsi) as items_map
    from public.v_rekap vr
    where vr.period_id in (select pb.period_id from period_base pb)
      and (p_bagian_id is null or vr.bagian_id = p_bagian_id)
    group by vr.period_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'period_id', pb.period_id,
      'tanggal', pb.tanggal,
      'shift_id', pb.shift_id,
      'shift_nama', pb.shift_nama,
      'shift_label', pb.shift_label,
      'shift_urutan_laporan', pb.shift_urutan_laporan,
      'vendor_id', pb.vendor_id,
      'vendor_kode', pb.vendor_kode,
      'vendor_nama', pb.vendor_nama,
      'total_porsi', pb.total_porsi,
      'items', coalesce(pi.items_map, '{}'::jsonb)
    ) order by pb.tanggal desc, pb.shift_urutan_laporan asc
  ), '[]'::jsonb)
  into v_period_rows
  from period_base pb
  left join period_items pi on pi.period_id = pb.period_id;

  -- 6. Column totals summary across entire filtered range (not just current page)
  with range_bagian_totals as (
    select
      vr.bagian_id::text as b_id,
      sum(vr.jumlah_porsi) as b_total
    from public.v_rekap vr
    where vr.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or vr.vendor_id = p_vendor_id)
      and (p_bagian_id is null or vr.bagian_id = p_bagian_id)
      and (p_shift_id is null or vr.shift_id = p_shift_id)
    group by vr.bagian_id
  )
  select
    coalesce(jsonb_object_agg(rbt.b_id, rbt.b_total), '{}'::jsonb),
    coalesce(sum(rbt.b_total), 0)
  into v_totals_summary, v_grand_total
  from range_bagian_totals rbt;

  -- 7. Build consolidated JSON payload
  v_result := jsonb_build_object(
    'columns', v_active_columns,
    'rows', v_period_rows,
    'summary_totals', coalesce(v_totals_summary, '{}'::jsonb),
    'grand_total', coalesce(v_grand_total, 0),
    'total_rows', coalesce(v_total_rows, 0),
    'page', p_page,
    'page_size', v_limit
  );

  return v_result;
end;
$$;

-- 2. Function: get_rekap_ringkasan
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
set search_path = public
as $$
declare
  v_result jsonb;
  v_total_porsi bigint;
  v_total_hari int;
  v_total_periode int;
  v_avg_porsi numeric;
  v_per_bagian jsonb;
  v_per_shift jsonb;
  v_per_vendor jsonb;
  v_per_bulan jsonb;
begin
  -- 1. Security enforcement
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang dapat melihat ringkasan data katering.';
  end if;

  -- 2. Range restriction
  if (p_sampai - p_dari) > 366 then
    raise exception 'Rentang filter melebihi batas maksimal 366 hari.';
  end if;

  -- 3. Metric totals
  select
    coalesce(sum(vr.jumlah_porsi), 0),
    count(distinct vr.tanggal),
    count(distinct vr.period_id)
  into v_total_porsi, v_total_hari, v_total_periode
  from public.v_rekap vr
  where vr.tanggal between p_dari and p_sampai
    and (p_vendor_id is null or vr.vendor_id = p_vendor_id)
    and (p_bagian_id is null or vr.bagian_id = p_bagian_id)
    and (p_shift_id is null or vr.shift_id = p_shift_id);

  if (p_sampai - p_dari + 1) > 0 then
    v_avg_porsi := round(v_total_porsi::numeric / (p_sampai - p_dari + 1), 1);
  else
    v_avg_porsi := 0;
  end if;

  -- 4. Breakdown per Bagian
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
    select vr.bagian_id, sum(vr.jumlah_porsi) as total
    from public.v_rekap vr
    where vr.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or vr.vendor_id = p_vendor_id)
      and (p_bagian_id is null or vr.bagian_id = p_bagian_id)
      and (p_shift_id is null or vr.shift_id = p_shift_id)
    group by vr.bagian_id
  ) agg on agg.bagian_id = b.id
  where b.aktif = true
    and (p_bagian_id is null or b.id = p_bagian_id);

  -- 5. Breakdown per Shift
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
    select vr.shift_id, sum(vr.jumlah_porsi) as total
    from public.v_rekap vr
    where vr.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or vr.vendor_id = p_vendor_id)
      and (p_bagian_id is null or vr.bagian_id = p_bagian_id)
      and (p_shift_id is null or vr.shift_id = p_shift_id)
    group by vr.shift_id
  ) agg on agg.shift_id = s.id
  where (p_shift_id is null or s.id = p_shift_id);

  -- 6. Breakdown per Vendor
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'vendor_id', v.id,
      'vendor_nama', v.nama,
      'vendor_kode', v.kode,
      'total_porsi', coalesce(agg.total, 0),
      'persentase', case when v_total_porsi > 0 then round((coalesce(agg.total, 0)::numeric / v_total_porsi) * 100, 1) else 0 end
    ) order by v.kode asc
  ), '[]'::jsonb)
  into v_per_vendor
  from public.vendors v
  left join (
    select vr.vendor_id, sum(vr.jumlah_porsi) as total
    from public.v_rekap vr
    where vr.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or vr.vendor_id = p_vendor_id)
      and (p_bagian_id is null or vr.bagian_id = p_bagian_id)
      and (p_shift_id is null or vr.shift_id = p_shift_id)
    group by vr.vendor_id
  ) agg on agg.vendor_id = v.id
  where v.aktif = true
    and (p_vendor_id is null or v.id = p_vendor_id);

  -- 7. Breakdown per Bulan
  with month_agg as (
    select
      to_char(vr.tanggal, 'YYYY-MM') as bulan_key,
      sum(vr.jumlah_porsi) as total,
      count(distinct vr.tanggal) as hari_count
    from public.v_rekap vr
    where vr.tanggal between p_dari and p_sampai
      and (p_vendor_id is null or vr.vendor_id = p_vendor_id)
      and (p_bagian_id is null or vr.bagian_id = p_bagian_id)
      and (p_shift_id is null or vr.shift_id = p_shift_id)
    group by to_char(vr.tanggal, 'YYYY-MM')
    order by bulan_key asc
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'bulan_key', ma.bulan_key,
      'total_porsi', ma.total,
      'hari_count', ma.hari_count,
      'persentase', case when v_total_porsi > 0 then round((ma.total::numeric / v_total_porsi) * 100, 1) else 0 end
    ) order by ma.bulan_key asc
  ), '[]'::jsonb)
  into v_per_bulan
  from month_agg ma;

  -- 8. Assemble summary result payload
  v_result := jsonb_build_object(
    'metrics', jsonb_build_object(
      'total_porsi', v_total_porsi,
      'rata_rata_porsi_per_hari', v_avg_porsi,
      'total_hari_operasional', v_total_hari,
      'total_periode', v_total_periode
    ),
    'per_bagian', v_per_bagian,
    'per_shift', v_per_shift,
    'per_vendor', v_per_vendor,
    'per_bulan', v_per_bulan
  );

  return v_result;
end;
$$;
