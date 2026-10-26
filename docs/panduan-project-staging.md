# Panduan Setup Project Supabase Staging & Local

Dokumen ini menjelaskan tata cara penyiapan lingkungan pengujian kedua (staging/local) sesuai aturan audit **G4**. Skrip yang melakukan mutasi data operasional (`scripts/smoke-flow.mjs` dan skenario tulis pada `scripts/test-db.mjs`) dilarang keras dijalankan terhadap database live produksi (`tdvfbtxlnlduajztojng.supabase.co`).

---

## 1. Arsitektur Lingkungan

| Lingkungan | Supabase URL | Tujuan | Kebijakan Eksekusi |
| :--- | :--- | :--- | :--- |
| **Produksi / Live** | `https://tdvfbtxlnlduajztojng.supabase.co` | Operasional nyata & UAT client | Hanya query baca-saja (`--read-only`). Dilarang keras menjalankan skrip smoke/mutasi uji. |
| **Staging** | `https://<project-id>.supabase.co` (Proyek gratis baru) | Validasi end-to-end, migrasi baru, uji mutasi | Bebas menjalankan skrip pengujian, reset data uji, dan validasi skema. |
| **Lokal** | `http://127.0.0.1:54321` | Pengembangan offline & unit integration test | Target bawaan allowlist pengujian. |

---

## 2. Opsi A: Membuat Project Staging di Supabase Cloud (Gratis)

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan buat project baru:
   - **Name**: `catering-staging`
   - **Database Password**: Buat kata sandi aman dan simpan di pengelola sandi Anda.
   - **Region**: Singapore (`ap-southeast-1`).
   - **Pricing Plan**: Free Tier.
2. Salin kredensial API dari menu **Project Settings > API**:
   - `Project URL`
   - `anon / public key`
   - `service_role key` (rahasia)
3. Terapkan skema database lengkap:
   - Buka menu **SQL Editor** pada project staging.
   - Buka berkas `supabase/DATABASE_LENGKAP_CATERING.sql` di repositori ini.
   - Salin seluruh isinya dan jalankan di SQL Editor staging.
4. Terapkan migrasi hardening `supabase/apply/017_apply.sql` untuk memastikan seluruh RLS dan view invoker aktif.
5. Konfigurasi kredensial uji di file `.env.test.local` (atau set variabel environment terminal):
   ```bash
   TEST_SUPABASE_URL="https://<project-staging-id>.supabase.co"
   TEST_SUPABASE_ANON_KEY="<staging-anon-key>"
   TEST_SUPABASE_SERVICE_ROLE_KEY="<staging-service-role-key>"
   TEST_SUPABASE_URL_ALLOWLIST="https://<project-staging-id>.supabase.co"
   ```

---

## 3. Opsi B: Menggunakan Supabase CLI Lokal

1. Pastikan Docker Desktop sedang berjalan di mesin Anda.
2. Inisialisasi dan jalankan Supabase lokal:
   ```bash
   npx supabase start
   ```
3. Terapkan migrasi dan seed lokal:
   ```bash
   npx supabase db reset
   ```
4. Supabase lokal akan berjalan di `http://127.0.0.1:54321`, yang secara bawaan telah terdaftar di `TEST_SUPABASE_URL_ALLOWLIST`.

---

## 4. Menjalankan Skrip Pengujian

### A. Uji Baca-Saja terhadap Database Live (Aman)
Skrip berikut tidak melakukan penulisan, penyisipan, pengubahan, atau penghapusan data sama sekali:
```bash
npm run test:db:readonly
```

### B. Uji Smoke Flow End-to-End (Hanya Staging / Lokal)
Jalankan terhadap project staging atau lokal yang telah didaftarkan di allowlist:
```bash
NEXT_PUBLIC_SUPABASE_URL="https://<project-staging-id>.supabase.co" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="<staging-anon-key>" \
SUPABASE_SERVICE_ROLE_KEY="<staging-service-role-key>" \
TEST_SUPABASE_URL_ALLOWLIST="https://<project-staging-id>.supabase.co" \
node scripts/smoke-flow.mjs
```

Jika dicoba dijalankan terhadap project produksi, eksekusi akan langsung dibatalkan dengan pesan:
```
======================================================================
TEST EXECUTION BLOCKED PER RULE G4
Database Target: https://tdvfbtxlnlduajztojng.supabase.co
Reason: smoke-flow.mjs performs mutation tests and is strictly forbidden
from running against production. The target URL must be an explicit member
of TEST_SUPABASE_URL_ALLOWLIST (e.g. local Supabase or dedicated staging).
======================================================================
```
