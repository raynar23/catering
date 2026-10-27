# Changelog - Sistem Pengelolaan Data Catering Karyawan
Semua perubahan penting pada proyek "Sistem Pengelolaan Data Catering Karyawan PT Terminal Petikemas Surabaya" didokumentasikan dalam berkas ini. Format mengikuti pedoman [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-10-26

### Penutupan Temuan Audit 2 (Audit 2 Closure & Hardening)

Rilis perbaikan dan pengerasan sistem pasca-Audit Tahap 2 untuk menutup temuan validasi operasional, hak akses stored procedure database, pembersihan riwayat kredensial, dan persiapan deployment produksi.

#### Diperbaiki (Fixed)
- **H1 - Validasi Pesanan Tanpa Item & Bagian Aktif**:
  - Validasi ketat `p_items` pada RPC `simpan_catering` dan server action (`saveDraftAction`, `kirimAction`) untuk mencegah tersimpannya pesanan kosong tanpa rincian item.
  - Penegasan integritas 5 bagian operasional resmi TPS (`CC Operator`, `RTG Operator`, `Mekanik CC`, `Mekanik RTG`, `Area Gudang CFS`) dengan 100% konsistensi referensi item katering (0 item yatim).
  - Penambahan unit test multi-dimensi `consistency-across-reports.test.ts` yang memverifikasi keselarasan kalkulasi total porsi pada Dashboard KPI, Rekapitulasi, ekspor Excel, dan ekspor PDF.
- **H4 - Pengerasan Hak Eksekusi Fungsi Database**:
  - Migrasi `019_function_privileges_and_hardening.sql`: Pencabutan total `EXECUTE` pada seluruh fungsi skema `public` dari peran `public`, `anon`, dan `authenticated`.
  - Konfigurasi `alter default privileges` untuk mencabut izin eksekusi otomatis fungsi di masa mendatang.
  - Pemberian izin `authenticated` secara eksplisit hanya melalui allowlist ketat RPC operasional dan fungsi pembantu RLS (`is_admin`, `my_vendor_id`). Peran `anon` memiliki 0 izin eksekusi fungsi database.
  - Pembatasan RPC `delete_selected_periods`: hanya dapat dipanggil oleh admin GA (`is_admin()`), dibatasi maksimal 100 periode per pemanggilan, dan secara ketat hanya mengizinkan penghapusan periode tanpa pesanan (`status = 'belum_input'`).
  - Pembersihan dan penghapusan fungsi warisan yang redundan: `is_admin_or_pic()`, `current_user_role()`, dan `current_user_vendor_id()`.
  - Penambahan pengujian hak eksekusi database Skenario (j) pada `scripts/test-db.mjs`.
- **H5 - Pembersihan Kredensial & Secrets Guard**:
  - Penghapusan file kredensial `supabase/add_admin_vendor_users.sql` dari repositori.
  - Penghapusan seluruh kata sandi demo bawaan dari skrip pengujian (`smoke-flow.mjs`, `test-db.mjs`, `create-requested-users.mjs`). Skrip kini mewajibkan input environment variable dan gagal secara deterministik jika variabel tidak disediakan.
  - Implementasi pengujian statis `src/lib/security-secrets-guard.test.ts` pada rangkaian Vitest untuk mendeteksi kata sandi demo, token JWT panjang, dan service role key dalam berkas terlacak.
  - Rotasi seluruh kata sandi akun aktif di database live via `scripts/rotate-demo-passwords.mjs` dan verifikasi penolakan login dengan kata sandi lama.

#### Ditambahkan (Added)
- **H2 - Prosedur Reset UAT & Seeder Jadwal Mandiri**:
  - Skrip SQL transaksi tunggal `scripts/reset-for-uat.sql` dengan mekanisme tabel cadangan (`_backup_*`), penonaktifan sementara dan verifikasi re-aktivasi trigger append-only, serta pembersihan data operasional tercemar dengan menjaga integritas data master.
  - Skrip seeder `scripts/seed-uat-window.mjs` yang idempoten dan deterministik berdasarkan zona waktu Asia/Jakarta untuk jendela UAT 2026-10-01 s.d. 2026-12-31 (276 periode) dengan distribusi status realistis dan porsi sintetis (18-24).
  - Standarisasi 7 akun pengguna UAT resmi (`admin.ga`, `admin2.ga`, `vendor.aisya` s.d. `vendor.nurina`) dan penonaktifan akun demo usang (`admin@tps.co.id` & `vendor@tps.co.id`).
- **H7 - Dokumentasi Deployment**:
  - Panduan resmi deployment produksi Vercel di `docs/deploy-vercel.md` mencakup spesifikasi variabel environment, konfigurasi Supabase Auth Site & Redirect URLs, serta daftar periksa pasca-deploy baca-saja.

---

## [1.0.0] - 2026-10-22

### Rilis Perdana Produksi (Initial Production Release)

Rilis perdana sistem katering karyawan terintegrasi untuk General Affairs PT Terminal Petikemas Surabaya (Pelindo TPS) yang menghubungkan tim GA dengan 5 mitra katering secara real-time.

#### Ditambahkan (Added)
- **Tahap 01 - Pondasi & Desain Sistem**:
  - Setup Next.js 16 (App Router, Turbopack, React 19) dengan TypeScript strict.
  - Sistem token desain korporat Pelindo TPS (Primary `#0A4D7C`, Background `#F0F4F8`, Border `#D9E2EC`).
  - Halaman masuk (*Login*) kompak dengan latar belakang dermaga peti kemas resmi TPS dan kartu form bebas pergeseran layout (*zero layout shift*).
- **Tahap 02 - Arsitektur Database & Relasional**:
  - Skema PostgreSQL terpadu mencakup tabel `shifts`, `bagian`, `vendors`, `profiles`, `periods`, `catering_orders`, `catering_items`, `revisions`, `order_logs`, dan `import_batches`.
  - View konsumsi valid `v_rekap` untuk menjamin konsistensi angka 100% pada KPI, grafik, dan ekspor.
  - Stored procedures atomik (`SECURITY DEFINER`) untuk seluruh mutasi transaksi katering.
- **Tahap 03 - Autentikasi, Middleware, & AppShell**:
  - Autentikasi Supabase SSR dengan normalisasi username instan (`admin` dan `vendor`).
  - Route guard middleware memproteksi akses berdasarkan role (`admin_ga` vs `vendor`).
  - Layout AppShell enterprise dengan sidebar kolapsibel, topbar dinamis, dan jaminan zero page scroll pada 4 target viewport desktop (1190x670, 1366x680, 1440x800, 1920x950).
- **Tahap 04 - Master Data Bagian & Vendor**:
  - Modul kelola Data Bagian operasional TPS (kode, nama, kelompok, lokasi antar fisik, catatan antar).
  - Modul kelola Data Mitra Vendor Katering (kode unik V001-V005, kontak WhatsApp, nomor telepon, status aktif).
- **Tahap 05 - Periode Catering & Master Shift**:
  - Kalender rotasi 5 vendor paten pada 3 shift kerja harian.
  - Dialog ganti vendor terjadwal dan ganti vendor darurat dengan alasan wajib via RPC `ganti_vendor_periode`.
  - Dialog kelola batas jam tiba dan urutan laporan shift (Shift 3 Malam, Shift 1 Pagi, Shift 2 Siang).
- **Tahap 06 - Input Data Catering 3 Shift**:
  - Grid katering 3 shift berdampingan dengan pelacakan sel kotor (*dirty cell tracking*).
  - Mekanisme simpan draf dan kunci status final via RPC `kirim_catering`.
- **Tahap 07 - Revisi, Verifikasi Data, & Riwayat**:
  - Pengajuan revisi kuota porsi pasca-final dengan selisih bertanda (+/-) dan alasan wajib.
  - Dialog verifikasi General Affairs untuk menyetujui atau membatalkan revisi.
  - Audit timeline kronologis per periode katering dari log append-only.
- **Tahap 08 - Portal Mandiri Mitra Vendor**:
  - Dashboard vendor dengan 4 kartu KPI dan panel pesanan 3 shift hari ini.
  - Antrean konfirmasi kesanggupan pesanan baru dan persetujuan revisi kuota.
  - Pelaporan progres pengiriman 5 tahap satu arah (*Menunggu -> Dipersiapkan -> Dikirim -> Sampai -> Selesai*).
  - Laci inspektor detail alokasi kuota per bagian dan titik lokasi antar fisik.
- **Tahap 08b - Hardening Keamanan & Penyelarasan Skema**:
  - Pengerasan Row Level Security (RLS) dan pencegahan eskalasi hak akses (*role escalation guard trigger*).
  - Isolasi vendor penuh pada level database (`public.my_vendor_id()`).
  - Penyelarasan kolom kontak vendor (`no_wa`, `no_telp`, `nama_kontak`, array alias).
- **Tahap 09 - Manajemen User & Pengaturan Akun**:
  - Route handler administratif privilese tinggi `/api/users` dengan verifikasi pemanggil aktif Admin GA.
  - Manajemen akun pengguna (tambah akun, ubah role/vendor, reset kata sandi, nonaktifkan akun).
  - Pengaturan profil mandiri dan footer versi rilis.
- **Tahap 10 - Dashboard Analitik Admin**:
  - RPC atomik `dashboard_ringkasan(p_dari, p_sampai)` sinkron dalam satu panggilan (maksimal 366 hari).
  - 5 KPI operasional terpadu dan 4 grafik performa (garis tren harian, donut SVG distribusi shift, batang alokasi bagian, batang utilisasi vendor).
  - Filter rentang waktu preset dan kalender rentang kustom dengan sinkronisasi URL dua arah.
- **Tahap 11 - Rekapitulasi & Ekspor Laporan (Excel & PDF)**:
  - Tabel matriks rekap harian terpaginasi (*server-side pagination*) dan ringkasan 4 dimensi.
  - Route handler `/api/ekspor/excel` menghasilkan spreadsheet Excel bergaris kisi tipis, kop resmi, dan formula dinamis via `exceljs`.
  - Route handler `/api/ekspor/pdf` menghasilkan dokumen PDF A4 Landscape ber-kop resmi via `jspdf`.
- **Tahap 12 - Impor Data Cerdas (Multi-Format & OCR)**:
  - Wizard impor 3 tahap (Unggah, Tinjau & Koreksi, Konfirmasi).
  - Parser aturan deterministik mandiri untuk XLSX, CSV, DOCX, dan PDF.
  - Ekstraksi OCR peramban web (*client-side web worker*) via `tesseract.js` untuk dokumen hasil pindai.
  - Editor tabel interaktif untuk review baris sebelum disimpan permanen.
  - RPC atomik `konfirmasi_impor` dengan audit logging.
- **Tahap 13 - Realtime & Notifikasi**:
  - Konfigurasi Supabase Realtime publication dengan `REPLICA IDENTITY FULL` pada tabel operasional.
  - Hook langganan `useRealtimeTable` dengan pembersihan saat unmount, reconnection handling, dan debounce 300ms.
  - Lonceng topbar interaktif dengan dropdown 10 notifikasi terbaru dan tautan ke halaman terkait.
  - Badge counter dinamis pada menu sidebar Verifikasi Data dan Ketersediaan.
  - Toast kejadian ringkas, senyap, dan dibatasi maksimal 3 toast bersamaan.
  - Pembaruan baris tabel in-place (*PeriodTable*, *VerifikasiView*, *KetersediaanQueue*, *ProgresWorkflowCard*, *PesananHariIniPanel*).
- **Tahap 14 - Poles, CI, Dokumentasi, & Deploy**:
  - Error boundary ramah (`src/app/error.tsx`, `src/app/admin/error.tsx`, `src/app/vendor/error.tsx`).
  - Halaman 404 (`src/app/not-found.tsx`) dan loading skeleton (`src/app/loading.tsx`).
  - Header keamanan web enterprise (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-XSS-Protection`).
  - Alur kerja otomatisasi CI GitHub Actions (`.github/workflows/ci.yml`) dan Dependabot (`.github/dependabot.yml`).
  - Dokumentasi lengkap di folder `docs/` (Instalasi, Arsitektur Teknis, Panduan Admin GA, Panduan Vendor, Skrip Demo).
  - Regenerasi berkas SQL terpadu `DATABASE_LENGKAP_CATERING.sql`.

#### Keamanan (Security)
- RLS teruji 100% membatasi hak baca dan tulis vendor hanya pada data miliknya sendiri.
- Service Role Key dan Gemini API Key terisolasi penuh di sisi server tanpa kebocoran ke bundel klien.
- Audit trail append-only pada tabel `order_logs` yang tidak dapat dimodifikasi atau dihapus oleh siapapun.
