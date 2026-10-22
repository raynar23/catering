-- Migration 015: Upgrade konfirmasi_impor RPC with options, validation, and audit logs

drop function if exists public.konfirmasi_impor(uuid);
drop function if exists public.konfirmasi_impor(uuid, jsonb, jsonb);

create or replace function public.konfirmasi_impor(
  p_batch_id uuid,
  p_baris jsonb default null,
  p_opsi jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_batch record;
  v_rows_to_process jsonb;
  v_row jsonb;
  v_jenis text;
  v_buat_vendor_baru boolean;
  v_timpa_periode boolean;

  v_tgl date;
  v_shift_alias text;
  v_shift_id uuid;
  v_vendor_nama text;
  v_vendor_id uuid;
  v_period_id uuid;
  v_order_id uuid;
  v_order_status order_status;
  v_existing_order_vendor_id uuid;

  v_applied_count integer := 0;
  v_new_vendor_code text;
  v_max_vendor_num integer;
begin
  -- 1. Authorization check: Admin GA only
  if not public.is_admin() then
    raise exception 'Akses ditolak: hanya Admin GA yang dapat mengonfirmasi impor data.';
  end if;

  -- 2. Verify import batch existence and status
  select * into v_batch from import_batches where id = p_batch_id for update;
  if not found then
    raise exception 'Batch impor tidak ditemukan.';
  end if;

  if v_batch.status <> 'draft' then
    raise exception 'Batch impor sudah berstatus "%" dan tidak dapat dikonfirmasi ulang.', v_batch.status;
  end if;

  -- 3. Resolve rows to process (use edited rows if provided, otherwise original parsed rows)
  v_rows_to_process := coalesce(p_baris, v_batch.data_parsed);
  if v_rows_to_process is null or jsonb_array_length(v_rows_to_process) = 0 then
    raise exception 'Tidak ada baris data untuk dikonfirmasi.';
  end if;

  v_jenis := coalesce(v_batch.jenis_dokumen, 'jadwal');
  v_buat_vendor_baru := coalesce((p_opsi->>'buat_vendor_baru')::boolean, false);
  v_timpa_periode := coalesce((p_opsi->>'timpa_periode')::boolean, false);

  -- 4. Process each row based on document type
  for v_row in select * from jsonb_array_elements(v_rows_to_process) loop
    -- Skip rows explicitly marked with status 'error'
    if (v_row->>'status') = 'error' then
      continue;
    end if;

    if v_jenis = 'vendor' then
      -- Upsert vendor records
      v_vendor_nama := trim(v_row->>'nama');
      if v_vendor_nama is not null and v_vendor_nama <> '' then
        insert into vendors (kode, nama, kontak, alamat)
        values (
          coalesce(nullif(trim(v_row->>'kode'), ''), 'V' || lpad((select count(*) + 1 from vendors)::text, 3, '0')),
          v_vendor_nama,
          nullif(trim(v_row->>'kontak'), ''),
          nullif(trim(v_row->>'alamat'), '')
        )
        on conflict (kode) do update set
          nama = excluded.nama,
          kontak = coalesce(excluded.kontak, vendors.kontak),
          alamat = coalesce(excluded.alamat, vendors.alamat),
          updated_at = now();
        v_applied_count := v_applied_count + 1;
      end if;

    elsif v_jenis = 'bagian' then
      -- Upsert department records
      if (v_row->>'nama') is not null and trim(v_row->>'nama') <> '' then
        insert into bagian (kode, nama, kelompok, lokasi_antar, catatan_antar)
        values (
          coalesce(nullif(trim(v_row->>'kode'), ''), upper(regexp_replace(trim(v_row->>'nama'), '[^A-Za-z0-9]', '_', 'g'))),
          trim(v_row->>'nama'),
          coalesce(nullif(trim(v_row->>'kelompok'), ''), 'Operasional'),
          nullif(trim(v_row->>'lokasi_antar'), ''),
          nullif(trim(v_row->>'catatan_antar'), '')
        )
        on conflict (nama) do update set
          kode = excluded.kode,
          kelompok = excluded.kelompok,
          lokasi_antar = coalesce(excluded.lokasi_antar, bagian.lokasi_antar),
          catatan_antar = coalesce(excluded.catatan_antar, bagian.catatan_antar),
          updated_at = now();
        v_applied_count := v_applied_count + 1;
      end if;

    else
      -- Jadwal catering and rekap harian periods
      v_tgl := (v_row->>'tanggal')::date;
      v_shift_alias := lower(trim(coalesce(v_row->>'shift_alias', '')));
      v_shift_id := nullif(v_row->>'shift_id', '')::uuid;
      v_vendor_id := nullif(v_row->>'vendor_id', '')::uuid;
      v_vendor_nama := trim(coalesce(v_row->>'vendor_nama', ''));

      -- Resolve shift ID if missing
      if v_shift_id is null and v_shift_alias <> '' then
        select id into v_shift_id from shifts
        where v_shift_alias = any(alias) or lower(nama) = v_shift_alias or lower(label) = v_shift_alias
        limit 1;
      end if;

      -- Resolve or create vendor ID
      if v_vendor_id is null and v_vendor_nama <> '' then
        select id into v_vendor_id from vendors where lower(trim(nama)) = lower(v_vendor_nama) limit 1;

        if v_vendor_id is null then
          if v_buat_vendor_baru then
            select coalesce(max(nullif(regexp_replace(kode, '[^0-9]', '', 'g'), '')::integer), 0) + 1
            into v_max_vendor_num from vendors;
            v_new_vendor_code := 'V' || lpad(v_max_vendor_num::text, 3, '0');

            insert into vendors (kode, nama)
            values (v_new_vendor_code, v_vendor_nama)
            returning id into v_vendor_id;
          else
            raise exception 'Vendor "%" belum terdaftar. Aktifkan opsi "Buat vendor baru otomatis".', v_vendor_nama;
          end if;
        end if;
      end if;

      -- Validate mandatory fields
      if v_tgl is null or v_shift_id is null or v_vendor_id is null then
        raise exception 'Baris jadwal tidak valid (tanggal, shift, atau vendor tidak ditemukan).';
      end if;

      -- Check existing period
      select id into v_period_id from periods where tanggal = v_tgl and shift_id = v_shift_id;

      if v_period_id is null then
        insert into periods (tanggal, shift_id, vendor_id, keterangan)
        values (v_tgl, v_shift_id, v_vendor_id, 'Diimpor dari batch ' || v_batch.nomor_batch)
        returning id into v_period_id;
      else
        -- Check existing catering order
        select id, status, vendor_id into v_order_id, v_order_status, v_existing_order_vendor_id
        from catering_orders where period_id = v_period_id;

        if v_order_id is not null and v_order_status <> 'draft' then
          if v_timpa_periode then
            update periods set vendor_id = v_vendor_id, updated_at = now() where id = v_period_id;
            update catering_orders set vendor_id = v_vendor_id, updated_at = now() where id = v_order_id;

            insert into order_logs (order_id, actor_id, aksi, catatan, data_baru)
            values (
              v_order_id,
              auth.uid(),
              'diubah',
              'Vendor ditimpa lewat impor ' || v_batch.nomor_batch,
              jsonb_build_object('vendor_id', v_vendor_id)
            );
          else
            -- Skip non-draft period when overwrite option is disabled
            continue;
          end if;
        else
          update periods set vendor_id = v_vendor_id, updated_at = now() where id = v_period_id;
          if v_order_id is not null then
            update catering_orders set vendor_id = v_vendor_id, updated_at = now() where id = v_order_id;
          end if;
        end if;
      end if;

      -- Handle catering items if present in row (rekap harian)
      if v_row ? 'items' and jsonb_typeof(v_row->'items') = 'object' then
        perform public.simpan_catering(v_period_id, v_row->'items', 'Diimpor dari batch ' || v_batch.nomor_batch);
      end if;

      v_applied_count := v_applied_count + 1;
    end if;
  end loop;

  -- 5. Mark batch status transition: dikonfirmasi -> selesai
  update import_batches
  set status = 'dikonfirmasi',
      updated_at = now()
  where id = p_batch_id;

  update import_batches
  set status = 'selesai',
      dikonfirmasi_at = now(),
      data_parsed = v_rows_to_process,
      total_baris = v_applied_count,
      ringkasan = jsonb_set(coalesce(ringkasan, '{}'::jsonb), '{opsi}', p_opsi),
      updated_at = now()
  where id = p_batch_id;

  return jsonb_build_object(
    'success', true,
    'status', 'selesai',
    'total_diproses', v_applied_count,
    'batch_id', p_batch_id
  );
end;
$$;
