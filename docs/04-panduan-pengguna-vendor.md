# Panduan Pengguna: Mitra Vendor Katering
### Sistem Pengelolaan Data Catering Karyawan - PT Terminal Petikemas Surabaya (Pelindo TPS)

Dokumen ini memuat panduan operasional mandiri bagi perwakilan mitra katering (Vendor) dalam menerima pesanan, mengonfirmasi kesanggupan, menyetujui revisi porsi, dan melaporkan progres tahapan pengantaran katering ke terminal kerja TPS.

---

## 1. Masuk ke Portal Vendor

1. Buka tautan sistem katering pada peramban web (misalnya `http://localhost:3000/login`).
2. Masukkan kredensial akun vendor Anda:
   - **Username**: `vendor` (atau email terdaftar vendor Anda, contoh: `vendor@tps.co.id`).
   - **Password**: `vendortps2026`.
3. Klik tombol **Masuk**. Sistem akan secara otomatis mengarahkan Anda ke portal mandiri vendor Anda.

---

## 2. Dashboard Operasional Vendor (`/vendor/dashboard`)

1. **4 Kartu Indikator KPI Vendor**:
   - **Permintaan Hari Ini (Porsi)**: Total akumulasi porsi yang harus disiapkan vendor untuk hari ini.
   - **Menunggu Respon**: Jumlah pesanan atau revisi yang belum dikonfirmasi.
   - **Sedang Diproses**: Pesanan yang sedang dalam tahap persiapan atau pengantaran.
   - **Selesai Bulan Ini**: Total pesanan katering yang telah tuntas diantar pada bulan berjalan.
2. **Panel Pesanan 3-Shift Hari Ini**:
   - Menampilkan kartu ringkasan untuk **Shift 3 (Malam)**, **Shift 1 (Pagi)**, dan **Shift 2 (Siang)**.
   - Menampilkan batas jam tiba di terminal TPS dan total porsi yang dibutuhkan.
   - Tombol **Lihat Rincian Bagian** untuk melihat alokasi detail kuota dan titik lokasi antar fisik di dermaga TPS.
   - Tombol aksi cepat **Sanggup** atau **Tidak Sanggup**.

---

## 3. Antrean Ketersediaan (`/vendor/ketersediaan`)

Halaman ini berfungsi sebagai kotak masuk (*inbox*) utama vendor untuk menanggapi permintaan katering dari Admin General Affairs. Jika ada permintaan baru, angka counter pada menu sidebar **Ketersediaan** akan bertambah secara realtime:

1. **Tab Permintaan Baru**:
   - Menampilkan daftar pesanan katering yang baru dikirim oleh Admin GA.
   - Memeriksa tanggal, shift, total porsi, dan batas waktu tiba.
   - **Sanggupi Pesanan**: Klik tombol hijau **Sanggupi Pesanan**. Pesanan seketika berstatus disanggupi dan masuk ke alur progres pengiriman.
   - **Tidak Sanggup**: Jika kapasitas dapur atau logistik tidak memungkinkan, klik tombol merah **Tidak Sanggup**. Masukkan catatan alasan ketidaksanggupan (wajib diisi agar Admin GA dapat segera menunjuk vendor pengganti).
2. **Tab Perubahan Revisi**:
   - Menampilkan permintaan perubahan porsi dari General Affairs pasca status final.
   - Menampilkan kuota awal, kuota baru, selisih porsi (+/-), lokasi antar, dan alasan dari Admin GA.
   - Klik **Sanggupi Revisi** jika penambahan/pengurangan dapat diakomodasi.
   - Klik **Tidak Sanggup** jika kuota revisi mendadak tidak dapat dipenuhi (wajib menyertakan alasan).

---

## 4. Pelaporan Progres Pengiriman 5 Tahap (`/vendor/progres`)

Sistem mengadopsi alur pelaporan progres satu arah (*one-way stepper*) agar Admin GA dan manajemen Pelindo TPS dapat memantau pergerakan katering secara transparan:

```
[1. Menunggu] -> [2. Dipersiapkan] -> [3. Dikirim] -> [4. Sampai] -> [5. Selesai]
```

Langkah memperbarui status pengantaran:
1. Masuk ke menu **Progres Pengiriman**.
2. Cari kartu pesanan shift yang sedang berjalan.
3. Klik tombol biru di kanan kartu untuk memajukan tahap berikutnya:
   - Dari **Menunggu** ke **Dipersiapkan**: Saat katering mulai dimasak di dapur vendor.
   - Dari **Dipersiapkan** ke **Dikirim**: Saat kurir/armada vendor mulai berangkat mengantar katering menuju area pelabuhan TPS.
   - Dari **Dikirim** ke **Sampai**: Saat kendaraan vendor telah tiba di gerbang terminal TPS.
   - Dari **Sampai** ke **Selesai**: Saat seluruh boks katering telah didistribusikan ke masing-masing lokasi bagian kerja penerima.
4. Pada dialog konfirmasi yang muncul, Anda dapat menyertakan catatan tambahan (opsional) lalu klik **Konfirmasi Majukan Progres**.
5. Status pada dashboard Admin GA akan otomatis terperbarui secara realtime tanpa perlu konfirmasi manual lewat telepon atau chat.

---

## 5. Permintaan Katering & Rincian Lokasi Antar (`/vendor/permintaan`)

1. Menampilkan seluruh daftar pesanan katering milik vendor Anda yang telah berstatus final.
2. Gunakan kolom pencarian untuk menyaring berdasarkan tanggal, nama shift, atau nama bagian.
3. Klik tombol **Lihat Rincian**:
   - Membuka laci inspektor (*drawer*) di sebelah kanan layar.
   - Menampilkan daftar lengkap seluruh bagian penerima katering.
   - Menampilkan **Lokasi Antar Fisik** (contoh: *Gedung Administrasi Lt. 2*, *Workshop Alat Berat*, *Pos Dermaga Petikemas*) dan catatan khusus pengantaran dari General Affairs.

---

## 6. Arsip Riwayat Pesanan & Pengaturan Akun

- **Riwayat Pesanan (`/vendor/riwayat`)**:
  - Arsip seluruh pesanan katering yang telah selesai maupun dibatalkan di masa lampau.
  - Memudahkan vendor dalam mencocokkan data tagihan (*invoice*) bulanan dengan catatan konsumsi resmi General Affairs Pelindo TPS.
- **Pengaturan Profil (`/vendor/pengaturan`)**:
  - Memperbarui nama kontak perwakilan vendor dan nomor telepon operasional.
  - Mengubah kata sandi akun portal vendor secara berkala untuk menjaga keamanan data.
