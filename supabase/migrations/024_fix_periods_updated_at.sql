-- Migration 024: Fix periods updated_at column and canonical konfirmasi_impor

-- 1. Ensure updated_at column exists on public.periods
ALTER TABLE public.periods
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Drop any conflicting overloads
DROP FUNCTION IF EXISTS public.konfirmasi_impor(uuid);
DROP FUNCTION IF EXISTS public.konfirmasi_impor(uuid, jsonb);

-- 3. Canonical konfirmasi_impor function
CREATE OR REPLACE FUNCTION public.konfirmasi_impor(
  p_batch_id uuid,
  p_baris jsonb DEFAULT NULL,
  p_opsi jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
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
BEGIN
  -- Strict Admin GA authorization check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin GA yang dapat mengonfirmasi impor data.';
  END IF;

  -- Verify and lock import batch record
  SELECT * INTO v_batch FROM public.import_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch impor tidak ditemukan.';
  END IF;

  IF v_batch.status <> 'draft' THEN
    RAISE EXCEPTION 'Batch impor sudah berstatus "%" dan tidak dapat dikonfirmasi ulang.', v_batch.status;
  END IF;

  -- Resolve rows to process (use edited rows if provided, otherwise original parsed rows)
  v_rows_to_process := COALESCE(p_baris, v_batch.data_parsed);
  IF v_rows_to_process IS NULL OR jsonb_array_length(v_rows_to_process) = 0 THEN
    RAISE EXCEPTION 'Tidak ada baris data untuk dikonfirmasi.';
  END IF;

  v_jenis := COALESCE(v_batch.jenis_dokumen, 'jadwal');
  v_buat_vendor_baru := COALESCE((p_opsi->>'buat_vendor_baru')::boolean, false);
  v_timpa_periode := COALESCE((p_opsi->>'timpa_periode')::boolean, false);

  -- Process rows by document category
  FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows_to_process) LOOP
    -- Skip rows explicitly marked as error
    IF (v_row->>'status') = 'error' THEN
      CONTINUE;
    END IF;

    IF v_jenis = 'vendor' THEN
      v_vendor_nama := trim(v_row->>'nama');
      IF v_vendor_nama IS NOT NULL AND v_vendor_nama <> '' THEN
        INSERT INTO public.vendors (kode, nama, kontak, alamat)
        VALUES (
          COALESCE(NULLIF(trim(v_row->>'kode'), ''), 'V' || lpad((SELECT count(*) + 1 FROM public.vendors)::text, 3, '0')),
          v_vendor_nama,
          NULLIF(trim(v_row->>'kontak'), ''),
          NULLIF(trim(v_row->>'alamat'), '')
        )
        ON CONFLICT (kode) DO UPDATE SET
          nama = EXCLUDED.nama,
          kontak = COALESCE(EXCLUDED.kontak, vendors.kontak),
          alamat = COALESCE(EXCLUDED.alamat, vendors.alamat),
          updated_at = now();
        v_applied_count := v_applied_count + 1;
      END IF;

    ELSIF v_jenis = 'bagian' THEN
      IF (v_row->>'nama') IS NOT NULL AND trim(v_row->>'nama') <> '' THEN
        INSERT INTO public.bagian (kode, nama, kelompok, lokasi_antar, catatan_antar)
        VALUES (
          COALESCE(NULLIF(trim(v_row->>'kode'), ''), upper(regexp_replace(trim(v_row->>'nama'), '[^A-Za-z0-9]', '_', 'g'))),
          trim(v_row->>'nama'),
          COALESCE(NULLIF(trim(v_row->>'kelompok'), ''), 'Operasional'),
          NULLIF(trim(v_row->>'lokasi_antar'), ''),
          NULLIF(trim(v_row->>'catatan_antar'), '')
        )
        ON CONFLICT (nama) DO UPDATE SET
          kode = EXCLUDED.kode,
          kelompok = EXCLUDED.kelompok,
          lokasi_antar = COALESCE(EXCLUDED.lokasi_antar, bagian.lokasi_antar),
          catatan_antar = COALESCE(EXCLUDED.catatan_antar, bagian.catatan_antar),
          updated_at = now();
        v_applied_count := v_applied_count + 1;
      END IF;

    ELSE
      -- Jadwal catering and rekap harian
      v_tgl := (v_row->>'tanggal')::date;
      v_shift_alias := lower(trim(COALESCE(v_row->>'shift_alias', '')));
      v_shift_id := NULLIF(v_row->>'shift_id', '')::uuid;
      v_vendor_id := NULLIF(v_row->>'vendor_id', '')::uuid;
      v_vendor_nama := trim(COALESCE(v_row->>'vendor_nama', ''));

      -- Resolve shift ID if missing
      IF v_shift_id IS NULL AND v_shift_alias <> '' THEN
        SELECT id INTO v_shift_id FROM public.shifts
        WHERE lower(nama) = v_shift_alias
           OR lower(label) = v_shift_alias
           OR lower(COALESCE(alias, '')) = v_shift_alias
           OR lower(nama) LIKE '%' || v_shift_alias || '%'
        LIMIT 1;
      END IF;

      -- Resolve or auto-register vendor
      IF v_vendor_id IS NULL AND v_vendor_nama <> '' THEN
        SELECT id INTO v_vendor_id FROM public.vendors WHERE lower(trim(nama)) = lower(v_vendor_nama) LIMIT 1;

        IF v_vendor_id IS NULL THEN
          IF v_buat_vendor_baru THEN
            SELECT COALESCE(max(NULLIF(regexp_replace(kode, '[^0-9]', '', 'g'), '')::integer), 0) + 1
            INTO v_max_vendor_num FROM public.vendors;
            v_new_vendor_code := 'V' || lpad(v_max_vendor_num::text, 3, '0');

            INSERT INTO public.vendors (kode, nama)
            VALUES (v_new_vendor_code, v_vendor_nama)
            RETURNING id INTO v_vendor_id;
          ELSE
            RAISE EXCEPTION 'Vendor "%" belum terdaftar. Aktifkan opsi "Buat vendor baru otomatis".', v_vendor_nama;
          END IF;
        END IF;
      END IF;

      IF v_tgl IS NULL OR v_shift_id IS NULL OR v_vendor_id IS NULL THEN
        RAISE EXCEPTION 'Baris jadwal tidak valid (tanggal, shift, atau vendor tidak ditemukan).';
      END IF;

      -- Check existing period
      SELECT id INTO v_period_id FROM public.periods WHERE tanggal = v_tgl AND shift_id = v_shift_id;

      IF v_period_id IS NULL THEN
        INSERT INTO public.periods (tanggal, shift_id, vendor_id, keterangan)
        VALUES (v_tgl, v_shift_id, v_vendor_id, 'Diimpor dari batch ' || v_batch.nomor_batch)
        RETURNING id INTO v_period_id;
      ELSE
        SELECT id, status, vendor_id INTO v_order_id, v_order_status, v_existing_order_vendor_id
        FROM public.catering_orders WHERE period_id = v_period_id;

        IF v_order_id IS NOT NULL AND v_order_status <> 'draft' THEN
          IF v_timpa_periode THEN
            UPDATE public.periods SET vendor_id = v_vendor_id, updated_at = now() WHERE id = v_period_id;
            UPDATE public.catering_orders SET vendor_id = v_vendor_id, updated_at = now() WHERE id = v_order_id;

            INSERT INTO public.order_logs (order_id, actor_id, aksi, catatan, data_baru)
            VALUES (
              v_order_id,
              auth.uid(),
              'diubah',
              'Vendor ditimpa lewat impor ' || v_batch.nomor_batch,
              jsonb_build_object('vendor_id', v_vendor_id)
            );
          ELSE
            CONTINUE;
          END IF;
        ELSE
          UPDATE public.periods SET vendor_id = v_vendor_id, updated_at = now() WHERE id = v_period_id;
          IF v_order_id IS NOT NULL THEN
            UPDATE public.catering_orders SET vendor_id = v_vendor_id, updated_at = now() WHERE id = v_order_id;
          END IF;
        END IF;
      END IF;

      -- Handle catering items if present in row (rekap harian)
      IF v_row ? 'items' AND jsonb_typeof(v_row->'items') = 'object' THEN
        PERFORM public.simpan_catering(v_period_id, v_row->'items', 'Diimpor dari batch ' || v_batch.nomor_batch);
      END IF;

      v_applied_count := v_applied_count + 1;
    END IF;
  END LOOP;

  -- Finalize import batch status
  UPDATE public.import_batches
  SET status = 'selesai',
      dikonfirmasi_at = now(),
      data_parsed = v_rows_to_process,
      total_baris = v_applied_count,
      ringkasan = jsonb_set(COALESCE(ringkasan, '{}'::jsonb), '{opsi}', p_opsi),
      updated_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'selesai',
    'total_diproses', v_applied_count,
    'batch_id', p_batch_id
  );
END;
$$;

-- Restore current_user_vendor_id alias and grant execute to authenticated role
CREATE OR REPLACE FUNCTION public.current_user_vendor_id()
RETURNS uuid AS $$
  SELECT public.my_vendor_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.current_user_vendor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_vendor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Ensure vendors RLS policy uses canonical my_vendor_id
DROP POLICY IF EXISTS "vendors_select_policy" ON public.vendors;
CREATE POLICY "vendors_select_policy" ON public.vendors
  FOR SELECT TO authenticated
  USING (public.is_admin() OR id = public.my_vendor_id());

DROP POLICY IF EXISTS "vendors_manage_policy" ON public.vendors;
CREATE POLICY "vendors_manage_policy" ON public.vendors
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.konfirmasi_impor(uuid, jsonb, jsonb) TO authenticated;
