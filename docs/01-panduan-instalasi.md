# Panduan Instalasi dan Pengoperasian Sistem
### Sistem Pengelolaan Data Catering Karyawan - PT Terminal Petikemas Surabaya (Pelindo TPS)

Dokumen ini memuat langkah lengkap instalasi, konfigurasi basis data Supabase, pengaturan variabel lingkungan, pengoperasian lokal, dan penerapan (*deployment*) ke platform cloud.

---

## 1. Prasyarat Sistem

Sebelum memulai, pastikan perangkat pengembang telah terpasang:
- **Node.js**: Versi `>= 20.x` (Direkomendasikan Node.js 22 LTS).
- **NPM**: Versi `>= 10.x`.
- **Git**: Versi `>= 2.30`.
- **Peramban Web Modern**: Google Chrome, Mozilla Firefox, Microsoft Edge, atau Apple Safari.
- **Akun Supabase**: Akun aktif di platform [Supabase](https://supabase.com).

---

## 2. Pengaturan Basis Data Supabase

Sistem Catering TPS menggunakan basis data PostgreSQL di cloud Supabase dengan Row Level Security (RLS) terisolasi dan Stored Procedures atomik.

### Cara A: Inisialisasi Cepat Menggunakan Berkas Tunggal (Direkomendasikan)
1. Buka proyek Supabase Anda pada web browser.
2. Navigasikan ke menu **SQL Editor** pada sidebar kiri.
3. Buka berkas `DATABASE_LENGKAP_CATERING.sql` yang berada di akar repositori.
4. Salin seluruh konten berkas tersebut dan tempelkan ke SQL Editor Supabase.
5. Klik tombol **Run** untuk mengeksekusi seluruh skema tabel, relasi, tipe enum, index performa, view analitik, RLS policies, trigger append-only audit, stored procedures (RPC), publikasi Realtime, dan data awal (*seed* master data).

### Cara B: Migrasi Terstruktur per Berkas
Jika Anda mengelola skema melalui migration runner, jalankan berkas migrasi di folder `supabase/migrations/` secara berurutan:
1. `001_enums_master.sql`: Enum app_role, order_status, revision_status, vendor_progress, log_action, dan tabel master (shifts, bagian, vendors, profiles).
2. `002_periods_items.sql`: Tabel transaksi periods, catering_orders, dan catering_items.
3. `003_revisions_logs.sql`: Tabel revisions dan audit append-only order_logs.
4. `004_import_batches.sql`: Tabel log batch impor dokumen.
5. `005_views.sql`: High-performance view v_rekap konsumsi valid.
6. `006_rls.sql`: Kebijakan Row Level Security per role dan isolasi vendor.
7. `007_rpc_admin.sql`: Stored procedures untuk hak akses Admin GA.
8. `008_rpc_vendor.sql`: Stored procedures untuk hak akses Vendor.
9. `009_realtime.sql`: Konfigurasi Realtime awal.
10. `010_view_periode_ringkas.sql`: View agregasi periode anti N+1.
11. `011_schema_alignment.sql`: Penyelarasan format kontak dan alias array.
12. `012_profiles_no_hp.sql`: Kolom no_hp pada profiles.
13. `013_dashboard_ringkasan.sql`: RPC dashboard analitik satu panggilan.
14. `014_rekapitulasi_queries.sql`: RPC rekapitulasi harian dan ringkasan 4 dimensi.
15. `015_konfirmasi_impor.sql`: RPC atomik konfirmasi impor dokumen.
16. `016_realtime_setup.sql`: Publikasi Supabase Realtime dan peningkatan RPC notifikasi.
17. `017_security_advisor_hardening.sql`: Pengerasan keamanan profiles dan audit append-only.
18. Jalankan `supabase/seed.sql` untuk memuat data awal shift, bagian, vendor mitra, dan jadwal periode uji coba.

---

## 3. Konfigurasi Variabel Lingkungan (.env.local)

Salin berkas template lingkungan:
```bash
cp .env.example .env.local
```

Buka `.env.local` dan sesuaikan nilainya dari Dashboard Supabase Anda (**Project Settings** -> **API**):

```ini
# URL Proyek Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co

# Kunci Anonim Publik (Aman di sisi peramban)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Kunci Layanan Server Privilese Tinggi (HANYA SISI SERVER - JANGAN DIBOCORKAN)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Konfigurasi Mesin AI Impor Cerdas (Bawaan: false - mesin aturan deterministik)
IMPORT_AI_ENABLED=false
GEMINI_API_KEY=
```

---

## 4. Menjalankan Aplikasi di Lingkungan Lokal

1. Pasang seluruh dependensi proyek:
   ```bash
   npm install
   ```

2. Jalankan server pengembangan Next.js:
   ```bash
   npm run dev
   ```

3. Buka peramban pada alamat `http://localhost:3000`. Aplikasi akan otomatis mengarahkan ke halaman `/login`.

---

## 5. Kredensial Akun Uji Coba

Gunakan kredensial resmi berikut untuk menguji sistem:

| Peran (Role) | Username | Email Auth Terdaftar |
| :--- | :--- | :--- |
| **Admin General Affairs** | `admin` | `admin@tps.co.id` |
| **Mitra Vendor (Aisya)** | `vendor` | `vendor@tps.co.id` |

*Catatan:* Kata sandi demo dikelola dan dirotasi secara aman melalui skrip `node scripts/rotate-demo-passwords.mjs` yang hanya mencetak kredensial ke konsol terminal lokal. Pengguna dapat mengetikkan username langsung (`admin` atau `vendor`) pada kartu login; sistem secara otomatis menormalisasinya menjadi email format Pelindo TPS.

---

## 6. Penerapan ke Vercel (Production Deployment)

1. Unggah kode ke repositori GitHub.
2. Buat proyek baru di [Vercel](https://vercel.com) dan impor repositori GitHub `catering`.
3. Pada bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `IMPORT_AI_ENABLED` (isi `false`)
4. Konfigurasi Build Settings:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Klik **Deploy**. Vercel akan mengompilasi bundel dan menerbitkan URL produksi SSL gratis (`https://<project-name>.vercel.app`).

---

## 7. Catatan Penting: Supabase Free Tier Inactivity (Proyek Tertidur)

> **PERINGATAN OPERASIONAL:**
> Pada paket Supabase Free Tier, proyek yang tidak menerima traffic selama 7 hari berturut-turut akan otomatis diistirahatkan (*paused*) oleh platform Supabase.
> 
> **Tindakan Sebelum Sesi Presentasi/Demo:**
> 1. Buka dashboard Supabase pada `https://supabase.com/dashboard` minimal 1-2 hari sebelum jadwal demo.
> 2. Jika status proyek bertuliskan **PAUSED**, klik tombol **Restore Project** (proses bangun memakan waktu sekitar 1-2 menit).
> 3. Lakukan login satu kali ke sistem katering untuk memanaskan koneksi basis data.
