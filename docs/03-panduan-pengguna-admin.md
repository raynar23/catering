# Panduan Pengguna: Admin General Affairs
### Sistem Pengelolaan Data Catering Karyawan - PT Terminal Petikemas Surabaya (Pelindo TPS)

Dokumen ini memuat panduan operasional langkah-demi-langkah bagi staf General Affairs (Admin GA) dalam mengelola siklus katering karyawan harian PT Terminal Petikemas Surabaya.

---

## 1. Masuk ke Sistem (Login)

1. Buka tautan aplikasi pada peramban web (misalnya `http://localhost:3000` atau URL deployment produksi).
2. Pada form login yang tampil di atas latar dermaga peti kemas resmi TPS:
   - Masukkan **Username**: `admin` (atau email `admin@tps.co.id`).
   - Masukkan **Password**: Masukkan kata sandi akun Admin GA yang diberikan administrator sistem.
3. Klik tombol **Masuk**. Sistem akan memverifikasi kredensial dan mengarahkan Anda ke Dashboard Operasional Admin GA.

---

## 2. Navigasi Antarmuka (AppShell)

- **Topbar**: Menampilkan tanggal hari ini dalam format bahasa Indonesia baku, lonceng notifikasi interaktif dengan badge counter merah realtime, serta kartu identitas staf yang aktif.
- **Sidebar**:
  - **Menu Utama**: Dashboard, Input Katering, Periode Katering, Verifikasi Data (dengan badge angka revisi pending), Rekapitulasi & Laporan.
  - **Master Data**: Data Bagian, Data Vendor, Impor Data, Manajemen User.
  - **Akun**: Pengaturan Akun, tombol Keluar.
- **Desain Zero-Page-Scroll**: Pada layar monitor desktop standar (1366x768, 1440x900, 1920x1080), antarmuka aplikasi pas dalam satu layar tanpa scrollbar halaman luar. Tabel beradaptasi dinamis mengisi ruang sisa vertikal.

---

## 3. Pengisian Data Katering 3 Shift (`/admin/input-catering`)

Modul ini digunakan untuk mengisi kebutuhan kuota katering harian per bagian kerja untuk 3 shift sekaligus secara berdampingan:

1. Pilih **Tanggal Katering** menggunakan pemilih tanggal di bagian atas.
2. Tiga kolom shift akan ditampilkan berdampingan: **Shift 3 (Malam)**, **Shift 1 (Pagi)**, dan **Shift 2 (Siang)**, lengkap dengan nama vendor yang bertugas menurut jadwal rotasi paten.
3. Masukkan kuota porsi pada sel masing-masing bagian kerja (rasio standar 1 karyawan = 1 porsi).
4. **Pelacakan Sel Kotor (*Dirty Cell Tracking*)**: Sel yang diubah nilainya akan ditandai dengan warna aksen lembut.
5. Klik **Simpan Draf** untuk menyimpan perubahan sementara ke basis data tanpa mengirimkan ke vendor.
6. Setelah seluruh bagian terisi lengkap, klik tombol **Kirim ke Vendor**. Status periode akan dikunci menjadi **Final** dan pesanan seketika terkirim ke portal vendor mitra secara realtime.

---

## 4. Manajemen Jadwal Periode & Rotasi Vendor (`/admin/periode`)

1. Menampilkan seluruh jadwal rotasi vendor per tanggal dan shift kerja.
2. Filter baris berdasarkan Bulan, Tahun, Shift, Vendor, dan Status pesanan.
3. **Ganti Vendor Terjadwal / Darurat**:
   - Jika vendor mitra berhalangan atau terjadi kendala operasional darurat, klik tombol **Ganti Vendor** pada baris periode terkait.
   - Pilih vendor pengganti dari daftar mitra aktif (V001 - V005).
   - Masukkan alasan penggantian vendor (wajib diisi).
   - Klik **Konfirmasi Pergantian**. Sistem akan memperbarui penanggung jawab dan mencatat kejadian pada log audit.

---

## 5. Verifikasi Perubahan Kuota & Respons Vendor (`/admin/verifikasi`)

1. Halaman ini memiliki dua tab kerja:
   - **Tab Pengajuan Revisi**: Menampilkan daftar permintaan penambahan atau pengurangan porsi pasca-final yang membutuhkan persetujuan General Affairs.
   - **Tab Respons Vendor**: Menampilkan peringatan tindak lanjut jika ada vendor yang menyatakan ketidaksanggupan atas pesanan.
2. Memproses Revisi Porsi:
   - Klik baris pengajuan revisi untuk membuka dialog verifikasi.
   - Periksa porsi awal, porsi baru, selisih bertanda (+/-), dan alasan pengajuan.
   - Klik **Setujui Revisi** untuk mengesahkan perubahan kuota (otomatis diteruskan ke vendor mitra secara realtime).
   - Klik **Batalkan Revisi** jika permohonan ditolak (catatan verifikator wajib dicantumkan).

---

## 6. Dashboard Analitik Katering (`/admin/dashboard`)

1. **Rentang Waktu**: Pilih filter preset cepat (Hari Ini, 7 Hari Terakhir, 30 Hari, Bulan Ini, 3 Bulan, 1 Tahun) atau tentukan kalender rentang kustom.
2. **5 Kartu Indikator KPI**:
   - Total Porsi Terdistribusi.
   - Rata-rata Porsi per Hari.
   - Jumlah Pengajuan Revisi.
   - Revisi Menunggu Verifikasi.
   - Periode Belum Diinput (Hari Ini & Besok).
3. **4 Grafik Performa Operasional**:
   - Tren Konsumsi Porsi Harian (Grafik Garis).
   - Proporsi Kebutuhan per Shift Kerja (Donut SVG).
   - Alokasi Porsi per Bagian Kerja (Grafik Batang Horisontal).
   - Beban Kerja per Mitra Vendor Katering (Grafik Batang).

---

## 7. Rekapitulasi & Ekspor Laporan Terpadu (`/admin/rekapitulasi`)

1. **Rekap Harian**: Menampilkan matriks porsi per bagian aktif dan per shift kerja secara terpaginasi (*server-side pagination*) lengkap dengan baris total periode di bagian bawah tabel.
2. **Ringkasan Multi-Dimensi**: Menampilkan 4 tabel ringkasan agregat:
   - Ringkasan Konsumsi per Bagian Kerja.
   - Distribusi per Shift Operasional.
   - Utilisasi per Mitra Vendor Katering.
   - Agregasi Tren Bulanan.
3. **Ekspor Spreadsheet Excel (.xlsx)**:
   - Klik tombol **Ekspor Excel**.
   - Masukkan catatan opsional (misalnya: "Untuk Lampiran Berita Acara GA").
   - Sistem menghasilkan berkas Excel bergaris kisi tipis, ber-kop "PT TERMINAL PETIKEMAS SURABAYA", blok tanda tangan resmi 3 pejabat, dan formula penjumlahan otomatis.
4. **Ekspor Dokumen PDF (.pdf)**:
   - Klik tombol **Ekspor PDF**.
   - Sistem menghasilkan dokumen PDF A4 Landscape ber-kop resmi Pelindo TPS dengan tata letak rapi siap cetak.

---

## 8. Modul Impor Data Cerdas (`/admin/impor-data`)

1. **Tahap 1: Unggah Dokumen**:
   - Tarik dan lepas berkas dokumen (.xlsx, .csv, .docx, atau .pdf) ke area dropzone, atau klik untuk memilih berkas dari komputer Anda (maksimal 10 MB).
   - Untuk dokumen PDF hasil pindai atau foto jadwal, centang opsi **Jalankan OCR Pindaian**.
2. **Tahap 2: Tinjau dan Koreksi Data**:
   - Sistem secara otomatis mendeteksi kategori dokumen (Jadwal, Vendor, Bagian, atau Rekap Harian).
   - Matriks data ditampilkan dalam tabel editor interaktif.
   - Baris berstatus `perlu_cek` atau `error` dapat Anda klik dan edit langsung nilai teksnya di tabel.
3. **Tahap 3: Konfirmasi Penyimpanan**:
   - Tinjau ringkasan baris valid, baru, dan koreksi.
   - Klik **Konfirmasi Simpan**. Seluruh data akan ditulis secara atomik ke basis data melalui stored procedure `konfirmasi_impor`.

---

## 9. Manajemen Pengguna & Pengaturan Profil

- **Manajemen User (`/admin/manajemen-user`)**:
  - Menampilkan daftar akun Admin GA dan perwakilan Vendor.
  - Tambah Akun Baru: Masukkan nama lengkap, username unik, peran, mitra vendor terkait, dan kata sandi awal.
  - Reset Kata Sandi: Mengatur ulang kata sandi pengguna jika lupa.
  - Nonaktifkan Akun: Menghentikan akses akun yang sudah tidak aktif bekerja di TPS tanpa menghapus riwayat auditnya.
- **Pengaturan Profil (`/admin/pengaturan`)**:
  - Mengubah nama tampilan pribadi dan memperbarui kata sandi mandiri.
  - Memeriksa versi rilis aplikasi pada bagian footer.
