# Ringkasan Pengerjaan Proyek Catering TPS (Tahap 02 - Tahap 08)

Dokumen ini merangkum seluruh pekerjaan, keputusan arsitektur, fitur yang telah diimplementasikan, serta status pengujian pada sistem Pengelolaan Data Catering Karyawan Pelindo Terminal Petikemas Surabaya (TPS).

---

## 1. Ikhtisar Arsitektur & Ketentuan Proyek

- **Peran Pengguna (Strictly 2 Roles)**:
  - `admin_ga`: Mengelola master data, jadwal periode, input catering 3-shift, verifikasi data, revisi kuota, dan monitoring.
  - `vendor`: Mengakses portal mandiri untuk melihat permintaan, menyatakan ketersediaan (sanggup/tidak sanggup), memperbarui tahapan progres pengiriman, dan melihat riwayat pesanan.
- **Isolasi Keamanan (Row Level Security & RPC)**:
  - Isolasi data vendor ditegakkan pada tingkat database PostgreSQL (RLS), bukan hanya filter UI.
  - Seluruh mutasi kritis (konfirmasi kesanggupan, pergantian vendor, verifikasi revisi, progres pengantaran) dieksekusi melalui *Stored Procedure* / RPC dengan hak `security definer`.
- **Desain & Pengalaman Pengguna**:
  - Konsep layout desktop *zero-scroll* (`100dvh` / `h-dvh max-h-dvh overflow-hidden`).
  - Target sentuh mobile ramah sentuhan minimal 44px (`min-h-[44px]`).
  - Anonimisasi: Vendor selalu melihat pengupdate internal sebagai "Admin GA" (identitas pribadi karyawan tidak dibocorkan).
  - Standar kode bersih: Tanpa emoji pada kode, UI, maupun pesan commit; komentar kode berupa 1 baris berbahasa Inggris.

---

## 2. Rincian Pengerjaan per Tahap / Branch

### Tahap 02: Fondasi Database & Keamanan (`feat/02-database`)
- **Migrasi Database PostgreSQL** (10 file migrasi di `supabase/migrations/`):
  1. `001_enums_master.sql`: Enum role, order status, progress, master shift, bagian, vendor, profil.
  2. `002_periods_items.sql`: Tabel periods, catering_orders, catering_items beserta indeks.
  3. `003_revisions_logs.sql`: Tabel revisions dengan kolom immutable, audit timeline append-only `order_logs`.
  4. `004_import_batches.sql`: Penampung batch impor dokumen.
  5. `005_views.sql`: View ringkasan periode dan utilisasi.
  6. `006_rls.sql`: Kebijakan Row Level Security ketat untuk isolasi vendor dan akses admin.
  7. `007_rpc_admin.sql`: RPC admin (`simpan_catering`, `kirim_catering`, `ganti_vendor_periode`, `ajukan_revisi`, `verifikasi_revisi`).
  8. `008_rpc_vendor.sql`: RPC vendor (`respon_periode_vendor`, `respon_revisi_vendor`, `update_progres_vendor`, `get_notifikasi`).
  9. `009_realtime.sql`: Konfigurasi publikasi real-time.
  10. `010_view_periode_ringkas.sql`: View performa tinggi `v_periode_ringkas` mencegah query N+1.
- **Seed Data Lengkap (`supabase/seed.sql`)**:
  - 3 Shift kerja: Shift 3 (Malam: 00.00-08.00), Shift 1 (Pagi: 08.00-16.00), Shift 2 (Siang: 16.00-24.00).
  - Master Bagian operasional TPS dan 5 Vendor catering aktif (V001 - V005).
  - Akun autentikasi awal Admin GA dan Vendor dengan password terenkripsi.

---

### Tahap 03: Autentikasi, Middleware Role, dan App Shell (`feat/03-auth-shell`)
- **Autentikasi Supabase SSR**:
  - Integrasi `@supabase/ssr` melalui `client.ts`, `server.ts`, dan `middleware.ts`.
  - Normalisasi username menjadi huruf kecil dipetakan ke format email internal `username@tps.co.id`.
  - Server actions `sign-in.ts` dan `sign-out.ts` dengan penolakan akun nonaktif.
- **Kerangka Aplikasi (App Shell)**:
  - Sidebar tetap 264px (`#0B3D6B`) dengan logo monokrom Pelindo TPS dan navigasi berbasis role.
  - Topbar dengan identitas pengguna, role badge, dan toggle drawer mobile.
  - Komponen sistem UI: `PageContainer`, `PageHeader`, `ToastProvider`, `StatusBadge`, `EmptyState`.

---

### Tahap 04: Master Data Bagian dan Master Vendor (`feat/04-master-bagian-vendor`)
- **Data Bagian (`/admin/data-bagian` & `/admin/master/bagian`)**:
  - Tabel berpaginasi di sisi server dengan pencarian nama, kode, dan kelompok.
  - Dialog Tambah & Ubah Bagian (nama, kelompok, lokasi antar, catatan antar, urutan, status aktif).
  - Validasi hapus aman: ditolak jika bagian sudah terikat pada pesanan, dialihkan ke opsi nonaktifkan.
- **Data Vendor (`/admin/data-vendor` & `/admin/master/vendor`)**:
  - Kode vendor otomatis berurutan (V001, V002, dst.) yang dapat disesuaikan.
  - Dialog Tambah & Ubah Vendor (kode, nama, kontak WhatsApp/telp, alamat, status aktif).
  - Validasi Zod skema form dengan penanganan error ramah pengguna.

---

### Tahap 05: Periode Catering (Jadwal) dan Master Shift (`feat/05-periode-shift`)
- **Jadwal Periode (`/admin/periode` & `/admin/master/periode`)**:
  - Tabel multi-filter (bulan, tahun, shift, vendor, status pesanan).
  - Urutan tampilan logis: Tanggal &rarr; Urutan Shift Laporan (Shift 3 &rarr; Shift 1 &rarr; Shift 2).
  - Dialog Tambah Periode dan validasi batasan unik (tanggal + shift_id).
- **Fitur Ganti Vendor Terjadwal**:
  - Aksi penggantian vendor melalui RPC `ganti_vendor_periode` dengan alasan wajib dan konfirmasi bertingkat.
  - Seluruh tindakan tercatat otomatis pada append-only `order_logs`.
- **Dialog Kelola Shift**:
  - Konfigurasi nama, label, jam mulai, jam selesai (mendukung lintas hari / jam 24.00), dan batas jam tiba.

---

### Tahap 06: Input Data Catering Grid Tiga Shift (`feat/06-input-catering`)
- **Grid Input Harian (`/admin/input` & `/admin/input-catering`)**:
  - Pemilih tanggal (default hari esok, navigasi hari sebelumnya dan berikutnya).
  - Grid 3 kelompok shift berdampingan (Shift 3 Malam, Shift 1 Pagi, Shift 2 Siang).
  - Sub-kolom per shift: Karyawan dan Porsi (rasio 1:1 otomatis tersinkronisasi bila tidak diubah manual).
  - Baris Total dan catatan per bagian.
- **Pengurangan Beban Simpan (Dirty Cell Tracking)**:
  - State reducer (`grid-reducer.ts`) melacak sel yang diedit sehingga hanya item kotor (*dirty*) yang dikirimkan ke server melalui `simpan_catering`.
  - Mencegah timpaan data antar PIC yang menginput baris bagian berbeda pada periode sama.
- **Aksi Kirim ke Vendor**:
  - Dialog kirim vendor dengan verifikasi bagian yang belum terisi dan penguncian status menjadi `final`.

---

### Tahap 07: Revisi, Verifikasi Data, dan Riwayat (`feat/07-revisi-verifikasi`)
- **Pengajuan Revisi Pasca-Final**:
  - Tombol Ajukan Revisi pada grid input untuk periode berstatus `final` atau `revisi`.
  - Dialog revisi menampilkan kuota awal, input kuota baru, kalkulasi selisih otomatis bertanda (+/-), dan input alasan wajib melalui RPC `ajukan_revisi`.
  - Penandaan visual baris dengan revisi pending dan pencegahan revisi ganda pada item yang sama.
- **Halaman Verifikasi Data (`/admin/verifikasi`)**:
  - Segmented control `Revisi | Respons Vendor` dengan badge jumlah pending dinamis.
  - Tab Revisi: Tabel permohonan revisi, dialog persetujuan/penolakan dengan catatan wajib pembatalan via RPC `verifikasi_revisi`.
  - Tab Respons Vendor: Monitoring kesanggupan vendor, tombol kirim format WhatsApp otomatis, dan tombol cepat ganti vendor bila vendor menolak.
- **Kronologi Audit Timeline (`/admin/riwayat/[periodId]`)**:
  - Halaman riwayat lengkap menampilkan kartu ringkasan periode dan alur kronologis audit trail dari `order_logs`.

---

### Tahap 08: Portal Vendor (`feat/08-portal-vendor`)
- **Dashboard Vendor (`/vendor` & `/vendor/dashboard`)**:
  - 4 Kartu KPI: Permintaan Hari Ini (porsi), Menunggu Respons, Sedang Diproses, Selesai Bulan Ini.
  - Panel Pesanan Hari Ini: Rincian 3 shift hari ini lengkap dengan jam, batas jam tiba, total porsi, status respon, progres, dan tombol aksi cepat.
- **Permintaan Masuk (`/vendor/permintaan`)**:
  - Tabel periode final milik vendor dengan filter tanggal dan status respon.
  - Inspector Drawer: Tabel rincian alokasi per bagian, lokasi pengantaran, catatan antar, dan indikator revisi menunggu.
- **Konfirmasi Ketersediaan (`/vendor/ketersediaan`)**:
  - Antrean terpisah untuk pesanan baru dan pengajuan perubahan kuota (revisi).
  - Aksi "Menyanggupi" dan "Tidak Menyanggupi" (dialog catatan wajib bila menolak) memanggil RPC `respon_periode_vendor` dan `respon_revisi_vendor`.
- **Alur Progres Pengiriman (`/vendor/progres`)**:
  - Workflow stepper 5 tahap: Menunggu &rarr; Dipersiapkan &rarr; Dikirim &rarr; Sampai &rarr; Selesai.
  - Tombol aksi maju satu arah melalui RPC `update_progres_vendor` dengan penolakan terhadap langkah mundur.
- **Riwayat Pesanan (`/vendor/riwayat`)**:
  - Tabel arsip riwayat lengkap dengan filter rentang tanggal, status respon, status progres, dan pencarian teks.
- **Anonimitas & Pengujian Lintas Akun**:
  - Nama pengupdate untuk vendor ditampilkan konsisten sebagai "Admin GA".
  - Kasus uji isolasi database `supabase/tests/03_vendor_cross_account.sql` memverifikasi bahwa akun vendor (misal `vendor.aisya` dan `vendor.ibu`) hanya dapat membaca dan memutasi datanya sendiri.

---

## 3. Status Pengujian & Kualitas Kode

- **Unit Test Suite (Vitest)**:
  - 13 berkas pengujian unit: `13 passed`.
  - 67 pengujian fungsional murni: `67 passed`.
  - Mencakup: `progress.test.ts`, `grid-reducer.test.ts`, `rotasi.test.ts`, `route-guard.test.ts`, `log-formatter.test.ts`, `whatsapp.test.ts`, `sign-in.test.ts`, serta validator Zod untuk shift, bagian, vendor, dan periode.
- **TypeScript Static Analysis**:
  - `npx tsc --noEmit` lulus tanpa kesalahan (0 error).
- **Next.js Production Build**:
  - `npm run build` sukses mengompilasi 24 rute statis dan dinamis.
- **Git Repository Status**:
  - Seluruh branch dari `feat/02-database` sampai `feat/08-portal-vendor` telah tersimpan dan di-push ke remote repository `origin`.

---

## 4. Kesiapan Menuju Tahap Berikutnya

Sistem saat ini berada pada branch `feat/08-portal-vendor` dengan repositori yang bersih (*clean working tree*). Semua dependensi, fungsi RPC, dan komponen antarmuka telah siap untuk melanjutkan ke **Prompt 09** (Rekapitulasi dan Laporan).
