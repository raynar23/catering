-- Migration 024 Apply Script: Fix periods updated_at column and konfirmasi_impor
BEGIN;

-- 1. Ensure updated_at column exists on public.periods
ALTER TABLE public.periods
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Ensure canonical konfirmasi_impor function works safely
CREATE OR REPLACE FUNCTION public.konfirmasi_impor(
  p_batch_id uuid,
  p_baris jsonb DEFAULT NULL,
  p_opsi jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_batch record;
  v_rows jsonb;
  v_row jsonb;
  v_applied_count integer := 0;
  v_timpa_periode boolean := false;
  v_tgl date;
  v_shift_id uuid;
  v_vendor_id uuid;
  v_period_id uuid;
  v_order_id uuid;
  v_order_status public.order_status;
  v_existing_order_vendor_id uuid;
  v_vendor_nama text;
  v_vendor_kode text;
BEGIN
  -- Validate caller role
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin_ga', 'superadmin')
    )
    OR auth.role() = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Hanya Admin GA yang berhak mengonfirmasi impor data'
      USING ERRCODE = '42501';
  END IF;

  -- Fetch import batch
  SELECT * INTO v_batch
  FROM public.import_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch impor tidak ditemukan: %', p_batch_id;
  END IF;

  IF v_batch.status = 'selesai' THEN
    RAISE EXCEPTION 'Batch impor ini sudah dikonfirmasi dan selesai sebelumnya';
  END IF;

  -- Extract options
  v_timpa_periode := COALESCE((p_opsi->>'timpa_periode')::boolean, false);

  -- Determine rows source
  IF p_baris IS NOT NULL AND jsonb_typeof(p_baris) = 'array' THEN
    v_rows := p_baris;
  ELSE
    SELECT jsonb_agg(data_parse) INTO v_rows
    FROM public.import_rows
    WHERE batch_id = p_batch_id;
  END IF;

  IF v_rows IS NULL OR jsonb_array_length(v_rows) = 0 THEN
    RAISE EXCEPTION 'Tidak ada baris data valid untuk disimpan';
  END IF;

  -- Iterate through rows
  FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows)
  LOOP
    -- Only process non-error rows
    IF COALESCE(v_row->>'status', '') <> 'error' THEN
      v_tgl := (v_row->>'tanggal')::date;

      -- Resolve shift_id
      v_shift_id := NULL;
      IF v_row ? 'shift_id' AND (v_row->>'shift_id') IS NOT NULL AND (v_row->>'shift_id') <> '' THEN
        v_shift_id := (v_row->>'shift_id')::uuid;
      ELSIF v_row ? 'shift_nama' AND (v_row->>'shift_nama') IS NOT NULL THEN
        SELECT id INTO v_shift_id
        FROM public.shifts
        WHERE lower(nama) = lower(v_row->>'shift_nama')
           OR lower(nama) = lower('Shift ' || (v_row->>'shift_nama'))
           OR lower(alias) = lower(v_row->>'shift_nama')
        LIMIT 1;
      END IF;

      -- Resolve vendor_id
      v_vendor_id := NULL;
      IF v_row ? 'vendor_id' AND (v_row->>'vendor_id') IS NOT NULL AND (v_row->>'vendor_id') <> '' THEN
        v_vendor_id := (v_row->>'vendor_id')::uuid;
      ELSIF v_row ? 'vendor_nama' AND (v_row->>'vendor_nama') IS NOT NULL THEN
        SELECT id INTO v_vendor_id
        FROM public.vendors
        WHERE lower(nama) = lower(v_row->>'vendor_nama')
        LIMIT 1;

        -- Auto-provision vendor if option is active and not found
        IF v_vendor_id IS NULL AND COALESCE((p_opsi->>'buat_vendor_baru')::boolean, false) THEN
          v_vendor_nama := trim(v_row->>'vendor_nama');
          v_vendor_kode := upper(substring(regexp_replace(v_vendor_nama, '[^a-zA-Z0-9]', '', 'g') from 1 for 10));

          INSERT INTO public.vendors (kode, nama, aktif)
          VALUES (v_vendor_kode, v_vendor_nama, true)
          ON CONFLICT (kode) DO UPDATE SET nama = EXCLUDED.nama
          RETURNING id INTO v_vendor_id;
        END IF;
      END IF;

      -- Validate mandatory foreign keys
      IF v_tgl IS NULL OR v_shift_id IS NULL OR v_vendor_id IS NULL THEN
        CONTINUE;
      END IF;

      -- Upsert / reconcile period
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
            UPDATE public.periods SET vendor_id = v_vendor_id WHERE id = v_period_id;
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
          UPDATE public.periods SET vendor_id = v_vendor_id WHERE id = v_period_id;
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
      updated_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'sukses', true,
    'total_disimpan', v_applied_count,
    'nomor_batch', v_batch.nomor_batch
  );
END;
$$;

-- 3. Grant privileges to authenticated role
GRANT EXECUTE ON FUNCTION public.konfirmasi_impor(uuid, jsonb, jsonb) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
