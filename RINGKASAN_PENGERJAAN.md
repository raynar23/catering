# Dokumen Handover & Ringkasan Pengerjaan Proyek Catering TPS
### Sistem Pengelolaan Data Catering Karyawan - PT Terminal Petikemas Surabaya
*Pembaruan Terakhir: 21 Oktober 2026 (Tahap 02 s.d. Tahap 08)*

---

## 1. Ikhtisar Sistem & Kredensial Akses

Sistem ini dibangun untuk mendigitalkan dan mengotomatiskan alur kerja pemesanan katering harian 3-shift di lingkungan PT Terminal Petikemas Surabaya (Pelindo TPS), mencakup pencatatan kuota porsi, distribusi pesanan ke vendor mitra, pengajuan revisi pasca-final, verifikasi General Affairs, hingga pelaporan progres pengiriman secara real-time.

### Akun Uji Coba Resmi (Tersedia di Database)

| Peran (Role) | Username / Email | Keterangan & Akses |
| :--- | :--- | :--- |
| `admin_ga` | `admin@tps.co.id` (atau `admin`) | Akses penuh seluruh master data, input 3-shift, jadwal rotasi, verifikasi revisi, ganti vendor, dan audit timeline. |
| `vendor` | `vendor@tps.co.id` (atau `vendor`) | Terhubung ke mitra Aisya Catering (V001). Akses portal mandiri: konfirmasi pesanan, penyesuaian revisi, pembaruan 5 tahap progres, riwayat. |

*Catatan Keamanan:* Kata sandi demo dirotasi secara aman menggunakan skrip `node scripts/rotate-demo-passwords.mjs` yang hanya mencetak kredensial ke konsol terminal lokal.

*Catatan Autentikasi:* Sistem mendukung input username langsung (`admin` atau `vendor`) yang otomatis dinormalisasi menjadi email korporat `username@tps.co.id` pada sisi autentikasi Supabase SSR.

---

## 2. Arsitektur Database & Penyelesaian Keamanan RLS

Database menggunakan PostgreSQL pada platform Supabase dengan skema relasional, audit append-only, dan Row Level Security (RLS) ketat.

### A. Struktur Data & Tabel Utama

1. **Master Data Operasional**:
   - `shifts`: 3 shift kerja (Shift 3 Malam: 00.00-08.00, Shift 1 Pagi: 08.00-16.00, Shift 2 Siang: 16.00-24.00) dengan konfigurasi batas jam tiba.
   - `bagian`: Bagian/divisi kerja operasional TPS beserta kelompok, lokasi antar fisik, catatan antar, dan urutan tampilan.
   - `vendors`: Data mitra katering (kode unik V001 - V005, kontak WhatsApp, penanggung jawab, status aktif).
   - `profiles`: Data pengguna sistem terikat ke `auth.users`, mencakup role (`admin_ga`, `vendor`), relasi vendor/bagian, dan flag aktif.

2. **Transaksi & Alur Kerja Katering**:
   - `periods`: Header jadwal katering per tanggal dan shift. Menampung status pesanan (`draft`, `final`, `revisi`, `batal`), vendor penanggung jawab, status respon vendor (`menunggu`, `menyanggupi`, `tidak_menyanggupi`), batas jam tiba, dan progres vendor (`menunggu`, `dipersiapkan`, `dikirim`, `sampai`, `selesai`).
   - `catering_orders`: Pengelompokan pesanan per bagian dalam suatu periode.
   - `catering_items`: Detail jumlah karyawan dan porsi per bagian. Rasio default 1:1 dengan validasi integritas.
   - `revisions`: Log permintaan perubahan kuota pasca status final. Menyimpan kuota lama, kuota baru, selisih bertanda (+/-), alasan wajib, serta status persetujuan General Affairs. Kolom-kolom revisi dijaga immutable melalui database trigger.
   - `order_logs`: Audit trail append-only mencatat seluruh kronologi (pembuatan, perubahan sel, pengiriman, perubahan status respon, pergantian vendor, verifikasi revisi) lengkap dengan aktor dan timestamp.
   - `import_batches`: Penampung riwayat impor data dokumen katering.

3. **High-Performance Database Views**:
   - `v_periode_ringkas`: View ringkasan periode yang menggabungkan total karyawan, total porsi, jumlah revisi pending, nama vendor, dan nama shift dalam satu baris untuk menghindari masalah N+1 query.
   - `v_rekap_bulanan`: View agregasi bulanan untuk laporan keuangan dan rekapitulasi konsumsi per vendor.
   - `v_utilisasi_shift`: View monitoring beban kerja dan utilisasi katering per shift kerja.

4. **Stored Procedures & RPC Berkeamanan Tinggi (`security definer`)**:
   - `simpan_catering`: Menyimpan data katering draft per shift hanya untuk sel yang berubah (*dirty cell tracking*), mencegah konflik penimpaan data antar PIC yang mengisi baris berbeda secara bersamaan.
   - `kirim_catering`: Memvalidasi kelengkapan pengisian kuota seluruh bagian dan mengunci periode menjadi status `final`.
   - `ganti_vendor_periode`: Memfasilitasi pergantian vendor terjadwal atau vendor darurat dengan alasan wajib, otomatis memperbarui status respon, dan mencatat riwayat log.
   - `ajukan_revisi`: Mengajukan perubahan kuota pasca-final dengan alasan wajib dan penandaan visual pending.
   - `verifikasi_revisi`: Menyetujui atau membatalkan revisi dengan catatan wajib jika dibatalkan.
   - `respon_periode_vendor`: Vendor menyatakan kesanggupan atau ketidaksanggupan (dengan catatan penolakan wajib).
   - `respon_revisi_vendor`: Vendor menyetujui atau menolak revisi jumlah porsi.
   - `update_progres_vendor`: Memajukan status pengantaran 5 tahap satu arah secara bertahap (menolak loncatan mundur).
   - `get_notifikasi`: Mengambil daftar peringatan dan notifikasi aktif untuk admin maupun vendor.

---

### B. Investigasi Mendalam & Solusi Tuntas Bug RLS Infinite Recursion (`42P17`)

#### 1. Akar Masalah
Saat pengguna melakukan login, aplikasi mengeksekusi `SELECT role, aktif FROM public.profiles WHERE id = auth.uid()`. Terjadi error PostgreSQL `42P17: infinite recursion detected in policy for relation "profiles"`.

Penyebabnya berasal dari kebijakan RLS lama pada tabel `profiles`:
```sql
create policy "profiles_manage_policy" on profiles
  for all to authenticated
  using (coalesce((select role = 'admin_ga' from profiles where id = auth.uid()), false));
```
- Klausa `for all` menyebabkan policy ini dievaluasi pada semua perintah, termasuk perintah `SELECT`.
- Di dalam klausa `using`, terdapat subquery yang membaca tabel `profiles` kembali (`select role from profiles...`).
- Di PostgreSQL, ketika ada beberapa policy `PERMISSIVE`, PostgreSQL mengevaluasinya bersamaan dengan operator `OR` (`profiles_select_policy OR profiles_manage_policy`).
- Karena `profiles_manage_policy` membaca tabel `profiles`, PostgreSQL memicu policy `profiles_manage_policy` kembali secara berulang tanpa batas hingga batas rekursi terlampaui.
- Dampak turunannya: Seluruh tabel operasional lain (`shifts`, `periods`, `catering_orders`) yang mengecek role admin melalui `profiles` ikut terblokir error rekursi yang sama.

#### 2. Solusi Rekayasa yang Diterapkan
Kebijakan RLS diperbaiki dengan memisahkan kewenangan secara tegas dan meniadakan subquery melingkar:

```sql
-- 1. Hapus policy manage bertipe ALL yang memicu rekursi
drop policy if exists "profiles_manage_policy" on public.profiles;

-- 2. Pastikan hak baca profil terbuka bagi user yang terautentikasi tanpa subquery
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy" on public.profiles
  for select to authenticated
  using (true);

-- 3. Batasi policy modifikasi hanya untuk operasi UPDATE berdasarkan identitas diri
create policy "profiles_update_policy" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 4. Berikan hak akses eksplisit
grant select on public.profiles to authenticated;
```

Perubahan ini telah disinkronkan ke dalam berkas migrasi dan skrip database repositori:
- [DATABASE_LENGKAP_CATERING.sql](DATABASE_LENGKAP_CATERING.sql)
- [supabase/DATABASE_LENGKAP_CATERING.sql](supabase/DATABASE_LENGKAP_CATERING.sql)
- [supabase/migrations/006_rls.sql](supabase/migrations/006_rls.sql)

---

## 3. Pembaruan Desain Antarmuka & Zero-Shift Layout Login

### A. Integrasi Visual Korporat Resmi
1. **Latar Belakang Login**: Menggunakan foto operasional dermaga peti kemas resmi PT Terminal Petikemas Surabaya yang ditempatkan di `public/images/login-bg.png` melalui [LoginBackground.tsx](src/components/auth/LoginBackground.tsx).
2. **Logo Korporat**: Menggunakan logo resmi Pelindo TPS berwarna di `public/images/logo-tps-warna.png` pada [LoginCard.tsx](src/components/auth/LoginCard.tsx) dan logo monokrom putih di sudut kiri atas layar.

### B. Form Login Kompak & Zero Layout Shift (Bebas Pergeseran Tinggi)
- **Pengurangan Tinggi Kartu**: Tinggi kartu login dipangkas secara substansial (~60px lebih ringkas) melalui padding `px-5 py-4 sm:px-6 sm:py-5`, ukuran logo `h-7 sm:h-8`, tipografi judul `text-[17px] sm:text-[18px]`, dan tinggi input/tombol `h-9` (36px).
- **Slot Alert Statis (`h-[38px] flex items-center`)**: Area pesan kesalahan alert dibungkus dalam container tetap 38px di [LoginForm.tsx](src/components/auth/LoginForm.tsx).
  - *Saat Normal (Tanpa Alert)*: Ruang 38px dialokasikan secara transparan, menjaga jarak visual yang konsisten.
  - *Saat Alert Muncul*: Banner alert mengisi tepat di dalam slot 38px tersebut tanpa menambah tinggi kartu maupun menggeser posisi elemen form di bawahnya.
  - *Hasil*: Ukuran tinggi form login tetap sama 100% sebelum maupun sesudah alert muncul.
- **Peningkatan Diagnostik**: Menambahkan logging `console.error` pada [sign-in.ts](src/lib/auth/sign-in.ts) untuk memudahkan debugging jika terjadi anomali query profil pada console browser.

---

## 4. Struktur Rute Halaman Aplikasi

| Rute URL | Pengguna | Fungsi & Fitur Utama |
| :--- | :--- | :--- |
| `/login` | Publik | Halaman masuk dengan normalisasi username, background dermaga TPS, dan kartu form bebas pergeseran layout. |
| `/admin/dashboard` | Admin GA | Dashboard operasional katering, filter rentang tanggal, KPI ringkasan, grafik distribusi porsi, tren, dan donat shift. |
| `/admin/input-catering` | Admin GA | Grid harian 3 shift berdampingan (Shift 3, 1, 2), pelacakan sel kotor, tombol kirim ke vendor. |
| `/admin/periode` | Admin GA | Manajemen jadwal periode, filter multi-dimensi, tombol ganti vendor terjadwal/darurat via RPC. |
| `/admin/verifikasi` | Admin GA | Verifikasi perubahan kuota (revisi) dan pemantauan respons kesanggupan vendor. |
| `/admin/rekapitulasi` | Admin GA | Rekap harian tabular per bagian dan ringkasan metrik agregat dengan ekspor Excel dan PDF ber-kop resmi. |
| `/admin/impor-data` | Admin GA | Ekstraksi dokumen cerdas (xlsx, csv, docx, pdf, OCR gambar), deteksi tipe otomatis, pemetaan entitas, dan eksekusi batch. |
| `/admin/riwayat/[periodId]` | Admin GA | Kronologi audit timeline lengkap per periode katering dari log append-only. |
| `/admin/data-bagian` | Admin GA | Master data bagian operasional, kelompok, lokasi antar fisik, dan catatan antar. |
| `/admin/data-vendor` | Admin GA | Master data mitra katering (V001 - V005), kontak WhatsApp, dan PIC vendor. |
| `/admin/manajemen-user` | Admin GA | Pengelolaan akun pengguna, strip metrik, dialog tambah/ubah, reset password, nonaktifkan akun. |
| `/admin/pengaturan` | Admin GA | Pengaturan profil pribadi Admin GA, ganti kata sandi, dan footer versi sistem dari package manifest. |
| `/vendor/dashboard` | Vendor | 4 Kartu KPI, panel pesanan 3 shift hari ini, dan aksi cepat konfirmasi pesanan. |
| `/vendor/permintaan` | Vendor | Tabel pesanan final milik vendor dan drawer inspektor detail alokasi per bagian & lokasi antar. |
| `/vendor/ketersediaan` | Vendor | Antrean pesanan dan revisi yang belum direspons, aksi menyanggupi / tidak menyanggupi (catatan wajib). |
| `/vendor/progres` | Vendor | Pelaporan progres pengiriman 5 tahap satu arah (Menunggu -> Dipersiapkan -> Dikirim -> Sampai -> Selesai). |
| `/vendor/riwayat` | Vendor | Arsip riwayat pesanan katering vendor dengan filter status dan rentang tanggal. |
| `/vendor/pengaturan` | Vendor | Pengaturan profil perwakilan vendor, ganti kata sandi, dan footer versi sistem. |
| `/api/ekspor/excel` | Admin GA | Route handler ekspor berkas Excel (.xlsx) format resmi Pelindo TPS dengan styling exceljs. |
| `/api/ekspor/pdf` | Admin GA | Route handler ekspor dokumen laporan PDF (.pdf) ber-kop resmi dengan AutoTable landscape. |
| `/api/impor/analisis` | Admin GA | Route handler parsing berkas dokumen multi-format dan deteksi struktur. |
| `/api/impor/konfirmasi` | Admin GA | Route handler eksekusi penulisan batch impor transaksi dan master data ke database. |

---

## 5. Ringkasan Pengujian, Kualitas, & Status Git (v1.0.0)

1. **Pengujian Unit (Vitest)**:
   - 32 berkas pengujian: `32 passed (100%)`.
   - 163 pengujian fungsional: `163 passed (100%)`.
   - Mencakup logika bisnis: kalkulasi progres, reducer grid sel kotor, rotasi vendor, route guard, user guard, audit formatter, format WhatsApp, autentikasi, versi sistem, validasi Zod, parser jadwal/master/rekap harian, ekspor guard, realtime mapper, dan dashboard aggregates.
2. **Pengujian Database & Keamanan (`npm run test:db`)**:
   - 6 pengujian keamanan terverifikasi lolos: isolasi RLS antar vendor, pencegahan eskalasi role, pemblokiran insert langsung client, perlindungan log audit append-only, dan penolakan RPC admin oleh vendor.
3. **Kompilasi TypeScript & Linting**:
   - `npx tsc --noEmit`: 0 kesalahan.
   - `npm run lint`: 0 kesalahan.
4. **Build Produksi Next.js**:
   - `next build` berhasil mengompilasi 34 rute (halaman antarmuka dan route handler server) dalam 749ms.
   - Kunci sensitif `SUPABASE_SERVICE_ROLE_KEY` dan `GEMINI_API_KEY` terverifikasi 100% tidak pernah bocor ke bundel klien (`.next/static/`).
5. **CI/CD & Dokumentasi**:
   - GitHub Actions CI workflow (`.github/workflows/ci.yml`) siap otomatis mengeksekusi lint, typecheck, test, dan build.
   - Dokumentasi lengkap di direktori `docs/` (Instalasi, Arsitektur Teknis + Diagram Mermaid, Panduan Admin GA, Panduan Vendor, Skrip Demo End-to-End).
   - Single source of truth database SQL terpadu: `DATABASE_LENGKAP_CATERING.sql`.
   - Rilis resmi: tag git `v1.0.0` telah dibuat dan di-push ke cabang utama `main`.
   - Identitas commit: `Muhammad Raynar Hammam <raynarham23@gmail.com>`.
