-- Dummy data generator for dashboard analytics (development and staging only)

-- Trigger to prevent order_logs modification
create or replace function public.prevent_order_logs_mod()
returns trigger as $$
begin
  if current_setting('app.bypass_order_logs_immutability', true) = 'on' then
    return old;
  end if;
  raise exception 'Riwayat order_logs bersifat append-only dan tidak boleh diubah atau dihapus.';
end;
$$ language plpgsql;

-- RPC function to delete selected periods and dependent records
create or replace function public.delete_selected_periods(p_period_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang diizinkan menghapus data periode';
  end if;

  if p_period_ids is null or array_length(p_period_ids, 1) = 0 then
    return jsonb_build_object('success', false, 'message', 'Tidak ada periode yang dipilih');
  end if;

  -- Bypass order_logs immutability for this deletion
  perform set_config('app.bypass_order_logs_immutability', 'on', true);

  -- Delete dependent order_logs
  delete from public.order_logs
  where order_id in (
    select id from public.catering_orders where period_id = any(p_period_ids)
  );

  -- Delete dependent revisions
  delete from public.revisions
  where item_id in (
    select ci.id from public.catering_items ci
    join public.catering_orders co on co.id = ci.order_id
    where co.period_id = any(p_period_ids)
  );

  -- Delete catering_items
  delete from public.catering_items
  where order_id in (
    select id from public.catering_orders where period_id = any(p_period_ids)
  );

  -- Delete catering_orders
  delete from public.catering_orders
  where period_id = any(p_period_ids);

  -- Delete periods
  delete from public.periods
  where id = any(p_period_ids);

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'success', true,
    'deleted_count', v_count,
    'message', format('%s jadwal periode berhasil dihapus', v_count)
  );
end;
$$;

revoke execute on function public.delete_selected_periods(uuid[]) from public;
grant execute on function public.delete_selected_periods(uuid[]) to authenticated;

-- RPC function to reset all operational data
create or replace function public.reset_operational_data(p_konfirmasi text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count_periods integer := 0;
  v_count_orders integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang diizinkan mereset data';
  end if;

  if upper(trim(p_konfirmasi)) not in ('HAPUS', 'HAPUS SEMUA DATA') then
    raise exception 'Konfirmasi tidak sesuai. Ketik "HAPUS" untuk melanjutkan.';
  end if;

  -- Bypass order_logs immutability for operational reset
  perform set_config('app.bypass_order_logs_immutability', 'on', true);

  select count(*) into v_count_periods from public.periods;
  select count(*) into v_count_orders from public.catering_orders;

  delete from public.order_logs;
  delete from public.revisions;
  delete from public.catering_items;
  delete from public.catering_orders;
  delete from public.periods;

  return jsonb_build_object(
    'success', true,
    'deleted_periods', v_count_periods,
    'deleted_orders', v_count_orders,
    'message', 'Seluruh data operasional catering berhasil dibersihkan.'
  );
end;
$$;

revoke execute on function public.reset_operational_data(text) from public;
grant execute on function public.reset_operational_data(text) to authenticated;

-- RPC function for dashboard summary metrics
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
  if not public.is_admin() then
    raise exception 'Akses ditolak: Hanya Admin GA yang diizinkan mengakses data dashboard';
  end if;

  if p_sampai < p_dari then
    raise exception 'Tanggal akhir tidak boleh lebih awal dari tanggal mulai';
  end if;

  v_days := (p_sampai - p_dari) + 1;
  if v_days > 366 then
    raise exception 'Rentang waktu maksimal adalah 366 hari';
  end if;

  v_prev_dari := p_dari - v_days;
  v_prev_sampai := p_dari - 1;

  select coalesce(sum(jumlah_porsi), 0)::bigint
  into v_total_porsi
  from public.v_rekap
  where tanggal between p_dari and p_sampai;

  v_avg_porsi := round(v_total_porsi::numeric / v_days, 1);

  select
    coalesce(count(r.id), 0)::bigint,
    coalesce(count(case when r.status = 'menunggu' then 1 end), 0)::bigint
  into v_revisi_total, v_revisi_menunggu
  from public.revisions r
  join public.catering_items ci on ci.id = r.item_id
  join public.catering_orders o on o.id = ci.order_id
  join public.periods p on p.id = o.period_id
  where p.tanggal between p_dari and p_sampai;

  select coalesce(count(p.id), 0)::bigint
  into v_belum_input
  from public.periods p
  left join public.catering_orders o on o.period_id = p.id
  where p.tanggal between (now() at time zone 'Asia/Jakarta')::date and ((now() at time zone 'Asia/Jakarta')::date + 1)
    and o.id is null;

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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'bagian_id', b.id,
        'bagian_nama', b.nama,
        'kelompok', coalesce(b.kelompok, 'Lainnya'),
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

-- Populate mock operational data for dashboard analytics
do $$
declare
  v_admin_id        uuid;
  v_shifts          uuid[];
  v_vendors         uuid[];
  v_bagians         uuid[];
  v_bagian_count    integer;
  v_start_date      date := '2025-10-01'::date;
  v_end_date        date := greatest('2026-10-22'::date, current_date);
  v_day             date;
  v_day_index       integer := 0;
  v_vendor_id       uuid;
  v_shift_id        uuid;
  v_period_id       uuid;
  v_order_id        uuid;
  v_item_id         uuid;
  v_rev_id          uuid;
  v_shift_loop      integer;
  v_b_idx           integer;
  v_bagian_id       uuid;
  v_base_porsi      integer;
  v_porsi           integer;
  v_total_periods   integer := 0;
  v_total_orders    integer := 0;
begin
  -- Lookup primary admin ID
  select id into v_admin_id from public.profiles where role = 'admin_ga' and aktif = true limit 1;
  if v_admin_id is null then
    select id into v_admin_id from public.profiles limit 1;
  end if;

  select array_agg(id order by urutan) into v_shifts from public.shifts where aktif = true;
  select array_agg(id order by urutan_rotasi) into v_vendors from public.vendors where aktif = true;
  select array_agg(id order by urutan) into v_bagians from public.bagian where aktif = true;
  v_bagian_count := array_length(v_bagians, 1);

  if v_shifts is null or v_vendors is null or v_bagians is null then
    raise exception 'Master data (shifts, vendors, atau bagian) belum diisi. Jalankan migrasi master data terlebih dahulu.';
  end if;

  -- Iterate daily range
  for v_day in select gs::date from generate_series(v_start_date, v_end_date, '1 day'::interval) gs loop
    v_day_index := v_day_index + 1;

    -- Rotate vendor
    v_vendor_id := v_vendors[((v_day_index - 1) % array_length(v_vendors, 1)) + 1];

    -- Iterate shifts
    for v_shift_loop in 1..array_length(v_shifts, 1) loop
      v_shift_id := v_shifts[v_shift_loop];

      -- Find or create period
      select id into v_period_id from public.periods where tanggal = v_day and shift_id = v_shift_id;
      if v_period_id is null then
        insert into public.periods(id, tanggal, shift_id, vendor_id, keterangan, created_at)
        values(gen_random_uuid(), v_day, v_shift_id, v_vendor_id, 'Jadwal operasional katering', v_day + interval '6 hours')
        returning id into v_period_id;
        v_total_periods := v_total_periods + 1;
      end if;

      -- Leave select periods unsubmitted for KPI coverage
      if v_day = v_end_date and v_shift_loop = 3 then
        continue;
      end if;

      -- Create order if not exists
      select id into v_order_id from public.catering_orders where period_id = v_period_id;
      if v_order_id is null then
        insert into public.catering_orders(
          id, period_id, vendor_id, status, created_by, submitted_by, submitted_at,
          verified_by, verified_at, respon_vendor, respon_vendor_at, progres_vendor,
          progres_vendor_at, created_at, updated_at
        )
        values(
          gen_random_uuid(), v_period_id, v_vendor_id, 'final',
          v_admin_id, v_admin_id, v_day + interval '7 hours',
          v_admin_id, v_day + interval '7 hours 30 minutes',
          'disanggupi', v_day + interval '8 hours',
          'selesai', v_day + interval '14 hours',
          v_day + interval '6 hours', v_day + interval '14 hours'
        )
        returning id into v_order_id;
        v_total_orders := v_total_orders + 1;

        -- Insert portion items per department
        for v_b_idx in 1..v_bagian_count loop
          v_bagian_id := v_bagians[v_b_idx];

          -- Vary portion counts by department
          case (v_b_idx % 5)
            when 0 then v_base_porsi := 42 + (extract(day from v_day)::int % 14); -- CC Operator
            when 1 then v_base_porsi := 56 + (extract(day from v_day)::int % 16); -- RTG Operator
            when 2 then v_base_porsi := 20 + (extract(day from v_day)::int % 8);  -- Mekanik CC
            when 3 then v_base_porsi := 24 + (extract(day from v_day)::int % 7);  -- Mekanik RTG
            else v_base_porsi := 15 + (extract(day from v_day)::int % 6);         -- Area CFS & Lainnya
          end case;

          -- Adjust portions by shift
          if v_shift_loop = 1 then
            v_porsi := greatest(10, v_base_porsi - 8);
          elsif v_shift_loop = 2 then
            v_porsi := v_base_porsi;
          else
            v_porsi := greatest(12, v_base_porsi - 4);
          end if;

          insert into public.catering_items(
            id, order_id, bagian_id, jumlah_karyawan, jumlah_porsi, keterangan, created_at, updated_at
          )
          values(
            gen_random_uuid(), v_order_id, v_bagian_id, v_porsi, v_porsi, null,
            v_day + interval '7 hours', v_day + interval '7 hours'
          );
        end loop;

        -- Record audit log entries
        perform set_config('app.bypass_order_logs_immutability', 'on', true);
        insert into public.order_logs(id, order_id, aksi, keterangan, oleh, created_at)
        values
          (gen_random_uuid(), v_order_id, 'input_awal', 'Pengisian kuota katering awal oleh Admin GA', v_admin_id, v_day + interval '6 hours 45 minutes'),
          (gen_random_uuid(), v_order_id, 'kirim_ke_vendor', 'Pesanan katering dikunci dan dikirim ke vendor', v_admin_id, v_day + interval '7 hours'),
          (gen_random_uuid(), v_order_id, 'vendor_sanggup', 'Vendor mitra menyatakan kesanggupan pesanan', v_admin_id, v_day + interval '8 hours');

        -- Create historical approved revisions
        if v_shift_loop = 2 and (v_day_index % 5) = 0 then
          select id, jumlah_porsi into v_item_id, v_porsi
          from public.catering_items
          where order_id = v_order_id
          limit 1;

          if v_item_id is not null then
            insert into public.revisions(
              id, item_id, karyawan_awal, karyawan_baru, porsi_awal, porsi_baru,
              alasan, status, diajukan_oleh, diajukan_at, diverifikasi_oleh,
              diverifikasi_at, catatan_verifikator, respon_vendor, respon_vendor_at, created_at
            )
            values(
              gen_random_uuid(), v_item_id, v_porsi, v_porsi + 2, v_porsi, v_porsi + 2,
              'Penambahan 2 personil operasional lembur kapal', 'disetujui',
              v_admin_id, v_day + interval '9 hours',
              v_admin_id, v_day + interval '9 hours 30 minutes',
              'Disetujui sesuai memo lembur GA',
              'disanggupi', v_day + interval '10 hours',
              v_day + interval '9 hours'
            )
            returning id into v_rev_id;

            insert into public.order_logs(id, order_id, revision_id, item_id, aksi, jumlah_awal, selisih, jumlah_baru, keterangan, oleh, created_at)
            values
              (gen_random_uuid(), v_order_id, v_rev_id, v_item_id, 'revisi_diajukan', v_porsi, 2, v_porsi + 2, 'Pengajuan revisi kuota porsi lembur', v_admin_id, v_day + interval '9 hours'),
              (gen_random_uuid(), v_order_id, v_rev_id, v_item_id, 'revisi_disetujui', v_porsi, 2, v_porsi + 2, 'Revisi kuota porsi disetujui GA', v_admin_id, v_day + interval '9 hours 30 minutes');
          end if;
        end if;

        -- Create pending revisions for KPI coverage
        if v_day >= (v_end_date - interval '1 day')::date and v_shift_loop = 1 then
          select id, jumlah_porsi into v_item_id, v_porsi
          from public.catering_items
          where order_id = v_order_id
          limit 1;

          if v_item_id is not null and not exists(select 1 from public.revisions where item_id = v_item_id and status = 'menunggu') then
            insert into public.revisions(
              id, item_id, karyawan_awal, karyawan_baru, porsi_awal, porsi_baru,
              alasan, status, diajukan_oleh, diajukan_at, created_at
            )
            values(
              gen_random_uuid(), v_item_id, v_porsi, v_porsi + 3, v_porsi, v_porsi + 3,
              'Penambahan 3 porsi mendadak untuk tim inspeksi dermaga', 'menunggu',
              v_admin_id, v_day + interval '8 hours 15 minutes',
              v_day + interval '8 hours 15 minutes'
            )
            returning id into v_rev_id;

            insert into public.order_logs(id, order_id, revision_id, item_id, aksi, jumlah_awal, selisih, jumlah_baru, keterangan, oleh, created_at)
            values
              (gen_random_uuid(), v_order_id, v_rev_id, v_item_id, 'revisi_diajukan', v_porsi, 3, v_porsi + 3, 'Pengajuan revisi kuota menunggu verifikasi GA', v_admin_id, v_day + interval '8 hours 15 minutes');
          end if;
        end if;

      end if;
    end loop;
  end loop;

  -- Seed unsubmitted schedule periods for tomorrow
  for v_shift_loop in 1..array_length(v_shifts, 1) loop
    v_shift_id := v_shifts[v_shift_loop];
    v_vendor_id := v_vendors[((v_day_index + v_shift_loop) % array_length(v_vendors, 1)) + 1];
    if not exists(select 1 from public.periods where tanggal = (v_end_date + 1) and shift_id = v_shift_id) then
      insert into public.periods(id, tanggal, shift_id, vendor_id, keterangan, created_at)
      values(gen_random_uuid(), v_end_date + 1, v_shift_id, v_vendor_id, 'Jadwal operasional katering', now());
    end if;
  end loop;

  raise notice 'PENGISIAN DUMMY DATA SELESAI: % hari diproses dari % sampai %', v_day_index, v_start_date, v_end_date;
end $$;

-- Verify generated record counts
select
  (select count(*) from public.periods) as total_periode,
  (select count(*) from public.catering_orders) as total_pesanan,
  (select count(*) from public.catering_items) as total_item_porsi,
  (select count(*) from public.revisions) as total_revisi,
  (select count(*) from public.revisions where status = 'menunggu') as revisi_menunggu;
