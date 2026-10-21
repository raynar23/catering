# Dokumen Handover & Ringkasan Pengerjaan Proyek Catering TPS
### Sistem Pengelolaan Data Catering Karyawan - PT Terminal Petikemas Surabaya
*Pembaruan Terakhir: 21 Oktober 2026 (Tahap 10 - Dashboard Admin)*

---

## 1. Ikhtisar Sistem & Kredensial Akses

Sistem ini dibangun untuk mendigitalkan dan mengotomatiskan alur kerja pemesanan katering harian 3-shift di lingkungan PT Terminal Petikemas Surabaya (Pelindo TPS), mencakup pencatatan kuota porsi, distribusi pesanan ke vendor mitra, pengajuan revisi pasca-final, verifikasi General Affairs, hingga pelaporan progres pengiriman secara real-time.

### Akun Uji Coba Resmi (Tersedia di Database)

| Peran (Role) | Username / Email | Password | Keterangan & Akses |
| :--- | :--- | :--- | :--- |
| `admin_ga` | `admin@tps.co.id` (atau `admin`) | `gatps2026` | Akses penuh seluruh master data, input 3-shift, jadwal rotasi, verifikasi revisi, ganti vendor, dashboard KPI & analitik, dan audit timeline. |
| `vendor` | `vendor@tps.co.id` (atau `vendor`) | `vendortps2026` | Terhubung ke mitra Aisya Catering (V001). Akses portal mandiri: konfirmasi pesanan, penyesuaian revisi, pembaruan 5 tahap progres, riwayat. |

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
   - `v_rekap`: View sumber kebenaran data konsumsi porsi yang hanya menyaring data pesanan berlaku (`order_status in ('final', 'revisi')`), menjamin data draft dan pesanan batal tidak ikut terhitung ke KPI dan grafik.
   - `v_periode_ringkas`: View ringkasan periode yang menggabungkan total karyawan, total porsi, jumlah revisi pending, nama vendor, dan nama shift dalam satu baris untuk menghindari masalah N+1 query.
   - `v_rekap_bulanan`: View agregasi bulanan untuk laporan keuangan dan rekapitulasi konsumsi per vendor.
   - `v_utilisasi_shift`: View monitoring beban kerja dan utilisasi katering per shift kerja.

4. **Stored Procedures & RPC Berkeamanan Tinggi (`security definer` & `security invoker`)**:
   - `dashboard_ringkasan(p_dari date, p_sampai date)`: Fungsi analitik atomik satu panggilan untuk Admin GA (dibatasi maksimal 366 hari, verifikasi `is_admin()`). Menghasilkan JSON komprehensif berisi total porsi, rata-rata harian, jumlah revisi, revisi menunggu verifikasi, jadwal belum diinput (hari ini & besok), seri harian, per shift, per bagian, per vendor, serta seri pembanding periode sebelumnya dengan durasi yang sama.
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
Perubahan ini telah disinkronkan ke dalam berkas migrasi dan skrip database repositori:
- [DATABASE_LENGKAP_CATERING.sql](DATABASE_LENGKAP_CATERING.sql)
- [supabase/DATABASE_LENGKAP_CATERING.sql](supabase/DATABASE_LENGKAP_CATERING.sql)
- [supabase/migrations/006_rls.sql](supabase/migrations/006_rls.sql)
- [supabase/migrations/013_dashboard_ringkasan.sql](supabase/migrations/013_dashboard_ringkasan.sql)

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

## 4. Dashboard Admin & Analitik Operasional (Tahap 10)

### A. Fitur Dashboard Lengkap
1. **Filter Periode Terintegrasi & Sinkronisasi URL**:
   - Preset cepat: Hari Ini, 7 Hari, 30 Hari, Bulan Ini, 3 Bulan, 6 Bulan, 1 Tahun.
   - Tombol mundur (`<`) dan maju (`>`) satu durasi rentang kalender.
   - Dialog kalender kustom terintegrasi dengan komponen `DateRangePicker`.
   - Parameter tersimpan di URL (`?dari=...&sampai=...&preset=...`) sehingga tautan dashboard dapat langsung dibagikan atau disimpan bookmark.
2. **5 Kartu KPI Tanpa Ikon (DESIGN.md Anti AI-Slop)**:
   - Total Porsi (porsi pesanan berstatus final/revisi).
   - Rata-rata/Hari (porsi dibagi hari kalender).
   - Total Revisi (seluruh permohonan penyesuaian kuota).
   - Revisi Menunggu (status pending verifikasi General Affairs, berwarna amber jika > 0).
   - Belum Diinput (jadwal hari ini dan besok yang belum memiliki baris pesanan katering, berwarna merah jika kosong).
3. **Grafik Analitik SVG Murni**:
   - **Tren Porsi Harian**: Garis solid biru Pelindo `#1175BB` untuk periode aktif dan garis putus-putus abu-abu `#94A3B8` untuk periode sebelumnya berdurasi sama. Bucketing adaptif cerdas (harian s.d. 10 hari, per 3 hari s.d. 35 hari, mingguan s.d. 90 hari, bulanan di atasnya) dengan tooltip interaktif.
   - **Distribusi per Shift**: Donut chart proporsi Shift 1, 2, dan 3 dengan angka total di bagian tengah dan rincian persentase pada legenda.
   - **Porsi per Bagian**: Diagram batang vertikal alokasi porsi tiap unit kerja dengan label nama bagian utuh tanpa terpotong.
   - **Porsi per Vendor**: Diagram batang horizontal distribusi pemenuhan pesanan oleh 5 rekanan katering mitra (V001 - V005) lengkap dengan kode vendor dan persentase pemenuhan.
4. **Desktop 100dvh Zero Page Scroll**:
   - Seluruh elemen dashboard dioptimalkan muat 100% di dalam 4 viewport desktop target (`1190x670`, `1366x680`, `1440x800`, `1920x950`) tanpa memunculkan scrollbar halaman vertikal.

---

## 5. Struktur Rute Halaman Aplikasi

| Rute URL | Pengguna | Fungsi & Fitur Utama |
| :--- | :--- | :--- |
| `/login` | Publik | Halaman masuk dengan normalisasi username, background dermaga TPS, dan kartu form bebas pergeseran layout. |
| `/admin/dashboard` | Admin GA | Dashboard analitik katering, 5 KPI tanpa ikon, 4 grafik performa operasional, filter periode, dan sinkron URL. |
| `/admin/input-catering` | Admin GA | Grid harian 3 shift berdampingan (Shift 3, 1, 2), pelacakan sel kotor, tombol kirim ke vendor. |
| `/admin/periode` | Admin GA | Manajemen jadwal periode, filter multi-dimensi, tombol ganti vendor terjadwal/darurat via RPC. |
| `/admin/verifikasi` | Admin GA | Verifikasi perubahan kuota (revisi) dan pemantauan respons kesanggupan vendor. |
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

---

## 6. Ringkasan Pengujian, Kualitas, & Status Git

1. **Pengujian Unit (Vitest)**:
   - 17 berkas pengujian: `17 passed`.
   - 99 pengujian fungsional: `99 passed`.
   - Menguji: matematika rentang dashboard (preset, shift, previous period, adaptive bucketing), konsistensi total metrik KPI dan grafik, rotasi vendor, route guard, user guard, reducer sel kotor, progres vendor, dan validasi Zod.
2. **Kompilasi TypeScript**:
   - `npx tsc --noEmit` lulus dengan 0 kesalahan.
3. **Build Produksi Next.js**:
   - `next build` berhasil mengompilasi 29 rute tanpa kendala.
   - Variabel lingkungan sensitif tidak pernah bocor ke bundel JavaScript klien.
4. **Repositori Git**:
   - Seluruh tahapan telah di-commit secara terstruktur mengikuti Conventional Commits pada cabang `feat/10-dashboard` dan di-push ke remote origin GitHub.
   - Identitas commit terkonfigurasi pada: `Muhammad Raynar Hammam <raynarham23@gmail.com>`.
