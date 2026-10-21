-- Migration: 013_dashboard_ringkasan
-- Unified analytical summary function for Admin GA Dashboard

create or replace function public.dashboard_ringkasan(
  p_dari date,
  p_sampai date
)
returns jsonb as $$
declare
  v_days integer;
  v_prev_dari date;
  v_prev_sampai date;
  v_total_porsi bigint;
  v_avg_porsi numeric;
  v_revisi_total bigint;
  v_revisi_menunggu bigint;
  v_belum_input bigint;
  v_seri_harian jsonb;
  v_seri_prev jsonb;
  v_seri_shift jsonb;
  v_seri_bagian jsonb;
  v_seri_vendor jsonb;
begin
  -- 1. Security Check: Admin GA only
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang diizinkan mengakses data dashboard';
  end if;

  -- 2. Range Validation
  if p_sampai < p_dari then
    raise exception 'Tanggal akhir tidak boleh lebih awal dari tanggal mulai';
  end if;

  v_days := (p_sampai - p_dari) + 1;
  if v_days > 366 then
    raise exception 'Rentang waktu maksimal adalah 366 hari';
  end if;

  -- Preceding period window with identical duration
  v_prev_dari := p_dari - v_days;
  v_prev_sampai := p_dari - 1;

  -- 3. Total Portions from v_rekap
  select coalesce(sum(jumlah_porsi), 0)::bigint
  into v_total_porsi
  from public.v_rekap
  where tanggal between p_dari and p_sampai;

  -- 4. Average Portions per Day
  v_avg_porsi := round(v_total_porsi::numeric / v_days, 1);

  -- 5. Revisions Metrics for items in the date range
  select
    coalesce(count(r.id), 0)::bigint,
    coalesce(count(case when r.status = 'menunggu' then 1 end), 0)::bigint
  into v_revisi_total, v_revisi_menunggu
  from public.revisions r
  join public.catering_items ci on ci.id = r.item_id
  join public.catering_orders o on o.id = ci.order_id
  join public.periods p on p.id = o.period_id
  where p.tanggal between p_dari and p_sampai;

  -- 6. Belum Input Periods (today & tomorrow without catering_orders row)
  select coalesce(count(p.id), 0)::bigint
  into v_belum_input
  from public.periods p
  left join public.catering_orders o on o.period_id = p.id
  where p.tanggal between (now() at time zone 'Asia/Jakarta')::date and ((now() at time zone 'Asia/Jakarta')::date + 1)
    and o.id is null;

  -- 7. Daily Series for current range
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tanggal', to_char(d::date, 'YYYY-MM-DD'),
        'total_porsi', coalesce(t.porsi, 0)
      ) order by d::date
    ),
    '[]'::jsonb
  )
  into v_seri_harian
  from generate_series(p_dari, p_sampai, '1 day'::interval) d
  left join (
    select tanggal, sum(jumlah_porsi)::bigint as porsi
    from public.v_rekap
    where tanggal between p_dari and p_sampai
    group by tanggal
  ) t on t.tanggal = d::date;

  -- 8. Daily Series for previous period window
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tanggal', to_char(d::date, 'YYYY-MM-DD'),
        'total_porsi', coalesce(t.porsi, 0)
      ) order by d::date
    ),
    '[]'::jsonb
  )
  into v_seri_prev
  from generate_series(v_prev_dari, v_prev_sampai, '1 day'::interval) d
  left join (
    select tanggal, sum(jumlah_porsi)::bigint as porsi
    from public.v_rekap
    where tanggal between v_prev_dari and v_prev_sampai
    group by tanggal
  ) t on t.tanggal = d::date;

  -- 9. Shift Breakdown
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'shift_id', s.id,
        'shift_nama', s.nama,
        'shift_label', s.label,
        'urutan', s.urutan,
        'total_porsi', coalesce(t.porsi, 0),
        'persentase', case when v_total_porsi > 0 then round((coalesce(t.porsi, 0)::numeric / v_total_porsi) * 100, 1) else 0 end
      ) order by s.urutan
    ),
    '[]'::jsonb
  )
  into v_seri_shift
  from public.shifts s
  left join (
    select shift_id, sum(jumlah_porsi)::bigint as porsi
    from public.v_rekap
    where tanggal between p_dari and p_sampai
    group by shift_id
  ) t on t.shift_id = s.id
  where s.aktif = true;

  -- 10. Bagian Breakdown
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'bagian_id', b.id,
        'bagian_nama', b.nama,
        'kelompok', coalesce(b.kelompok, 'Umum'),
        'urutan', b.urutan,
        'total_porsi', coalesce(t.porsi, 0)
      ) order by coalesce(t.porsi, 0) desc, b.urutan
    ),
    '[]'::jsonb
  )
  into v_seri_bagian
  from public.bagian b
  left join (
    select bagian_id, sum(jumlah_porsi)::bigint as porsi
    from public.v_rekap
    where tanggal between p_dari and p_sampai
    group by bagian_id
  ) t on t.bagian_id = b.id
  where b.aktif = true;

  -- 11. Vendor Breakdown
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'vendor_id', v.id,
        'vendor_nama', v.nama,
        'vendor_kode', v.kode,
        'urutan_rotasi', v.urutan_rotasi,
        'total_porsi', coalesce(t.porsi, 0),
        'persentase', case when v_total_porsi > 0 then round((coalesce(t.porsi, 0)::numeric / v_total_porsi) * 100, 1) else 0 end
      ) order by v.urutan_rotasi
    ),
    '[]'::jsonb
  )
  into v_seri_vendor
  from public.vendors v
  left join (
    select vendor_id, sum(jumlah_porsi)::bigint as porsi
    from public.v_rekap
    where tanggal between p_dari and p_sampai
    group by vendor_id
  ) t on t.vendor_id = v.id
  where v.aktif = true;

  -- Return composite JSON structure
  return jsonb_build_object(
    'dari', to_char(p_dari, 'YYYY-MM-DD'),
    'sampai', to_char(p_sampai, 'YYYY-MM-DD'),
    'total_porsi', v_total_porsi,
    'rata_rata_porsi_per_hari', v_avg_porsi,
    'jumlah_revisi', v_revisi_total,
    'revisi_menunggu', v_revisi_menunggu,
    'belum_input_hari_ini_besok', v_belum_input,
    'seri_harian', v_seri_harian,
    'seri_periode_sebelumnya', v_seri_prev,
    'seri_shift', v_seri_shift,
    'seri_bagian', v_seri_bagian,
    'seri_vendor', v_seri_vendor
  );
end;
$$ language plpgsql stable security definer set search_path = public, pg_temp;

revoke execute on function public.dashboard_ringkasan(date, date) from public;
grant execute on function public.dashboard_ringkasan(date, date) to authenticated;
