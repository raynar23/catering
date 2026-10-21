# PRD - Sistem Pengelolaan Data Catering Karyawan

## Tujuan
Website internal PT Terminal Petikemas Surabaya untuk General Affairs (GA) mengelola catering (nasi kotak) karyawan shift: jadwal vendor per shift, update jumlah harian per bagian, revisi, konfirmasi vendor, rekapitulasi, dan laporan berformat Excel/PDF. Vendor catering memiliki portal sendiri untuk menerima permintaan, menyatakan ketersediaan, dan melaporkan progres. Dapat diakses publik (Vercel) untuk demo.

## Sumber Acuan dan Prioritas
1. Penjelasan developer dan hasil wawancara client (Oktober 2026) menang atas semua dokumen lain.
2. PDF rancangan fitur: sumber alur dan aturan bisnis.
3. Mockup 9 halaman: hasil generate AI, HANYA acuan tata letak dan gaya.
4. Excel client (`Jadwal_Catering_TPS_Tahun_2026.xlsx`, `Rekap_Nasi_Kotak_Bulan_Oktober.xlsx`, `20102026_Update_nasi_kotak_.xlsx`): acuan data nyata dan format laporan. Berkas ini berada di `agent/referensi/` dan TIDAK boleh di-commit.
Angka pada PDF dan mockup adalah simulasi.

## Pengguna (2 role)
| Role | Keterangan |
|---|---|
| `admin_ga` (Admin GA) | Dipakai bersama oleh sekitar 3 PIC GA (gudang CFS, mekanik, operator). Semua fitur admin. Tidak ada pembatasan per bagian |
| `vendor` | Satu akun terhubung ke tepat satu vendor. Hanya melihat dan mengubah data vendornya sendiri. Demo: 2 akun vendor, produksi: 1 akun per vendor (5) |

Tidak ada pendaftaran mandiri. Akun dibuat Admin GA (Manajemen User) atau seed.

## Konsep Inti (berdasarkan data client)
- **Jadwal vendor**: setiap tanggal punya 3 shift dan tiap shift tepat satu vendor. Lima vendor berotasi tetap (rotasi bergilir tiap shift). Penugasan bersifat patent, jarang diganti.
- **Shift** (dari Excel client): Shift 1 08.00-16.00 (Siang, wajib tiba 10.00), Shift 2 16.00-24.00 (Sore, wajib tiba 17.00), Shift 3 00.00-08.00 (Malam, wajib tiba 01.00). Urutan kolom pada laporan client: Shift 3, Shift 1, Shift 2. Semua shift milik tanggal kalender yang sama. Jam adalah data master yang dapat diubah.
- **Bagian** (lima, dari Excel client, urutan laporan): Area Gudang CFS, RTG Operator, CC Operator, Mekanik RTG, Mekanik CC. Tiap bagian punya kelompok (grup pada laporan: Pos Security, Ruang RTG, Ruang CBO, Tambahan PT PDS), lokasi antar, dan alias nama agar mudah dikenali importer.
- **Periode** = satu slot tanggal + shift + vendor. Periode adalah unit kerja: menyimpan status, jumlah per bagian, respons vendor, dan progres.
- Pengguna GA biasanya mengisi data untuk besok (jumlah karyawan masuk per bagian).

## Alur Utama
1. Admin GA menyiapkan master (bagian, vendor, shift) dan jadwal Periode, secara manual atau lewat Impor Data.
2. Pada Input Data Catering, PIC memilih tanggal (default besok), mengisi jumlah per bagian untuk tiap shift, lalu Simpan Draft. Beberapa PIC dapat mengisi baris berbeda pada periode yang sama.
3. Jika semua bagian aktif terisi, Admin GA menekan Kirim ke Vendor. Periode menjadi **Final** dan muncul di portal vendor.
4. Vendor menyatakan Menyanggupi atau Tidak Menyanggupi (dengan catatan), lalu memperbarui progres: Diproses, Dikirim, Selesai.
5. Jika jumlah berubah setelah Final, Admin GA mengajukan **Revisi** per bagian (jumlah baru dan alasan wajib). Revisi berstatus Menunggu Verifikasi dan vendor diberi tahu.
6. Vendor merespons revisi. Admin GA memverifikasi: Setujui (angka baru berlaku) atau Batalkan. Admin boleh memverifikasi tanpa respons vendor (misalnya sudah dikonfirmasi lewat WhatsApp) dengan peringatan.
7. Rekapitulasi dan Laporan memakai data berlaku. Riwayat tidak pernah dihapus.
8. Admin GA dapat menghubungi vendor lewat tautan WhatsApp dengan pesan terisi otomatis (kontak vendor di Data Vendor).

## Status
- Periode: `belum_input`, `draft`, `final`, `revisi` (ada revisi menunggu verifikasi).
- Respons vendor: `belum`, `menyanggupi`, `tidak_menyanggupi`.
- Progres vendor: `menunggu`, `diproses`, `dikirim`, `selesai` (hanya maju, dan hanya setelah menyanggupi).
- Revisi: `menunggu`, `disetujui`, `dibatalkan`.
- Data berlaku = periode berstatus `final` atau `revisi`. Hanya data berlaku yang masuk Rekapitulasi, Laporan, dan KPI.

## Aturan Bisnis
- Input awal tidak perlu verifikasi. Hanya revisi yang diverifikasi (PDF dan wawancara).
- Revisi wajib menyimpan: jumlah awal, selisih (+/-), jumlah terbaru, waktu, alasan, pengaju, respons vendor, verifikator.
- Revisi yang menunggu belum mengubah angka rekap. Satu item hanya boleh punya satu revisi menunggu.
- Vendor otomatis tidak bisa melihat data vendor lain. Admin melihat semua.
- Riwayat (log periode dan revisi) append-only.
- Penugasan vendor pada periode hanya diubah Admin GA dengan alasan wajib dan tercatat.
- Jumlah porsi default sama dengan jumlah karyawan tetapi dapat diedit (keduanya disimpan). Nilai tidak boleh negatif.
- Data master yang sudah dipakai tidak dihapus, hanya dinonaktifkan.
- Setiap pengisian mencatat siapa dan kapan (tampil sebagai "Diupdate oleh").

## Asumsi Sementara (belum dikonfirmasi client)
| ID | Asumsi |
|---|---|
| A1 | Verifikasi revisi dilakukan Admin GA mana pun, dengan respons vendor sebagai masukan. Tidak ada larangan memverifikasi revisi sendiri karena hanya ada satu role admin |
| A2 | Siang, Sore, Malam pada jadwal vendor sama dengan Shift 1, 2, 3 |
| A3 | Tidak ada cut-off waktu input atau revisi |
| A4 | Vendor melihat rincian per bagian beserta lokasi antar dan batas jam tiba, bukan hanya total |
| A5 | Notifikasi hanya di dalam aplikasi (lonceng); kontak vendor manual lewat tautan WhatsApp |
| A6 | Login memakai username, dipetakan ke email `username@tps.co.id` di Supabase Auth |
| A7 | Halaman Impor Data hanya jalur otomatis dari dokumen; jalur manual adalah CRUD di halaman masing-masing. Mesin bawaan adalah parser aturan dan OCR tanpa AI (usulan rekan developer); AI Gemini hanya fallback opsional |
| A8 | Jadwal Excel client hanya mencakup 1 Oktober sampai 31 Desember 2026 meski berjudul Tahun 2026; importer menerima rentang apa pun |

## Halaman Admin GA (sidebar berkelompok)
**UTAMA**
1. **Dashboard**: filter periode ala kalender (preset: Hari Ini, 7 Hari, 30 Hari, Bulan Ini, 3 Bulan, 6 Bulan, 1 Tahun, rentang kustom, plus tombol mundur/maju). KPI: Total Porsi, Rata-rata Porsi per Hari, Jumlah Revisi, Revisi Menunggu Verifikasi, Periode Belum Input (hari ini dan besok). Grafik: Tren Porsi Harian, Distribusi per Shift, Porsi per Bagian, Porsi per Vendor. KPI dan grafik wajib konsisten.

**DATA MASTER**
2. **Data Bagian**: CRUD (nama, kelompok, lokasi antar, catatan antar, keterangan, status), pencarian, pagination.
3. **Data Vendor**: CRUD (kode, nama, nama kontak, no. WhatsApp, no. telp, alamat, status), pencarian, pagination. Tombol Hubungi via WhatsApp.
4. **Periode Catering**: tabel jadwal seluruh hari dengan pagination: Tanggal, Shift, Vendor, Kontak Vendor, Total Porsi, Diupdate Oleh, Status, Progres Vendor, Aksi. Filter bulan, tahun, shift, vendor, status. Tambah, ubah, dan hapus periode (hanya yang masih Belum Input). Ganti vendor dengan alasan. Kelola master Shift dari halaman ini.
5. **Impor Data**: unggah dokumen (xlsx, docx, pdf), sistem membaca otomatis (parser aturan, OCR untuk pindaian, AI opsional), tabel pratinjau dapat diedit, konfirmasi, data masuk database. Lihat bagian khusus di bawah.

**OPERASIONAL**
6. **Input Data Catering**: pilih tanggal, grid bagian x tiga shift (urutan Shift 3, 1, 2). Header kolom shift menampilkan jam, vendor (dari jadwal, hanya baca), status, dan respons vendor. Tiap shift: kolom Karyawan dan Porsi, baris Total, "Terakhir diupdate oleh", tombol Simpan Draft dan Kirim ke Vendor. Shift Final bersifat baca saja dengan tombol Ajukan Revisi per baris. Jika jadwal belum ada tampil empty state.
7. **Verifikasi Data**: segmen Revisi (tabel: tanggal, shift, vendor, bagian, awal ke baru dengan selisih, alasan, pengaju, respons vendor, status, aksi Verifikasi/Batalkan/Detail/Hubungi Vendor) dan Respons Vendor (periode yang ditolak vendor dan perlu tindak lanjut). Halaman **Riwayat Update/Revisi** per periode: Tanggal dan jam, Oleh, Perubahan, Keterangan.

**ANALISIS**
8. **Rekapitulasi dan Laporan** (digabung): rentang Mingguan, Bulanan, 3 Bulan, 6 Bulan, Tahunan, atau kustom (kalender), filter vendor, bagian, shift. Tampilan Rekap Harian (baris tanggal x shift beserta vendor, kolom per bagian dan Total, baris Total Per Periode) dan Ringkasan (per bagian, per shift, per vendor, per bulan). Ekspor Excel mengikuti format Excel client dan Ekspor PDF ber-kop surat.

**AKUN**
9. **Manajemen User**: tabel, tambah, ubah, nonaktifkan, reset password; akun vendor dihubungkan ke vendor.
10. **Pengaturan Akun**: profil, ubah nama dan kontak, ganti password, versi sistem di paling bawah.

## Impor Data (Cerdas)
- Jenis dokumen: Jadwal Catering (tanggal, shift, vendor), Daftar Vendor (nama, kontak, alamat), Data Bagian, dan Jumlah Catering Harian (format Excel update client, opsional).
- Format: xlsx dan csv (parser aturan), docx (tabel dan paragraf), pdf (lapisan teks; bila pindaian memakai OCR di browser).
- Mesin bertingkat: (1) parser aturan deterministik sebagai bawaan: gratis, dapat diulang, dan isi dokumen tidak keluar dari aplikasi; (2) OCR untuk pdf atau gambar pindaian, seluruh hasilnya ditandai Perlu Dicek; (3) AI Gemini sebagai fallback opsional: mati secara bawaan, hanya muncul bila diaktifkan lewat konfigurasi dan keyakinan parser rendah, dan hanya dijalankan setelah pengguna menyetujui pengiriman isi dokumen ke layanan eksternal.
- Alur: unggah, deteksi jenis, ekstraksi, validasi, pratinjau dapat diedit (status baris Cocok, Baru, Perlu Dicek, Error), konfirmasi, data tersimpan dan langsung tampil di halaman terkait.
- Akurasi: validasi aturan domain (tiga shift per tanggal, tanggal berurutan tanpa celah atau duplikat, rotasi vendor, alias, nama dinormalisasi). Ketidaksesuaian ditandai Perlu Dicek.
- Tidak ada data yang tersimpan sebelum Admin menekan Konfirmasi. Berkas tidak disimpan di server.

## Halaman Vendor (sidebar berkelompok)
**UTAMA**: Dashboard (permintaan hari ini per shift, menunggu respons, sedang diproses, selesai bulan ini).
**PERMINTAAN**: Permintaan Masuk (daftar periode final milik vendor, rincian per bagian dengan lokasi antar dan batas jam tiba, revisi menunggu); Ketersediaan (antrean permintaan dan revisi yang belum direspons, tombol Menyanggupi dan Tidak Menyanggupi dengan catatan).
**LAPORAN**: Progres Catering (ubah progres Diproses, Dikirim, Selesai, dengan catatan); Riwayat Pesanan.
**AKUN**: Pengaturan Akun.

## Hak Akses
| Fitur | Admin GA | Vendor |
|---|---|---|
| Master (bagian, vendor, periode, shift) | Kelola | Tidak ada |
| Input, kirim, revisi, verifikasi | Ya | Tidak |
| Respons ketersediaan dan progres | Lihat | Hanya miliknya |
| Rekap, laporan, ekspor | Semua | Tidak ada |
| Impor AI, manajemen user | Ya | Tidak |
| Pengaturan akun | Ya | Ya |

## Di Luar Cakupan
Harga dan tagihan vendor, integrasi absensi/HR, notifikasi email/WhatsApp otomatis, pendaftaran mandiri, cut-off waktu, multi-perusahaan, pembatasan bagian per PIC.

## Data Awal (seed)
- 3 shift dan 5 bagian sesuai bagian Konsep Inti, dengan alias.
- 5 vendor: Aisya Catering, Catering IBU, Nikmat Rasa, Adhi Hidayah, Nurina Catering (kode V001 sampai V005, kontak dikosongkan). Nama dinormalisasi tanpa spasi berlebih. Jika repositori publik, gunakan nama bermasker (Vendor Catering 1 sampai 5).
- Jadwal demo di sekitar hari ini mengikuti rotasi vendor, jumlah demo bersifat simulasi (kisaran total per shift 80, 65, 50). Jangan menyalin angka asli dari Excel client ke repositori.
- Akun demo: `admin.ga`, `pic.cfs`, `pic.mekanik`, `pic.operator` (role admin_ga), `vendor.aisya`, `vendor.ibu` (role vendor). Kredensial hanya di `supabase/README.md`.
- Status campuran agar semua tampilan terlihat: Belum Input, Draft, Final, Revisi (dengan revisi menunggu), respons vendor beragam.

## Kriteria Sukses
- Demo end to end: PIC mengisi dan Kirim, vendor melihat dan Menyanggupi, vendor memperbarui progres, Admin mengajukan revisi, vendor merespons, Admin memverifikasi, rekap memakai angka baru, riwayat lengkap.
- Vendor A tidak dapat melihat data vendor B (diuji di database, bukan hanya UI).
- Impor jadwal dari Excel client menghasilkan 276 baris (92 hari x 3 shift) dengan 5 vendor tanpa duplikat vendor akibat spasi.
- Ekspor Excel bulanan menyerupai format Excel client untuk lima bagian.
- Tampilan profesional dan konsisten, semua data di database sungguhan.

## Pertanyaan Terbuka untuk Client
1. Siapa yang memverifikasi revisi: Admin GA, vendor, atau keduanya?
2. Siang, Sore, Malam benar sama dengan Shift 1, 2, 3?
3. Jadwal Januari sampai September 2026 ada atau tidak?
4. Apakah vendor perlu melihat rincian per bagian dan lokasi antar, atau cukup total per shift?
5. Bolehkah nama vendor dan data asli dipakai pada demo dan repositori, atau harus dimasker?
6. Bolehkah isi dokumen dikirim ke layanan AI eksternal (Gemini)? Jika tidak, fallback AI tetap dimatikan.
