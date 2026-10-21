# Dokumen Handover & Ringkasan Pengerjaan Proyek Catering TPS
### Sistem Pengelolaan Data Catering Karyawan - PT Terminal Petikemas Surabaya
*Pembaruan Terakhir: 21 Oktober 2026 (Tahap 11 - Rekapitulasi dan Laporan Excel & PDF)*

---

## 1. Ikhtisar Sistem & Kredensial Akses

Sistem ini dibangun untuk mendigitalkan dan mengotomatiskan alur kerja pemesanan katering harian 3-shift di lingkungan PT Terminal Petikemas Surabaya (Pelindo TPS), mencakup pencatatan kuota porsi, distribusi pesanan ke vendor mitra, pengajuan revisi pasca-final, verifikasi General Affairs, hingga pelaporan progres pengiriman secara real-time.

### Akun Uji Coba Resmi (Tersedia di Database)

| Peran (Role) | Username / Email | Password | Keterangan & Akses |
| :--- | :--- | :--- | :--- |
| `admin_ga` | `admin@tps.co.id` (atau `admin`) | `gatps2026` | Akses penuh seluruh master data, input 3-shift, jadwal rotasi, verifikasi revisi, ganti vendor, dashboard analitik, rekapitulasi, ekspor Excel & PDF, dan audit timeline. |
| `vendor` | `vendor@tps.co.id` (atau `vendor`) | `vendortps2026` | Terhubung ke mitra Aisya Catering (V001). Akses portal mandiri: konfirmasi pesanan, penyesuaian revisi, pembaruan 5 tahap progres, riwayat. |

*Catatan Autentikasi:* Sistem mendukung input username langsung (`admin` atau `vendor`) yang otomatis dinormalisasi menjadi email korporat `username@tps.co.id` pada sisi autentikasi Supabase SSR.

---

## 2. Arsitektur Database & Penyelesaian Keamanan RLS

Database menggunakan PostgreSQL pada platform Supabase dengan skema relasional, audit append-only, dan Row Level Security (RLS) ketat.

### A. Struktur Data & Tabel Utama

1. **Master Data Operasional**:
   - `shifts`: 3 shift kerja (Shift 3 Malam: 00.00-08.00, Shift 1 Pagi: 08.00-16.00, Shift 2 Siang: 16.00-24.00) dengan konfigurasi batas jam tiba dan urutan laporan (3, 1, 2).
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
   - `v_rekap`: View sumber kebenaran data konsumsi porsi yang hanya menyaring data pesanan berlaku (`order_status in ('final', 'revisi')`), menjamin data draft dan pesanan batal tidak ikut terhitung ke KPI, grafik, rekap, maupun berkas ekspor.
   - `v_periode_ringkas`: View ringkasan periode yang menggabungkan total karyawan, total porsi, jumlah revisi pending, nama vendor, dan nama shift dalam satu baris untuk menghindari masalah N+1 query.
   - `v_rekap_bulanan`: View agregasi bulanan untuk laporan keuangan dan rekapitulasi konsumsi per vendor.
   - `v_utilisasi_shift`: View monitoring beban kerja dan utilisasi katering per shift kerja.

4. **Stored Procedures & RPC Berkeamanan Tinggi (`security definer` & `security invoker`)**:
   - `get_rekap_harian(p_dari, p_sampai, p_vendor_id, p_bagian_id, p_shift_id, p_page, p_page_size)`: Mengembalikan matriks porsi per bagian aktif dan per shift harian secara terpaginasi beserta total baris dan total kolom untuk seluruh rentang.
   - `get_rekap_ringkasan(p_dari, p_sampai, p_vendor_id, p_bagian_id, p_shift_id)`: Mengagregasikan metrik 4 dimensi (per bagian, per shift, per vendor, per bulan) dan indikator operasional dalam satu panggilan.
   - `dashboard_ringkasan(p_dari date, p_sampai date)`: Fungsi analitik atomik satu panggilan untuk Admin GA (dibatasi maksimal 366 hari, verifikasi `is_admin()`).
   - `simpan_catering`: Menyimpan data katering draft per shift hanya untuk sel yang berubah (*dirty cell tracking*).
   - `kirim_catering`: Memvalidasi kelengkapan pengisian kuota seluruh bagian dan mengunci periode menjadi status `final`.
   - `ganti_vendor_periode`: Memfasilitasi pergantian vendor terjadwal atau vendor darurat dengan alasan wajib.
   - `ajukan_revisi`: Mengajukan perubahan kuota pasca-final dengan alasan wajib dan penandaan visual pending.
   - `verifikasi_revisi`: Menyetujui atau membatalkan revisi dengan catatan wajib jika dibatalkan.
   - `respon_periode_vendor`: Vendor menyatakan kesanggupan atau ketidaksanggupan (dengan catatan penolakan wajib).
   - `respon_revisi_vendor`: Vendor menyetujui atau menolak revisi jumlah porsi.
   - `update_progres_vendor`: Memajukan status pengantaran 5 tahap satu arah secara bertahap (menolak loncatan mundur).
   - `get_notifikasi`: Mengambil daftar peringatan dan notifikasi aktif untuk admin maupun vendor.

---

### B. Sinkronisasi Berkas Database Repositori
Perubahan skema dan query telah disinkronkan ke dalam berkas:
- [DATABASE_LENGKAP_CATERING.sql](DATABASE_LENGKAP_CATERING.sql)
- [supabase/DATABASE_LENGKAP_CATERING.sql](supabase/DATABASE_LENGKAP_CATERING.sql)
- [supabase/migrations/013_dashboard_ringkasan.sql](supabase/migrations/013_dashboard_ringkasan.sql)
- [supabase/migrations/014_rekapitulasi_queries.sql](supabase/migrations/014_rekapitulasi_queries.sql)

---

## 3. Pembaruan Desain Antarmuka & Zero-Shift Layout Login

### A. Integrasi Visual Korporat Resmi
1. **Latar Belakang Login**: Menggunakan foto operasional dermaga peti kemas resmi PT Terminal Petikemas Surabaya yang ditempatkan di `public/images/login-bg.png` melalui [LoginBackground.tsx](src/components/auth/LoginBackground.tsx).
2. **Logo Korporat**: Menggunakan logo resmi Pelindo TPS berwarna di `public/images/logo-tps-warna.png` pada [LoginCard.tsx](src/components/auth/LoginCard.tsx) dan logo monokrom putih di sudut kiri atas layar.

### B. Form Login Kompak & Zero Layout Shift
- Tinggi kartu login dipangkas melalui padding `px-5 py-4 sm:px-6 sm:py-5`, ukuran logo `h-7 sm:h-8`, tipografi `text-[17px] sm:text-[18px]`, dan tinggi input/tombol `h-9`.
- Slot alert statis `h-[38px]` di [LoginForm.tsx](src/components/auth/LoginForm.tsx) menjaga tinggi form login tetap sama 100% sebelum maupun sesudah alert muncul.

---

## 4. Modul Rekapitulasi & Ekspor Laporan (Tahap 11)

### A. Antarmuka Rekapitulasi Terpadu (`/admin/rekapitulasi`)
1. **Filter Periode & Multi-Dimensi**:
   - Preset rentang cepat: Mingguan, Bulanan, 3 Bulan, 6 Bulan, Tahunan.
   - Kalender kustom interaktif dengan [DateRangePicker.tsx](src/components/ui/DateRangePicker.tsx).
   - Filter dropdown: Vendor, Bagian, dan Shift.
   - Tautan tersinkronisasi dua arah dengan URL parameter (`?dari=...&sampai=...&tab=...`).
2. **Rekap Harian**:
   - Tabel matriks baris (Tanggal, Shift, Vendor), kolom dinamis per bagian aktif, dan kolom Total.
   - Baris Total Keseluruhan Rentang di bagian bawah tabel (*sticky footer*).
   - Paginasi server-side (pilihan 15, 20, 50, 100 baris per halaman) untuk performa instan.
3. **Ringkasan Multi-Dimensi**:
   - Strip 4 kartu metrik tanpa ikon: Total Porsi, Rata-rata/Hari, Hari Operasional, Transaksi Final.
   - Grid 2x2 tabel agregasi: Rincian per Bagian, Rincian per Shift, Rincian per Vendor, dan Rincian per Bulan.
4. **Dialog Ekspor**:
   - Modal pilihan format dokumen: Microsoft Excel (`.xlsx`) atau Dokumen PDF (`.pdf`).
   - Input teks bebas untuk Catatan Tambahan yang akan dicetak pada footer berkas.
   - Unduhan langsung dengan indikator loading dan penanganan error.

### B. Mesin Pembangun Ekspor Excel (`exceljs`)
- Model sel murni terpisah di [excel-model.ts](src/lib/export/excel-model.ts) dan serializer di [excel-writer.ts](src/lib/export/excel-writer.ts).
- Tipografi resmi font Arial (ukuran 9-13pt).
- Pemisahan blok tanggal: Blok Tanggal 1-15 dan Tanggal 16-akhir bulan.
- Sub-kolom shift berurutan resmi: Shift 3 (Malam), Shift 1 (Siang), Shift 2 (Sore).
- Pengelompokan baris per `kelompok` bagian dengan rumus SUM dinamis (`=SUM(...)`) dan nilai cache.
- Multi-sheet otomatis: Satu sheet per bulan ditambah sheet "Ringkasan" untuk rentang lebih dari 1 bulan.
- Footer CATATAN dan JADWAL PENGIRIMAN CATERING otomatis dari data shift dan catatan antar bagian.

### C. Mesin Pembangun Ekspor PDF (`jspdf` + `jspdf-autotable`)
- Format dokumen A4 Landscape resmi di [pdf-writer.ts](src/lib/export/pdf-writer.ts).
- Kop resmi korporat PT Terminal Petikemas Surabaya, judul laporan, rentang tanggal, dan timestamp cetak WIB (`Asia/Jakarta`).
- Tabel matriks rekapitulasi harian dengan striping bergantian dan pemformatan angka Indonesia.
- Dua tabel ringkasan berdampingan (Ringkasan per Shift dan Ringkasan per Vendor).
- Penomoran halaman otomatis ("Halaman X dari Y") di bagian bawah tiap halaman.

### D. Keamanan Route Handler Server
- `/api/ekspor/excel` dan `/api/ekspor/pdf` dilindungi verifikasi sesi server: hanya pengguna dengan role aktif `admin_ga` yang diizinkan mengunduh berkas (mengembalikan 403 Forbidden untuk vendor).
- Pembatasan rentang tanggal maksimal 366 hari divalidasi ketat di sisi server.

---

## 5. Struktur Rute Halaman Aplikasi

| Rute URL | Pengguna | Fungsi & Fitur Utama |
| :--- | :--- | :--- |
| `/login` | Publik | Halaman masuk dengan normalisasi username, background dermaga TPS, dan kartu form bebas pergeseran layout. |
| `/admin/dashboard` | Admin GA | Dashboard analitik katering, 5 KPI tanpa ikon, 4 grafik performa operasional, filter periode, dan sinkron URL. |
| `/admin/rekapitulasi` | Admin GA | Rekapitulasi porsi per bagian & shift, ringkasan 4 dimensi, filter multi-dimensi, dan modal ekspor Excel/PDF. |
| `/admin/laporan` | Admin GA | Rute alias resmi yang otomatis mengarahkan ke modul rekapitulasi dan ekspor terpadu. |
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
| `/api/ekspor/excel` | Admin GA | Route handler server pengunduhan berkas rekapitulasi format spreadsheet Excel (.xlsx). |
| `/api/ekspor/pdf` | Admin GA | Route handler server pengunduhan dokumen laporan resmi format PDF (.pdf). |

---

## 6. Ringkasan Pengujian, Kualitas, & Status Git

1. **Pengujian Unit (Vitest)**:
   - 20 berkas pengujian: `20 passed`.
   - 120 pengujian fungsional: `120 passed`.
   - Menguji: matematika rentang rekap & partisi bulan, sanitasi nama sheet, generator penamaan berkas ekspor, model sel Excel dengan fixture sintetis 5 bagian & 2 minggu, aturan proteksi wewenang ekspor dan batasan 366 hari, konsistensi metrik dashboard, rotasi vendor, route guard, user guard, reducer sel kotor, progres vendor, dan skema form Zod.
2. **Kompilasi TypeScript**:
   - `npx tsc --noEmit` lulus dengan 0 kesalahan.
3. **Build Produksi Next.js**:
   - `next build` berhasil mengompilasi 31 rute tanpa kendala.
   - Seluruh variabel lingkungan sensitif terjaga aman di sisi server.
4. **Repositori Git**:
   - Seluruh tahapan telah di-commit secara terstruktur mengikuti Conventional Commits pada cabang `feat/11-rekap-laporan` dan siap digabungkan ke cabang utama `main`.
   - Identitas commit terkonfigurasi pada: `Muhammad Raynar Hammam <raynarham23@gmail.com>`.
