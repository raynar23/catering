# Skrip Demo End-to-End
### Sistem Pengelolaan Data Catering Karyawan - PT Terminal Petikemas Surabaya (Pelindo TPS)

Skrip panduan ini dirancang untuk presentasi (*live demo*) di hadapan manajemen dan tim General Affairs PT Terminal Petikemas Surabaya untuk mendemonstrasikan keandalan alur kerja, kolaborasi dua peran secara realtime, dan otomatisasi pelaporan.

---

## 1. Persiapan Sesi Demo

Buka dua jendela peramban (*browser*) secara berdampingan di layar proyektor atau layar presentasi:
- **Jendela 1 (Kiri - Normal Window)**: Untuk peran **Admin General Affairs**.
  - Buka `http://localhost:3000/login`
  - Login dengan akun Admin GA (`admin`)
- **Jendela 2 (Kanan - Incognito / Private Window)**: Untuk peran **Mitra Vendor (Aisya Catering)**.
  - Buka `http://localhost:3000/login`
  - Login dengan akun Vendor (`vendor`)

---

## 2. Babak 1: Dashboard Operasional & Rotasi Jadwal Paten (Admin GA)

1. Tunjukkan halaman **Dashboard Admin** di Jendela Kiri:
   - Sorot 5 kartu KPI (Total porsi, rata-rata harian, jumlah revisi, revisi pending, periode belum input).
   - Tunjukkan 4 grafik performa (Tren harian, Donut SVG proporsi per shift, grafik alokasi bagian, dan beban kerja per vendor).
   - Tunjukkan filter kalender rentang cepat (*Hari Ini*, *30 Hari*, *Bulan Ini*) yang mengubah angka KPI dan grafik secara serentak tanpa inkonsistensi data.
2. Buka menu **Periode Catering**:
   - Tunjukkan jadwal rotasi 5 vendor (V001 - V005) pada 3 shift kerja harian.
   - Tunjukkan tombol **Ganti Vendor** untuk skenario kontingensi darurat (misal: dapur vendor utama mati listrik, dialihkan ke vendor rekanan dengan alasan tercatat).

---

## 3. Babak 2: Pengisian Kuota 3-Shift & Pengiriman Final (Admin GA)

1. Buka menu **Input Katering** di Jendela Kiri:
   - Pilih tanggal hari ini.
   - Tunjukkan 3 kolom shift kerja yang tersusun berdampingan: **Shift 3 (Malam)**, **Shift 1 (Pagi)**, dan **Shift 2 (Siang)**.
   - Ubah kuota porsi pada salah satu bagian (misalnya Bagian *Operasi Dermaga*).
   - Tunjukkan fitur **Dirty Cell Tracking** (sel yang diedit berubah warna secara visual).
2. Klik tombol **Simpan Draf**:
   - Tunjukkan bahwa data berhasil disimpan sementara tanpa mengganggu vendor.
3. Klik tombol **Kirim ke Vendor**:
   - Status periode terkunci menjadi **Final**.

---

## 4. Babak 3: Kolaborasi Realtime & Konfirmasi Kesanggupan (Vendor)

1. Perhatikan **Jendela Kanan (Vendor)** secara seketika tanpa perlu menekan tombol refresh (F5):
   - Notifikasi toast senyap muncul di sudut kanan bawah: *"Permintaan baru dari General Affairs"*.
   - Badge merah pada lonceng notifikasi atas bertambah secara live.
   - Angka counter pada menu sidebar **Ketersediaan** bertambah menjadi `(1)`.
2. Klik menu **Ketersediaan** di Jendela Kanan:
   - Tunjukkan pesanan baru yang baru saja dikirim oleh Admin GA.
   - Buka tombol **Lihat Rincian Bagian** untuk menunjukkan rincian bagian kerja dan lokasi antar fisik di dermaga TPS.
3. Klik tombol **Sanggupi Pesanan**:
   - Pesanan langsung berpindah dari antrean konfirmasi.
4. Perhatikan **Jendela Kiri (Admin GA)**:
   - Baris status vendor pada tabel periode admin langsung terperbarui menjadi **Disanggupi** secara realtime.

---

## 5. Babak 4: Pengajuan Revisi Pasca-Final & Verifikasi GA

1. Kembali ke **Jendela Kiri (Admin GA)**:
   - Pada tabel input katering atau daftar periode, simulasikan adanya penambahan karyawan lembur mendadak (misal: operasional kapal kontainer lembur).
   - Ajukan penambahan 15 porsi dengan alasan: *"Lembur darurat bongkar muat dermaga dermaga internasional"*.
2. Buka menu **Verifikasi Data**:
   - Tunjukkan pengajuan revisi yang baru saja dibuat berstatus **Menunggu**.
   - Buka dialog verifikasi, periksa selisih (+15), lalu klik **Setujui Revisi**.
3. Perhatikan **Jendela Kanan (Vendor)**:
   - Tab **Perubahan Revisi** di menu Ketersediaan langsung menerima data revisi yang disetujui GA.
   - Vendor memeriksa perubahan kuota dan menekan tombol **Sanggupi Revisi**.

---

## 6. Babak 5: Pelaporan Progres Pengiriman 5 Tahap (Vendor)

1. Di **Jendela Kanan (Vendor)**, buka menu **Progres Pengiriman**:
   - Tunjukkan stepper alur pengiriman 5 tahap (*Menunggu -> Dipersiapkan -> Dikirim -> Sampai -> Selesai*).
   - Klik tombol aksi untuk memajukan tahap dari **Menunggu** menjadi **Dipersiapkan**.
   - Klik kembali untuk memajukan ke **Dikirim** dengan catatan: *"Kurir berangkat dengan mobil boks nomor polisi L 1234 TP"*.
   - Majukan berturut-turut hingga tahap **Sampai** dan **Selesai**.
2. Di **Jendela Kiri (Admin GA)**:
   - Tunjukkan kolom *Progres Vendor* pada baris jadwal terkait otomatis berubah menjadi **Selesai** tanpa jeda dan tanpa refresh.

---

## 7. Babak 6: Rekapitulasi & Ekspor Laporan Excel / PDF (Admin GA)

1. Di **Jendela Kiri (Admin GA)**, buka menu **Rekapitulasi**:
   - Tunjukkan tab **Rekap Harian**: tabel matriks tanggal, shift, vendor, kolom per bagian aktif, dan total porsi terpaginasi secara rapi.
   - Tunjukkan tab **Ringkasan**: 4 tabel agregat per bagian, per shift, per vendor, dan per bulan.
2. Demonstrasikan **Ekspor Excel**:
   - Klik tombol **Ekspor Excel**.
   - Buka berkas `.xlsx` yang terunduh: perlihatkan kop resmi *"PT TERMINAL PETIKEMAS SURABAYA"*, garis kisi tipis seluruh sel, formula penjumlahan dinamis, dan blok tanda tangan resmi 3 pejabat GA.
3. Demonstrasikan **Ekspor PDF**:
   - Klik tombol **Ekspor PDF**.
   - Buka berkas `.pdf` yang terunduh: perlihatkan format dokumen A4 Landscape ber-kop resmi yang rapi dan siap cetak/arsip.

---

## 8. Babak 7: Demonstrasi Impor Data Cerdas (Admin GA)

1. Buka menu **Impor Data**:
   - Unggah berkas Excel jadwal rotasi atau seret berkas ke area dropzone.
   - Tunjukkan bahwa sistem secara otomatis mengidentifikasi tipe dokumen sebagai **Jadwal Periode & Rotasi Shift**.
   - Tunjukkan tabel editor interaktif: jika ada nama shift "siang", sistem otomatis mencocokkannya ke *Shift 1*.
   - Klik **Konfirmasi Simpan** untuk menunjukkan transaksi atomik berjalan sukses dan data baru langsung masuk ke jadwal periode.

---

## 9. Kesimpulan Demo

Tunjukkan kepada tim General Affairs Pelindo TPS bahwa sistem telah:
1. Menghilangkan proses pencatatan kuota katering manual di atas kertas/chat.
2. Mengamankan data dengan pembatasan hak akses ketat (vendor hanya melihat pesanan miliknya).
3. Mengotomatiskan pelaporan progres fisik pengiriman ke dermaga kerja secara transparan.
4. Menyediakan berkas rekapitulasi Excel dan PDF berstandar korporat dalam satu kali klik.
