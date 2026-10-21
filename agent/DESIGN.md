# DESIGN - Gaya Visual

Acuan utama: antarmuka aplikasi macOS / iOS yang profesional (tenang, rapi, padat informasi, hierarki jelas). Struktur halaman mengikuti `agent/referensi/mockup-9-halaman.jpeg`; kedisiplinan visual mengikuti file ini. Jika mockup dan file ini berbeda soal gaya (misalnya kotak ikon berwarna pada kartu KPI), file ini yang berlaku. Bukan tampilan template AI.

## Warna
| Token | Nilai | Pemakaian |
|---|---|---|
| primary | #1175BB | Tombol utama, link, item menu aktif |
| primary-dark | #0B5A94 | Hover/pressed, overlay foto login |
| primary-soft | #E8F2FA | Latar badge info, hover baris |
| navy | #0B3D6B | Latar sidebar. Cocokkan dengan mockup jika ada selisih |
| accent | #E08F26 | Sangat hemat: satu seri grafik donut |
| bg | #F5F5F7 | Latar halaman |
| surface | #FFFFFF | Kartu, tabel, form |
| border | #E5E5EA | Garis tipis 1px |
| text | #1D1D1F | Teks utama |
| text-muted | #6E6E73 | Teks sekunder |
| danger | #D70015 | Error, status Belum Input, Ditolak |
| danger-soft | #FDECEE | Latar badge/baris danger |
| success | #1E8E3E | Status Final, Disetujui, Aktif |
| warning | #9A5B00 | Status Revisi, Menunggu Verifikasi |

Dilarang: gradien ungu/pink/neon, gradien dekoratif, warna glow, bayangan berwarna. Semua warna diambil dari token (Tailwind theme), bukan nilai acak di komponen.

### Tema dan Vibe
Maritim-korporat yang tenang: biru laut dalam, langit senja pada foto latar, dan satu aksen jingga hangat yang diambil dari cahaya senja. Bersih, lapang, padat informasi tetapi tidak ramai, terasa seperti aplikasi macOS. Komposisi warna: sekitar 60% netral (bg, surface, border, teks), 30% keluarga biru, 10% jingga dan warna status.

### Skala Biru
| Token | Nilai |
|---|---|
| primary-50 | #E8F2FA |
| primary-100 | #CFE4F4 |
| primary-200 | #9CC9EA |
| primary-300 | #6AAEDF |
| primary-400 | #3D92D0 |
| primary-500 (primary) | #1175BB |
| primary-600 | #0E63A1 |
| primary-700 (primary-dark) | #0B5A94 |
| primary-800 (navy) | #0B3D6B |
| primary-900 | #082B4D |
| accent-soft | #FDF1E0 |

Tombol utama: #1175BB, hover #0E63A1, pressed #0B5A94, fokus ring 2px primary dengan offset 2px. Placeholder input #8A8A90.

## Aset dan Logo (folder `aset/`)
| Berkas | Pemakaian |
|---|---|
| `Terminal_Petikemas_Surabaya.png` | Logo berwarna "TP Terminal Petikemas Surabaya": pojok kiri atas halaman login dan kop PDF |
| `Logo_Terminal_Petikemas_Surabaya...png` | Cadangan: dipakai hanya jika berkas di atas ternyata bukan logo yang dimaksud (periksa nama lengkapnya di folder dan laporkan) |
| `background aset.png` | Foto latar halaman login (pelabuhan saat senja) |
| `TPS Monokrom.png` (putih) | Latar navy: header sidebar |
| `Logo TPS Lama Monokrom.png` | TIDAK dipakai (logo lama) |

- Buka dan periksa tiap gambar sebelum dipakai; salin ke `public/images/` dengan nama aman (`logo-tps-warna.png`, `logo-tps-putih.png`, `login-bg.png`). Jangan hapus atau ubah berkas asli di `aset/`.
- Jangan ubah proporsi, warna, atau beri efek pada logo. Beri ruang kosong di sekelilingnya. Gunakan `next/image` dengan `alt` yang jelas. Foto latar memakai `next/image` (`fill`, `priority`), bukan CSS background-image.

## Tipografi
- Font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", sans-serif`. Muat Inter lewat `next/font` (self-host), bobot 400, 500, 600.
- Ukuran dasar 13px, tinggi baris tabel 40px, judul halaman 20px semi-bold, judul bagian 14px semi-bold, label 12px, nilai KPI 24px semi-bold.
- `font-variant-numeric: tabular-nums` untuk semua angka (jumlah, total, tanggal, jam).
- Judul tidak huruf kapital semua; letter-spacing normal.

## Bentuk, Panel, dan Bayangan
- Radius: kartu dan panel 10px, tombol dan input 8px, badge 6px. Maksimal 12px. Tidak ada bentuk pil kecuali segmented control.
- Kartu dan panel: border 1px `border-border`, TANPA bayangan. Bayangan hanya untuk dialog, dropdown, dan kartu login.
- Skala jarak 4px (4, 8, 12, 16, 20, 24). Padding kartu 14 sampai 16px. Tinggi kontrol 32 sampai 36px.

## Status dan Badge
Badge teks saja, tanpa titik, radius 6px, 12px medium, border 1px.
| Status | Teks / Latar / Border |
|---|---|
| Final, Disetujui, Menyanggupi, Selesai, Cocok | #1E8E3E / #EBF7EE / #C8E9D0 |
| Dikirim, Baru | #0B5A94 / #E8F2FA / #BBD9EE |
| Draft, Menunggu (progres), Belum Merespons, Nonaktif | #6E6E73 / #F2F2F7 / #E5E5EA |
| Revisi, Menunggu Verifikasi, Diproses, Perlu Dicek | #9A5B00 / #FFF8E6 / #FFE2A4 |
| Belum Input, Tidak Menyanggupi, Dibatalkan, Error | #D70015 / #FDECEE / danger 20% |

## Icon Whitelist (Anti AI Slop)
Ikon hanya untuk:
1. Item navigasi sidebar (opsional; boleh teks saja).
2. Aksi toolbar: notifikasi (lonceng), menu akun, hamburger mobile.
3. Tombol aksi: Ekspor Excel, Cetak PDF, Tambah, Ubah, Hapus (ikon pada tombol aksi tabel), tampilkan/sembunyikan kata sandi.

Dilarang ikon pada: judul halaman, kartu KPI (tanpa ikon maupun kotak ikon berwarna, berbeda dari mockup), header panel/kartu, label tab/segmented control, prefiks field input, alert/info box, tombol Kembali, dan dekorasi lain. Tanpa emoji di mana pun.

## Interaksi dan Gerak
- Transisi 120 sampai 180ms ease-out. Tanpa animasi mantul, scale berlebihan, glow, atau efek hover mencolok.
- `cursor-pointer` hanya pada elemen yang dapat diklik.
- Wajib: skeleton tipis saat loading, empty state rapi tanpa ilustrasi, toast konfirmasi sederhana, validasi form jelas, fokus keyboard terlihat, dialog konfirmasi untuk Ajukan, Setujui, Tolak, dan Hapus.

## Ciri AI Slop yang Dihindari
Radius >12px, kartu bertumpuk bayangan tebal, gradien dekoratif, glassmorphism berlebihan, emoji sebagai ikon, ilustrasi generik, hero slogan, teks pemanis, badge bergradasi, animasi masuk di semua elemen, dot indicator status, kotak ikon berwarna di KPI, penumpukan ikon di header/tab/input.

## Teks, Bahasa, dan Format
- Seluruh antarmuka Bahasa Indonesia baku, formal, singkat. Komentar kode Bahasa Inggris singkat.
- Root layout `<html lang="id" translate="no">`. Semua format lewat satu helper `src/lib/format.ts` memakai `Intl` locale `id-ID` dan `timeZone: 'Asia/Jakarta'` eksplisit.
- Tanggal di tabel dan input: `19-10-2026`. Tanggal panjang di header dashboard: `Senin, 19 Oktober 2026`. Tanggal dan jam: `19-10-2026 08.15`. Jam shift: `08.00 - 16.00`. Label shift: `Shift 1 (08.00 - 16.00)`. Tengah malam ditulis `24.00` pada jam selesai.
- Angka memakai pemisah ribuan id-ID. Selisih revisi ditulis dengan tanda: `+3`, `-2`.
- Label status baku: Belum Input, Draft, Final, Revisi; respons vendor: Belum Merespons, Menyanggupi, Tidak Menyanggupi; progres: Menunggu, Diproses, Dikirim, Selesai; revisi: Menunggu Verifikasi, Disetujui, Dibatalkan.

## App Shell, Viewport, dan 100dvh (Zero Page Scroll)
- Target viewport: 1190x670 (utama), 1366x680, 1440x800, 1920x950.
- Desktop (lg+): shell `h-dvh max-h-dvh overflow-hidden`; area konten `flex-1 min-h-0 flex flex-col overflow-hidden`. Halaman TIDAK BOLEH punya scrollbar vertikal. DataTable mengisi sisa tinggi (`flex-1 min-h-0`) dengan jumlah baris dihitung otomatis lewat ResizeObserver (minimum 5 baris) plus pagination. Pemilih "Tampilkan N data" pada mockup diganti perhitungan otomatis ini.
- Tabel lebar (misalnya Rekapitulasi) boleh scroll horizontal di dalam kontainernya, bukan di halaman.
- Mobile (< lg) atau tinggi < 600px: konten boleh scroll vertikal (`overflow-y-auto`).

## PageContainer
Semua halaman setelah login memakai `PageContainer`: lebar 100%, `px-6`, `max-w-[1360px] mx-auto`. Header halaman tinggi tetap 56px (`h-14`): judul 20px semi-bold, subjudul satu baris (`text-xs text-text-muted truncate`), slot aksi di kanan. Halaman tidak menetapkan max-width atau padding luar sendiri.

## Sidebar dan Topbar
- Sidebar lebar 264px, latar `navy`, tetap (tanpa mode ciut). Header sidebar memuat logo putih tinggi sekitar 40px. Menu dikelompokkan dengan label teks kecil uppercase (jarak antar grup 20px). Item aktif: latar `primary`, teks putih; item lain teks putih 80%, hover latar putih 8%. Tombol Keluar di bagian bawah. Angka kecil polos rata kanan (tanpa bentuk pil) untuk jumlah yang menunggu tindakan.
- Sidebar Admin GA:
  - `UTAMA`: Dashboard
  - `DATA MASTER`: Data Bagian, Data Vendor, Periode Catering, Impor Data
  - `OPERASIONAL`: Input Data Catering, Verifikasi Data (angka: revisi menunggu verifikasi)
  - `ANALISIS`: Rekapitulasi dan Laporan
  - `AKUN`: Manajemen User, Pengaturan
- Sidebar Vendor:
  - `UTAMA`: Dashboard
  - `PERMINTAAN`: Permintaan Masuk, Ketersediaan (angka: belum direspons)
  - `LAPORAN`: Progres Catering, Riwayat Pesanan
  - `AKUN`: Pengaturan
- Topbar tinggi 56px, latar surface, border bawah. Kiri: "Pengelolaan Data Catering Karyawan" (14px semi-bold) dan "PT Terminal Petikemas Surabaya" (12px muted). Kanan: lonceng notifikasi dengan angka kecil di sudut (bukan titik), lalu profil (avatar lingkaran berisi inisial, nama, peran: "Admin GA" atau nama vendor).
- Dropdown lonceng: daftar item yang menunggu tindakan sesuai role, tiap item menaut ke halaman terkait. Empty state: "Tidak ada notifikasi".
- Mobile (< lg): sidebar menjadi drawer dengan tombol hamburger di topbar.

## Halaman Login
Mengikuti gambar referensi login dari client.
- Foto `login-bg.png` memenuhi layar (`next/image` `fill`, `object-cover`, `object-position: 60% 50%`). Scrim fungsional agar teks terbaca: overlay navy sekitar 25% ditambah gradien gelap halus di bagian bawah untuk footer. Tanpa gradien dekoratif lain.
- Logo `logo-tps-warna.png` di pojok kiri atas (tinggi 40 sampai 48px, jarak 24px; 32px pada lg+), proporsi asli. Karena langit senja cukup gelap, logo diletakkan di atas panel putih tipis (putih 95%, padding 8px 12px, radius 10px, tanpa bayangan tebal) agar kontras terjaga tanpa mengubah logo. Jika logo sudah beralas putih, panel tidak ditambahkan.
- Kartu putih terpusat (maks 420px; mobile lebar penuh dengan margin samping minimal 24px), radius 12px, padding 32px (mobile 24px), bayangan netral bertingkat (hitam transparan, bukan berwarna). Isi berurutan, rata tengah: "Sistem Pengelolaan" dan "Data Catering Karyawan" (22px semi-bold, warna navy, dua baris), "PT Terminal Petikemas Surabaya" (15px semi-bold, navy). Jarak 24px ke form.
- Form: label "Username" dan "Password" (12px medium), placeholder "Masukkan username" dan "Masukkan password", tinggi input 40px (pengecualian khusus login), tombol tampilkan/sembunyikan password di kanan field (satu-satunya ikon di halaman), tombol "Masuk" lebar penuh tinggi 40px warna primary.
- Footer rata tengah di dasar layar: "© 2026 PT Terminal Petikemas Surabaya", 12px, putih 90%.
- Error banner di atas form: latar danger-soft, border danger/20, teks danger, tanpa ikon, `aria-live="polite"`, tinggi tempat tetap agar layout tidak melompat. Pesan: "Username atau password tidak sesuai."
- Keadaan: fokus terlihat, error per field ("Username wajib diisi", "Password wajib diisi"), tombol Masuk menjadi "Memproses..." dan nonaktif saat mengirim.
- Desktop (lg+) tanpa scrollbar halaman (`h-dvh overflow-hidden`). Mobile dan tablet (< lg): alur kolom `min-h-dvh`, footer mengalir di bawah kartu, boleh scroll vertikal, target sentuh minimal 44px, font input 16px, padding safe-area.

## Dashboard Admin
- Header halaman: judul "Dashboard", subjudul rentang aktif. Aksi kanan: filter periode ala kalender: tombol preset (Hari Ini, 7 Hari, 30 Hari, Bulan Ini, 3 Bulan, 6 Bulan, 1 Tahun), tombol mundur dan maju satu rentang, dan tombol kalender yang membuka dialog "Pilih Rentang Tanggal" (react-day-picker, pintasan cepat, tanggal mulai dan selesai, pratinjau jumlah hari).
- Baris KPI (5 kartu, tanpa ikon): Total Porsi, Rata-rata Porsi per Hari, Jumlah Revisi, Menunggu Verifikasi, Belum Input (hari ini dan besok). Label 12px muted, nilai 24px semi-bold, subbaris opsional.
- Dua baris grafik mengisi sisa tinggi tanpa scroll halaman: Baris 1: Tren Porsi Harian (garis, periode ini `#1175BB`, periode lalu putus-putus `#94A3B8`) dan Distribusi per Shift (donut: Shift 1 `#1175BB`, Shift 2 `#9CC9EA`, Shift 3 `#E08F26`, total di tengah, legenda dengan jumlah dan persentase). Baris 2: Porsi per Bagian (bar vertikal, nilai di atas batang, nama bagian utuh) dan Porsi per Vendor (bar horizontal).
- Semua angka dan grafik dihitung dari satu sumber (view `v_rekap`) untuk rentang yang sama sehingga identik. Empty state: "Belum ada data final pada rentang ini".

## Halaman Vendor
- Dashboard: 4 KPI (Permintaan Hari Ini dalam porsi, Menunggu Respons, Sedang Diproses, Selesai Bulan Ini) dan satu panel "Pesanan Hari Ini" (tiga shift: jam, total porsi, status, tombol cepat menuju respons atau progres).
- Permintaan Masuk: tabel periode final milik vendor (tanggal, shift, total porsi, status revisi, respons, progres). Klik baris membuka panel rincian (inspector): tabel per bagian dengan lokasi antar, batas jam tiba (dari shift), catatan antar, dan revisi yang menunggu.
- Ketersediaan: antrean item yang belum direspons (permintaan baru dan revisi). Tiap kartu menampilkan ringkasan dan dua tombol: Menyanggupi dan Tidak Menyanggupi (dialog catatan; wajib untuk Tidak Menyanggupi). Empty state: "Tidak ada permintaan yang perlu direspons".
- Progres Catering: tabel pesanan yang sudah disanggupi dengan tombol langkah berikutnya (Mulai Proses, Tandai Dikirim, Tandai Selesai) dan catatan opsional. Progres hanya maju.
- Riwayat Pesanan: tabel penuh dengan filter rentang tanggal dan status, pencarian, dan inspector rincian.
- Semua halaman mengikuti PageContainer dan aturan 100dvh.

## Tabel dan Form
- DataTable: header sticky 12px muted, baris 40px, hover `primary-soft`, angka rata kanan, kolom Aksi rata kanan, pagination di bawah ("Menampilkan 1-5 dari 12", Sebelumnya dan Berikutnya).
- Filter bar di atas tabel: pencarian, dropdown, dan tombol aksi utama di kanan (Tambah ...). Aksi baris (Ubah, Hapus) memakai tombol ikon dengan tooltip dan dialog konfirmasi untuk Hapus.
- Periode Catering: tabel jadwal berpaginasi dengan kolom Tanggal, Shift, Vendor, Kontak Vendor (no. WhatsApp atau telp), Total Porsi, Diupdate Oleh, Status, Progres, Aksi.
- Input Data Catering: strip atas pemilih tanggal (default besok) dengan tombol hari sebelumnya dan berikutnya. Grid: kolom pertama Bagian (nama dan lokasi antar kecil di bawahnya), lalu tiga kelompok kolom shift (urutan Shift 3, Shift 1, Shift 2). Header kelompok memuat nama shift dan jam, nama vendor, badge status, dan badge respons vendor. Tiap kelompok memiliki sub-kolom Karyawan dan Porsi (input angka sempit, min 0, `tabular-nums`; porsi mengikuti karyawan sampai diedit manual). Baris Total tebal di bawah grid. Footer tiap kelompok: "Terakhir diupdate oleh {nama}, {waktu}", tombol Simpan Draft (sekunder) dan Kirim ke Vendor (utama, dialog konfirmasi). Kelompok Final read-only dengan tombol Ajukan Revisi per baris. Baris yang berubah ditandai halus (garis kiri `primary`). Grid boleh scroll horizontal di dalam kontainernya pada layar sempit.
- Dialog Ajukan Revisi: menampilkan jumlah awal, kolom jumlah baru (karyawan dan porsi), selisih otomatis bertanda (+/-), dan alasan wajib.
- Verifikasi Data: segmented control `Revisi | Respons Vendor`. Tabel revisi dengan kolom perubahan "20 menjadi 23 (+3)", badge respons vendor, dan aksi Verifikasi, Batalkan, Detail, Hubungi Vendor (tautan WhatsApp dengan pesan terisi otomatis). Dialog verifikasi menampilkan peringatan jika vendor belum menyanggupi. Tombol Setujui dan Batalkan (catatan wajib saat Batalkan). Tautan "Lihat Riwayat" membuka halaman Riwayat Update/Revisi (kartu ringkasan satu baris di atas tabel kronologi, tombol "Kembali" tanpa ikon).

## Rekapitulasi dan Laporan
- Header: judul "Rekapitulasi dan Laporan". Strip filter: rentang (segmented `Mingguan | Bulanan | 3 Bulan | 6 Bulan | Tahunan` ditambah kalender kustom), Vendor, Bagian, Shift. Tombol Ekspor Excel dan Ekspor PDF di kanan.
- Segmented control `Rekap Harian | Ringkasan`. Rekap Harian: tabel baris (Tanggal, Shift, Vendor), kolom per bagian aktif dan Total, baris Total Per Periode menempel di bawah. Ringkasan: tiga panel kecil (per bagian, per shift, per vendor) dan tabel per bulan untuk rentang panjang, dengan strip metrik (Total Porsi, Jumlah Revisi, Rata-rata per Hari).
- Dialog Ekspor: pilih format, kolom Catatan (teks bebas yang masuk ke footer), tombol Unduh. Format Excel dan PDF mengikuti ARCHITECTURE.md. PDF ber-kop dengan logo berwarna dan tanggal cetak (Asia/Jakarta), tanpa elemen dekoratif.

## Impor Data
- Satu halaman dengan alur bertahap (stepper teks tanpa ikon): `1 Unggah`, `2 Periksa`, `3 Konfirmasi`.
- Unggah: area tarik-lepas dan tombol Pilih Berkas (xlsx, csv, docx, pdf, maks 10 MB), pemilih Jenis Dokumen (Otomatis, Jadwal Catering, Daftar Vendor, Data Bagian, Jumlah Catering Harian), tombol Analisis. Saat memproses tampilkan skeleton dan teks status; untuk OCR tampilkan progres persen. Label kecil "Mesin: Aturan", "Mesin: OCR", atau "Mesin: AI" menunjukkan cara dokumen dibaca.
- Tombol sekunder "Coba dengan AI" hanya muncul bila fallback AI diaktifkan dan keyakinan parser rendah; membuka dialog persetujuan bahwa isi dokumen dikirim ke layanan eksternal.
- Periksa: strip ringkasan (jumlah baris, Cocok, Baru, Perlu Dicek, Error) dan DataTable pratinjau yang sel-selnya dapat diedit, dengan filter status, tombol Tambah Baris dan Hapus Baris. Baris Perlu Dicek dan Error diberi latar tint dan alasan singkat di kolom Catatan. Panel perbandingan menunjukkan Baru, Diubah, atau Sama terhadap data di database. Opsi: "Buat vendor baru otomatis" dan "Timpa periode yang sudah terisi" (default mati).
- Konfirmasi: dialog ringkasan perubahan (jumlah vendor dan periode yang akan dibuat atau diubah), tombol Konfirmasi dan Simpan, lalu halaman hasil dengan tautan ke Periode Catering dan Data Vendor. Tombol Konfirmasi nonaktif selama masih ada baris Error.
