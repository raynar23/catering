# Dokumen Handover & Ringkasan Pengerjaan Proyek Catering TPS
### Sistem Pengelolaan Data Catering Karyawan - PT Terminal Petikemas Surabaya
*Pembaruan Terakhir: 22 Oktober 2026 (Tahap 13 - Realtime dan Notifikasi)*

---

## 1. Ikhtisar Sistem & Kredensial Akses

Sistem ini dibangun untuk mendigitalkan dan mengotomatiskan alur kerja pemesanan katering harian 3-shift di lingkungan PT Terminal Petikemas Surabaya (Pelindo TPS), mencakup pencatatan kuota porsi, distribusi pesanan ke vendor mitra, pengajuan revisi pasca-final, verifikasi General Affairs, hingga pelaporan progres pengiriman secara real-time.

### Akun Uji Coba Resmi (Tersedia di Database)

| Peran (Role) | Username / Email | Password | Keterangan & Akses |
| :--- | :--- | :--- | :--- |
| `admin_ga` | `admin@tps.co.id` (atau `admin`) | `gatps2026` | Akses penuh seluruh master data, input 3-shift, jadwal rotasi, verifikasi revisi, ganti vendor, dashboard analitik, rekapitulasi, impor data cerdas, ekspor Excel & PDF, dan audit timeline. |
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
   - `import_batches`: Penampung riwayat impor data dokumen katering (`data_parsed`, `ringkasan`, `jenis_dokumen`, `mesin`, `status`).

3. **High-Performance Database Views**:
   - `v_rekap`: View sumber kebenaran data konsumsi porsi yang hanya menyaring data pesanan berlaku (`order_status in ('final', 'revisi')`), menjamin data draft dan pesanan batal tidak ikut terhitung ke KPI, grafik, rekap, maupun berkas ekspor.
   - `v_periode_ringkas`: View ringkasan periode yang menggabungkan total karyawan, total porsi, jumlah revisi pending, nama vendor, dan nama shift dalam satu baris untuk menghindari masalah N+1 query.
   - `v_rekap_bulanan`: View agregasi bulanan untuk laporan keuangan dan rekapitulasi konsumsi per vendor.
   - `v_utilisasi_shift`: View monitoring beban kerja dan utilisasi katering per shift kerja.

4. **Stored Procedures & RPC Berkeamanan Tinggi (`security definer` & `security invoker`)**:
   - `konfirmasi_impor(p_batch_id, p_baris, p_opsi)`: Prosedur transaksi tunggal Admin GA untuk validasi server, sinkronisasi `periods.vendor_id` dan `catering_orders.vendor_id`, pembuatan vendor otomatis opsional, proteksi overwrite status non-draft, audit logging ke `order_logs`, dan finalisasi status batch impor.
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
- [supabase/migrations/015_konfirmasi_impor.sql](supabase/migrations/015_konfirmasi_impor.sql)
- [supabase/tests/06_konfirmasi_impor.sql](supabase/tests/06_konfirmasi_impor.sql)

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

## 5. Modul Impor Data Cerdas (Tahap 12)

Modul Impor Data Cerdas (`/admin/impor-data`) memungkinkan Admin GA mengekstrak jadwal katering, master vendor, data bagian, dan rekapitulasi porsi harian dari berkas eksternal tanpa bergantung pada AI secara bawaan.

### A. Arsitektur Parser Aturan & Mesin Deterministik
1. **Ekstraksi Berkas Multi-Format**:
   - `xlsx` & `csv` ([xlsx.ts](src/lib/import/extract/xlsx.ts)): Menggunakan `exceljs` untuk mengekstrak nilai sel terkomputasi (bukan rumus), memetakan sel gabungan (*merged cells*) agar tanggal berlaku merata ke tiga baris shift, dan membatasi dekompresi maksimal 5.000 baris.
   - `docx` ([docx.ts](src/lib/import/extract/docx.ts)): Menggunakan `mammoth` untuk mengekstrak tabel dan paragraf terstruktur.
   - `pdf` ([pdf.ts](src/lib/import/extract/pdf.ts)): Menggunakan `pdfjs-dist` untuk mengekstrak lapisan teks berdasarkan koordinat spasial baris/kolom. Jika lapisan teks kosong (berkas pindaian), sistem secara otomatis menandai kebutuhan OCR.
   - `ocr` ([ocr.ts](src/lib/import/extract/ocr.ts)): Menggunakan `tesseract.js` Web Worker di browser dengan bahasa Indonesia (`ind`) disertai pelaporan progres persentase (0–100%). Menjaga berkas fisik tetap di sisi klien tanpa membebani batas waktu komputasi server. Seluruh baris hasil OCR selalu ditandai dengan status `perlu_cek`.

2. **Deteksi Cerdas Jenis Dokumen** ([detect.ts](src/lib/import/detect.ts)):
   - Mendeteksi jenis dokumen (`jadwal`, `vendor`, `bagian`, `rekap_harian`) secara otomatis dari sinonim header dan frekuensi kata kunci dengan skor keyakinan (*confidence score* 0.0 - 1.0).
   - Pengguna tetap dapat memaksa jenis dokumen secara manual melalui dropdown pilihan.

3. **Normalisasi, Pencocokan Fuzzy, & Validasi Aturan Domain**:
   - `match.ts`: Membersihkan spasi ganda dan karakter tak terlihat (contoh: `"Nikmat Rasa  "` dan `"Adhi Hidayah  "` otomatis dibersihkan dan disatukan ke vendor master).
   - Pencocokan nama vendor menggunakan jarak Levenshtein (kemiripan fuzzy > 75% ditandai `perlu_cek`, vendor tidak dikenal ditandai `baru`).
   - `validate.ts`: Memvalidasi kelengkapan 3 shift per tanggal (Siang, Sore, Malam), mendeteksi celah urutan kalender atau duplikasi shift pada hari yang sama.
   - Kesesuaian rotasi vendor diperiksa terhadap algoritma paten `src/lib/jadwal/rotasi.ts`: ketidaksesuaian penugasan katering hanya diberikan peringatan `perlu_cek` (bukan error kritis), karena penugasan operasional di lapangan dapat mengalami penyesuaian.

4. **AI Fallback Opsional (Google Gemini)** ([gemini.ts](src/lib/import/ai/gemini.ts)):
   - Nonaktif secara bawaan di belakang flag `IMPORT_AI_ENABLED=false`.
   - Tombol "Coba dengan AI" hanya muncul jika flag aktif dan keyakinan parser aturan rendah.
   - Wajib melalui dialog persetujuan ([AiConsentDialog.tsx](src/components/import/AiConsentDialog.tsx)) per dokumen sebelum data dikirim ke API Gemini.
   - Menggunakan model stabil dari `GEMINI_MODEL`, `temperature: 0`, dan `responseMimeType: "application/json"`. Isi dokumen diperlakukan murni sebagai data tanpa pernah dicatat ke log server.

### B. Alur Antarmuka Wizard 3 Langkah
1. **`1 Unggah`** ([UploadDropzone.tsx](src/components/import/UploadDropzone.tsx)):
   - Area tarik-lepas berkas dengan validasi ukuran maksimal 10 MB dan pemeriksaan tanda tangan berkas (*magic number*).
   - Pemilih jenis dokumen dan indikator badge mesin pemroses ("Mesin: Aturan", "Mesin: OCR", atau "Mesin: AI").
   - Progress bar pindaian OCR interaktif saat memproses berkas gambar/pindaian.
2. **`2 Periksa`** ([EditablePreviewTable.tsx](src/components/import/EditablePreviewTable.tsx)):
   - Strip indikator status: Total Baris, Cocok (hijau), Baru (biru), Perlu Dicek (kuning), Error (merah).
   - Filter status baris dan panel perbandingan perubahan terhadap database (Baru, Diubah, Sama).
   - Sel-sel DataTable dapat diedit langsung (tanggal, shift, vendor). Tombol Tambah Baris dan Hapus Baris terpilih.
   - Opsi konfirmasi: "Buat vendor baru otomatis" dan "Timpa periode yang sudah terisi" (default nonaktif).
   - Tombol Lanjut ke Konfirmasi terkunci secara otomatis selama masih ada baris berstatus `error`.
3. **`3 Konfirmasi`** ([ConfirmationPanel.tsx](src/components/import/ConfirmationPanel.tsx)):
   - Kartu ringkasan perubahan sebelum disimpan ke sistem.
   - Eksekusi transaksi atomik via RPC `konfirmasi_impor`.
   - Banner sukses dengan tautan instan ke `/admin/periode` dan `/admin/vendor`.

### C. Skrip Verifikasi Mandiri CLI
Tersedia skrip lokal untuk menguji dan memverifikasi berkas jadwal katering client tanpa menyentuh UI:
```bash
npm run import:check -- <jalur-berkas>
```
Skrip membaca berkas dari `data-real/` (di-gitignore) atau fixture sintetis, mencetak jumlah baris, rentang hari, daftar vendor unik, dan anomali, serta memastikan kriteria terpenuhi: **276 baris (92 hari x 3 shift), tepat 5 vendor tanpa duplikasi spasi, tanpa celah tanggal**.

---

## 6. Modul Realtime & Notifikasi (Tahap 13)

### A. Konfigurasi Publikasi Supabase Realtime & Isolasi RLS
1. **Publikasi Tabel**:
   - Menambahkan tabel `periods`, `catering_orders`, `revisions`, dan `order_logs` ke publikasi bawaan `supabase_realtime` via migrasi [supabase/migrations/016_realtime_setup.sql](supabase/migrations/016_realtime_setup.sql).
   - Mengatur `REPLICA IDENTITY FULL` pada seluruh tabel terkait agar event `UPDATE` menyertakan data rekaman lengkap (`old` dan `new`), mencegah payload null pada event update.
2. **Isolasi RLS Teruji**:
   - Supabase Realtime sepenuhnya mematuhi RLS PostgreSQL yang telah diperketat pada Tahap 08b (`is_admin()` dan `my_vendor_id()`).
   - Vendor A hanya menerima broadcast WebSocket untuk pesanan dan revisi miliknya sendiri; Vendor A tidak pernah menerima event milik Vendor B.
   - Telah dibuktikan dan diverifikasi via tes isolasi SQL di [supabase/tests/07_realtime_isolation.sql](supabase/tests/07_realtime_isolation.sql).

### B. Hook `useRealtimeTable`
- Disediakan hook reusable [useRealtimeTable.ts](src/lib/realtime/useRealtimeTable.ts) dengan fitur:
  - Pembersihan (*cleanup*) otomatis channel WebSocket saat komponen unmount untuk mencegah kebocoran langganan saat navigasi antar-halaman.
  - Penanganan koneksi putus dan sambung ulang (*reconnection handling*): memicu callback `onReconnect` untuk memuat ulang data segar dari server saat koneksi pulih dari gangguan jaringan.
  - Mekanisme *debounce* (bawaan 300ms) untuk mencegah rendering berulang berlebih saat terjadi rentetan event database secara simultan.

### C. Lonceng Notifikasi Topbar & Angka Sidebar
1. **Lonceng Topbar & Dropdown**:
   - Mengambil data melalui RPC `get_notifikasi()` yang telah ditingkatkan:
     - Admin GA: menampilkan revisi menunggu verifikasi, pesanan yang ditolak mitra vendor, dan respons kesanggupan baru.
     - Vendor: menampilkan permintaan pesanan baru dan revisi yang belum direspons.
   - Badge angka kecil di sudut lonceng diperbarui secara real-time saat event tiba.
   - Dropdown lonceng menampilkan hingga 10 item notifikasi terbaru dengan teks format informatif dan tautan langsung ke halaman kerja terkait (`/admin/verifikasi`, `/vendor/ketersediaan`, `/vendor/permintaan`).
2. **Badge Sidebar Dinamis**:
   - Menu **Verifikasi Data** pada sidebar Admin GA menampilkan badge merah berisi jumlah revisi pending secara langsung.
   - Menu **Ketersediaan** pada sidebar Vendor menampilkan badge merah berisi jumlah pesanan/revisi yang belum direspons secara langsung.

### D. Toast Ringkas & Tanpa Suara
- Notifikasi toast otomatis muncul seketika saat event penting diterima:
  - *"Permintaan Baru dari GA"* saat admin mengirim jadwal pesanan ke vendor.
  - *"Vendor Menyanggupi Pesanan"* atau *"Vendor Berhalangan"* saat mitra merespons.
  - *"Revisi Porsi Baru"* saat revisi diajukan atau diverifikasi.
- Toast bersifat senyap (tanpa audio yang mengganggu), ringkas, dan dibatasi maksimal 3 toast bersamaan (`prev.slice(-2)`) untuk menghindari penumpukan visual.

### E. Pembaruan Baris Tabel Secara Langsung (In-Place Updates)
- Tabel operasional utama memperbarui baris terkait secara *in-place* saat event database diterima tanpa mereset paginasi, filter pencarian, maupun posisi scroll pengguna:
  1. **Periode Catering** (`/admin/periode` -> [PeriodTable.tsx](src/components/admin/PeriodTable.tsx)): Memperbarui status pesanan, respons vendor, progres vendor, dan vendor penanggung jawab seketika.
  2. **Verifikasi Data** (`/admin/verifikasi` -> [VerifikasiView.tsx](src/components/verifikasi/VerifikasiView.tsx)): Memperbarui status persetujuan revisi dan antrean penolakan vendor seketika.
  3. **Ketersediaan** (`/vendor/ketersediaan` -> [KetersediaanQueue.tsx](src/components/vendor/KetersediaanQueue.tsx)): Menghapus pesanan/revisi yang telah direspons dan memuat permintaan baru tanpa mengubah tab aktif.
  4. **Progres Pengiriman** (`/vendor/progres` -> [ProgresWorkflowCard.tsx](src/components/vendor/ProgresWorkflowCard.tsx)): Memajukan tahapan pengiriman pesanan secara live.
  5. **Panel Dashboard Vendor** (`/vendor/dashboard` -> [PesananHariIniPanel.tsx](src/components/vendor/PesananHariIniPanel.tsx)): Memperbarui status respon dan progres 3-shift hari ini secara live.

---

## 7. Struktur Rute Halaman Aplikasi

| Rute URL | Pengguna | Fungsi & Fitur Utama |
| :--- | :--- | :--- |
| `/login` | Publik | Halaman masuk dengan normalisasi username, background dermaga TPS, dan kartu form bebas pergeseran layout. |
| `/admin/dashboard` | Admin GA | Dashboard analitik katering, 5 KPI tanpa ikon, 4 grafik performa operasional, filter periode, dan sinkron URL. |
| `/admin/rekapitulasi` | Admin GA | Rekapitulasi porsi per bagian & shift, ringkasan 4 dimensi, filter multi-dimensi, dan modal ekspor Excel/PDF. |
| `/admin/laporan` | Admin GA | Rute alias resmi yang otomatis mengarahkan ke modul rekapitulasi dan ekspor terpadu. |
| `/admin/impor-data` | Admin GA | Wizard impor cerdas 3-tahap (Unggah, Periksa, Konfirmasi) dengan editor tabel dan OCR browser. |
| `/admin/input-catering` | Admin GA | Grid harian 3 shift berdampingan (Shift 3, 1, 2), pelacakan sel kotor, tombol kirim ke vendor. |
| `/admin/periode` | Admin GA | Manajemen jadwal periode, filter multi-dimensi, tombol ganti vendor, dan pembaruan baris realtime. |
| `/admin/verifikasi` | Admin GA | Verifikasi perubahan kuota (revisi) dan respons penolakan vendor dengan badge dinamis & pembaruan realtime. |
| `/admin/riwayat/[periodId]` | Admin GA | Kronologi audit timeline lengkap per periode katering dari log append-only. |
| `/admin/data-bagian` | Admin GA | Master data bagian operasional, kelompok, lokasi antar fisik, dan catatan antar. |
| `/admin/data-vendor` | Admin GA | Master data mitra katering (V001 - V005), kontak WhatsApp, dan PIC vendor. |
| `/admin/manajemen-user` | Admin GA | Pengelolaan akun pengguna, strip metrik, dialog tambah/ubah, reset password, nonaktifkan akun. |
| `/admin/pengaturan` | Admin GA | Pengaturan profil pribadi Admin GA, ganti kata sandi, dan footer versi sistem dari package manifest. |
| `/vendor/dashboard` | Vendor | 4 Kartu KPI, panel pesanan 3 shift hari ini, dan aksi cepat konfirmasi pesanan dengan pembaruan realtime. |
| `/vendor/permintaan` | Vendor | Tabel pesanan final milik vendor dan drawer inspektor detail alokasi per bagian & lokasi antar. |
| `/vendor/ketersediaan` | Vendor | Antrean pesanan dan revisi yang belum direspons dengan badge counter sidebar live dan pembaruan realtime. |
| `/vendor/progres` | Vendor | Pelaporan progres pengiriman 5 tahap satu arah dengan pembaruan stepper timeline realtime. |
| `/vendor/riwayat` | Vendor | Arsip riwayat pesanan katering vendor dengan filter status dan rentang tanggal. |
| `/vendor/pengaturan` | Vendor | Pengaturan profil perwakilan vendor, ganti kata sandi, dan footer versi sistem. |
| `/api/impor/analisis` | Admin GA | Route handler server pemrosesan berkas impor in-memory, validasi magic bytes, batas 10 MB, dan rate limit. |
| `/api/impor/konfirmasi` | Admin GA | Route handler server pemanggilan RPC konfirmasi_impor transaksi tunggal dengan opsi overwrite. |
| `/api/ekspor/excel` | Admin GA | Route handler server pengunduhan berkas rekapitulasi format spreadsheet Excel (.xlsx). |
| `/api/ekspor/pdf` | Admin GA | Route handler server pengunduhan dokumen laporan resmi format PDF (.pdf). |

---

## 8. Ringkasan Pengujian, Kualitas, & Status Git

1. **Pengujian Unit (Vitest)**:
   - 32 berkas pengujian: `32 passed`.
   - 163 pengujian fungsional: `163 passed`.
   - Menguji: pemetaan pesan realtime notification dengan pengujian isolasi role & vendor ([notification-mapper.test.ts](src/lib/realtime/notification-mapper.test.ts)), extractor xlsx (sel gabungan & formula tersimpan), docx (tabel & paragraf), pdf (lapisan teks & OCR fallback), ocr runner, validasi magic number, normalisasi string & pencocokan fuzzy vendor/shift/bagian, validasi domain jadwal & rotasi, deteksi otomatis jenis dokumen, parser jadwal, vendor, bagian, dan rekap-harian, matematika rekap, model sel Excel, konsistensi metrik dashboard, rotasi vendor, route guard, user guard, reducer sel kotor, progres vendor, dan skema form Zod.
2. **Kompilasi TypeScript**:
   - `npx tsc --noEmit` lulus dengan 0 kesalahan.
3. **Build Produksi Next.js**:
   - `next build` berhasil mengompilasi 34 rute (termasuk modul impor data cerdas dan API route pendukung) tanpa kendala.
   - Seluruh variabel lingkungan sensitif terjaga aman di sisi server.
4. **Repositori Git**:
   - Seluruh tahapan telah di-commit secara terstruktur mengikuti Conventional Commits pada cabang `feat/13-realtime-notifikasi` dan siap digabungkan ke cabang utama `main`.
   - Identitas commit terkonfigurasi pada: `Muhammad Raynar Hammam <raynarham23@gmail.com>`.

