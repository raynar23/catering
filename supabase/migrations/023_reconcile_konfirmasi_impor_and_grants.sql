-- Migration 023: Reconcile konfirmasi_impor signature, fix get_rekap_harian page variable, and enforce privileges lockdown

-- Ensure required columns in import_batches table exist
ALTER TABLE public.import_batches
  ADD COLUMN IF NOT EXISTS jenis_dokumen text,
  ADD COLUMN IF NOT EXISTS mesin text,
  ADD COLUMN IF NOT EXISTS ringkasan jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_import_batches_jenis ON public.import_batches (jenis_dokumen);
CREATE INDEX IF NOT EXISTS idx_import_batches_mesin ON public.import_batches (mesin);

-- Drop legacy function overloads with 1 parameter or invalid signatures
DROP FUNCTION IF EXISTS public.konfirmasi_impor(uuid);
DROP FUNCTION IF EXISTS public.konfirmasi_impor(uuid, jsonb);
DROP FUNCTION IF EXISTS public.konfirmasi_impor(uuid, jsonb, jsonb);

-- Create canonical 3-parameter konfirmasi_impor function
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

-- Fix get_rekap_harian undeclared variable v_page
CREATE OR REPLACE FUNCTION public.get_rekap_harian(
  p_dari date,
  p_sampai date,
  p_vendor_id uuid DEFAULT NULL,
  p_bagian_id uuid DEFAULT NULL,
  p_shift_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_page int;
  v_offset int;
  v_limit int;
  v_total_rows int;
  v_active_columns jsonb;
  v_period_rows jsonb;
  v_totals_summary jsonb;
  v_grand_total bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Admin GA yang dapat melihat rekapitulasi data katering.';
  END IF;

  IF (p_sampai - p_dari) > 366 THEN
    RAISE EXCEPTION 'Rentang filter melebihi batas maksimal 366 hari.';
  END IF;

  v_page := GREATEST(COALESCE(p_page, 1), 1);
  v_limit := GREATEST(COALESCE(p_page_size, 25), 1);
  v_offset := (v_page - 1) * v_limit;

  -- Active department columns
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'kode', b.kode,
      'nama', b.nama,
      'kelompok', b.kelompok,
      'urutan', b.urutan
    ) ORDER BY b.urutan ASC, b.nama ASC
  ), '[]'::jsonb)
  INTO v_active_columns
  FROM public.bagian b
  WHERE b.aktif = true
    AND (p_bagian_id IS NULL OR b.id = p_bagian_id);

  -- Count total matching periods
  WITH filtered_periods AS (
    SELECT DISTINCT
      p.id AS period_id,
      p.tanggal,
      s.urutan_laporan
    FROM public.periods p
    JOIN public.shifts s ON s.id = p.shift_id
    LEFT JOIN public.catering_orders o ON o.period_id = p.id
    LEFT JOIN public.catering_items ci ON ci.order_id = o.id
    WHERE p.tanggal BETWEEN p_dari AND p_sampai
      AND (p_vendor_id IS NULL OR p.vendor_id = p_vendor_id)
      AND (p_shift_id IS NULL OR p.shift_id = p_shift_id)
      AND (p_bagian_id IS NULL OR ci.bagian_id = p_bagian_id)
  )
  SELECT count(*) INTO v_total_rows FROM filtered_periods;

  -- Page rows
  WITH paged_periods AS (
    SELECT
      p.id AS period_id,
      p.tanggal,
      p.shift_id,
      s.nama AS shift_nama,
      s.label AS shift_label,
      s.urutan_laporan,
      p.vendor_id,
      v.kode AS vendor_kode,
      v.nama AS vendor_nama,
      o.id AS order_id,
      COALESCE(o.status::text, 'belum_input') AS status,
      COALESCE(o.respon_vendor::text, 'menunggu') AS respon_vendor,
      COALESCE(o.progres_vendor::text, 'menunggu') AS progres_vendor
    FROM public.periods p
    JOIN public.shifts s ON s.id = p.shift_id
    JOIN public.vendors v ON v.id = p.vendor_id
    LEFT JOIN public.catering_orders o ON o.period_id = p.id
    LEFT JOIN public.catering_items ci ON ci.order_id = o.id
    WHERE p.tanggal BETWEEN p_dari AND p_sampai
      AND (p_vendor_id IS NULL OR p.vendor_id = p_vendor_id)
      AND (p_shift_id IS NULL OR p.shift_id = p_shift_id)
      AND (p_bagian_id IS NULL OR ci.bagian_id = p_bagian_id)
    GROUP BY
      p.id, p.tanggal, p.shift_id, s.nama, s.label, s.urutan_laporan,
      p.vendor_id, v.kode, v.nama, o.id, o.status, o.respon_vendor, o.progres_vendor
    ORDER BY p.tanggal DESC, s.urutan_laporan ASC
    LIMIT v_limit OFFSET v_offset
  ),
  period_items_agg AS (
    SELECT
      pp.period_id,
      COALESCE(jsonb_object_agg(
        ci.bagian_id::text,
        jsonb_build_object(
          'id', ci.id,
          'porsi', ci.porsi,
          'karyawan', ci.karyawan
        )
      ) FILTER (WHERE ci.id IS NOT NULL), '{}'::jsonb) AS items,
      COALESCE(sum(ci.porsi), 0) AS total_porsi_periode
    FROM paged_periods pp
    LEFT JOIN public.catering_items ci ON ci.order_id = pp.order_id
    GROUP BY pp.period_id
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'period_id', pp.period_id,
      'tanggal', pp.tanggal,
      'shift_id', pp.shift_id,
      'shift_nama', pp.shift_nama,
      'shift_label', pp.shift_label,
      'vendor_id', pp.vendor_id,
      'vendor_kode', pp.vendor_kode,
      'vendor_nama', pp.vendor_nama,
      'order_id', pp.order_id,
      'status', pp.status,
      'respon_vendor', pp.respon_vendor,
      'progres_vendor', pp.progres_vendor,
      'items', pia.items,
      'total_porsi', pia.total_porsi_periode
    ) ORDER BY pp.tanggal DESC, pp.urutan_laporan ASC
  ), '[]'::jsonb)
  INTO v_period_rows
  FROM paged_periods pp
  JOIN period_items_agg pia ON pia.period_id = pp.period_id;

  -- Overall totals
  SELECT
    COALESCE(sum(ci.porsi), 0) INTO v_grand_total
  FROM public.periods p
  JOIN public.catering_orders o ON o.period_id = p.id
  JOIN public.catering_items ci ON ci.order_id = o.id
  WHERE p.tanggal BETWEEN p_dari AND p_sampai
    AND (p_vendor_id IS NULL OR p.vendor_id = p_vendor_id)
    AND (p_shift_id IS NULL OR p.shift_id = p_shift_id)
    AND (p_bagian_id IS NULL OR ci.bagian_id = p_bagian_id)
    AND o.status IN ('final', 'revisi');

  SELECT COALESCE(jsonb_object_agg(
    b.id::text,
    COALESCE(sum_items.total_porsi, 0)
  ), '{}'::jsonb)
  INTO v_totals_summary
  FROM public.bagian b
  LEFT JOIN (
    SELECT
      ci.bagian_id,
      sum(ci.porsi) AS total_porsi
    FROM public.periods p
    JOIN public.catering_orders o ON o.period_id = p.id
    JOIN public.catering_items ci ON ci.order_id = o.id
    WHERE p.tanggal BETWEEN p_dari AND p_sampai
      AND (p_vendor_id IS NULL OR p.vendor_id = p_vendor_id)
      AND (p_shift_id IS NULL OR p.shift_id = p_shift_id)
      AND (p_bagian_id IS NULL OR ci.bagian_id = p_bagian_id)
      AND o.status IN ('final', 'revisi')
    GROUP BY ci.bagian_id
  ) sum_items ON sum_items.bagian_id = b.id
  WHERE b.aktif = true
    AND (p_bagian_id IS NULL OR b.id = p_bagian_id);

  RETURN jsonb_build_object(
    'success', true,
    'total_rows', v_total_rows,
    'page', v_page,
    'page_size', v_limit,
    'columns', v_active_columns,
    'rows', v_period_rows,
    'totals', v_totals_summary,
    'grand_total', v_grand_total
  );
END;
$$;

-- Privileges Lockdown (021 hardening)
DO $$
DECLARE
  r record;
  v_allowlist text[] := ARRAY[
    'is_admin',
    'my_vendor_id',
    'simpan_catering',
    'kirim_catering',
    'ajukan_revisi',
    'verifikasi_revisi',
    'ganti_vendor_periode',
    'konfirmasi_impor',
    'dashboard_ringkasan',
    'get_rekap_harian',
    'get_rekap_ringkasan',
    'delete_selected_periods',
    'respon_periode_vendor',
    'respon_revisi_vendor',
    'update_progres_vendor',
    'get_notifikasi'
  ];
BEGIN
  -- Revoke all privileges from public, anon, and authenticated on non-extension functions
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM public, anon, authenticated', r.proname, r.args);
  END LOOP;

  -- Grant execute strictly to authenticated for allowlisted operational functions
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(v_allowlist)
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
  END LOOP;
END $$;

-- Revoke default execute privileges for future functions in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM public, anon, authenticated;

-- Ensure service_role retains all privileges on all public functions
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Introspection helper functions restricted strictly to service_role
CREATE OR REPLACE FUNCTION public.check_function_privileges()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'function_name', p.proname,
      'identity_arguments', pg_get_function_identity_arguments(p.oid),
      'is_security_definer', p.prosecdef,
      'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'service_role_execute', has_function_privilege('service_role', p.oid, 'EXECUTE')
    ) ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)
  ), '[]'::jsonb)
  INTO v_result
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_depend d
      WHERE d.objid = p.oid AND d.deptype = 'e'
    );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_public_tables_rls()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'table_name', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'anon_select', has_table_privilege('anon', c.oid, 'SELECT'),
      'authenticated_select', has_table_privilege('authenticated', c.oid, 'SELECT')
    ) ORDER BY c.relname
  ), '[]'::jsonb)
  INTO v_result
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r';

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.check_function_privileges() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_function_privileges() TO service_role;

REVOKE ALL ON FUNCTION public.check_public_tables_rls() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_public_tables_rls() TO service_role;

-- Secure and remove any lingering backup tables in public schema
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE '_backup_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM public, anon, authenticated', t.tablename);
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', t.tablename);
  END LOOP;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
