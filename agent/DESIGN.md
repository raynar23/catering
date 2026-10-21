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
| `Logo_TPS.png` | Logo baru berwarna "PELINDO TERMINAL PETIKEMAS TPS SURABAYA" (disalin ke `public/images/logo-tps-warna.png` dan lambang diekstrak ke `public/images/tps-symbol.png`) |
| `Logo TPS Monokrom.png` | Logo baru monokrom putih "PELINDO TERMINAL PETIKEMAS TPS SURABAYA" (disalin ke `public/images/logo-tps-monokrom.png`): header login dan sidebar |
| `background aset-2.png` | Foto latar halaman login (pelabuhan saat senja) disalin ke `public/images/login-bg.png` |
| `Logo TPS Lama Monokrom.png` | Aset arsip logo lama |
| `Logo_Terminal_Petikemas_Surabaya.png` | Aset arsip logo lama berwarna |
| `Terminal_Petikemas_Surabaya.png` | Aset arsip lambang lama |

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
| Final, Disetujui, Aktif | #1E8E3E / #EBF7EE / #C8E9D0 |
| Diajukan | #0B5A94 / #E8F2FA / #BBD9EE |
| Draft, Nonaktif | #6E6E73 / #F2F2F7 / #E5E5EA |
| Revisi, Menunggu Verifikasi | #9A5B00 / #FFF8E6 / #FFE2A4 |
| Belum Input, Ditolak | #D70015 / #FDECEE / danger 20% |

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
- Tanggal di tabel dan input: `19-10-2026`. Tanggal panjang di header dashboard: `Senin, 19 Oktober 2026`. Tanggal dan jam: `19-10-2026 08.15`. Jam shift: `06.00 - 14.00`. Label shift: `Shift 1 (06.00 - 14.00)`.
- Angka memakai pemisah ribuan id-ID. Selisih revisi ditulis dengan tanda: `+3`, `-2`.
- Label status baku: Belum Input, Draft, Diajukan, Revisi, Final; revisi: Menunggu Verifikasi, Disetujui, Ditolak.

## App Shell, Viewport, dan 100dvh (Zero Page Scroll)
- Target viewport: 1190x670 (utama), 1366x680, 1440x800, 1920x950.
- Desktop (lg+): shell `h-dvh max-h-dvh overflow-hidden`; area konten `flex-1 min-h-0 flex flex-col overflow-hidden`. Halaman TIDAK BOLEH punya scrollbar vertikal. DataTable mengisi sisa tinggi (`flex-1 min-h-0`) dengan jumlah baris dihitung otomatis lewat ResizeObserver (minimum 5 baris) plus pagination. Pemilih "Tampilkan N data" pada mockup diganti perhitungan otomatis ini.
- Tabel lebar (misalnya Rekapitulasi) boleh scroll horizontal di dalam kontainernya, bukan di halaman.
- Mobile (< lg) atau tinggi < 600px: konten boleh scroll vertikal (`overflow-y-auto`).

## PageContainer
Semua halaman setelah login memakai `PageContainer`: lebar 100%, `px-6`, `max-w-[1360px] mx-auto`. Header halaman tinggi tetap 56px (`h-14`): judul 20px semi-bold, subjudul satu baris (`text-xs text-text-muted truncate`), slot aksi di kanan. Halaman tidak menetapkan max-width atau padding luar sendiri.

## Sidebar dan Topbar
- Sidebar lebar 264px, latar `navy`, tetap (tanpa mode ciut). Header sidebar memuat logo putih tinggi sekitar 40px.
- Menu satu daftar rata sesuai mockup, urutan: Dashboard, Data Bagian, Data Vendor, Periode Catering, Input Data Catering, Verifikasi Data, Rekapitulasi, Laporan, Manajemen User. Menu yang tidak berhak disembunyikan sesuai role (lihat PRD.md). Item aktif: latar `primary`, teks putih. Item lain: teks putih 80%, hover latar putih 8%.
- Angka kecil polos rata kanan pada menu Verifikasi Data (jumlah menunggu tindakan), tanpa bentuk pil.
- Bagian bawah sidebar: tombol Keluar saja (tanpa teks versi).
- Topbar tinggi 56px, latar surface, border bawah. Kiri: "Pengelolaan Data Catering Karyawan" (14px semi-bold) dan "PT Terminal Petikemas Surabaya" (12px muted). Kanan: lonceng notifikasi dengan angka kecil di sudut (bukan titik), lalu profil (avatar lingkaran berisi inisial, nama, peran).
- Dropdown lonceng: daftar item menunggu tindakan sesuai role (Supervisor: pesanan Diajukan dan revisi menunggu; PIC Unit dan Admin GA: pesanan yang dikembalikan ke Draft). Tiap item menaut ke halaman terkait. Empty state: "Tidak ada notifikasi".
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

## Dashboard
- Header halaman: judul "Dashboard", subjudul tanggal panjang hari ini; aksi kanan: pemilih Periode Aktif (bulan dan tahun).
- Grid 12 kolom: baris 1 empat KPI (masing-masing 3 kolom): Bagian, Vendor Catering, Total Karyawan Hari Ini, Total Kebutuhan Catering. Baris 2 tiga KPI (masing-masing 4 kolom): Shift Aktif, Data Belum Diverifikasi (subbaris "N pesanan, M revisi"), Data Sudah Final.
- Kartu KPI: label 12px muted di atas, nilai 24px semi-bold di bawah, tanpa ikon.
- Baris 3 dua panel sama lebar mengisi sisa tinggi: "Jumlah Catering per Bagian (Hari Ini)" bar vertikal (`#1175BB`, nilai di atas batang, nama bagian utuh boleh dua baris) dan "Distribusi Catering per Shift (Hari Ini)" donut (Shift 1 `#1175BB`, Shift 2 `#9CC9EA`, Shift 3 `#E08F26`), total di tengah, legenda dengan jumlah dan persentase.
- Angka KPI dan kedua grafik berasal dari satu sumber query agar identik. Empty state grafik: "Belum ada data final untuk hari ini".

## Tabel dan Form
- DataTable: header sticky 12px muted, baris 40px, hover `primary-soft`, angka rata kanan, kolom Aksi rata kanan, pagination di bawah ("Menampilkan 1-5 dari 12" dan tombol Sebelumnya/Berikutnya).
- Filter bar di atas tabel: pencarian, dropdown, dan tombol aksi utama di kanan (Tambah ...).
- Input Data Catering: strip filter (Tanggal, Shift, Vendor) dengan badge status pesanan di kanan; sel angka berupa input angka (min 0, `tabular-nums`, lebar sempit); baris Total tebal di bawah daftar; bar aksi bawah: Simpan Draft (sekunder) dan Ajukan (utama) rata kanan. Saat Final, sel read-only dan muncul tombol Ajukan Revisi pada tiap baris.
- Dialog revisi menampilkan jumlah awal, kolom jumlah baru, selisih otomatis bertanda (+/-), dan alasan wajib.
- Verifikasi: tabel dengan tombol aksi (Verifikasi, Review, Detail). Detail berupa dialog besar: ringkasan, tabel angka per bagian, daftar revisi menunggu, tombol Setujui dan Tolak (catatan wajib saat Tolak), tautan "Lihat Riwayat".
- Riwayat: kartu ringkasan satu baris (Tanggal, Shift, Vendor, Status) di atas tabel kronologi; tombol "Kembali" tanpa ikon.
- Rekapitulasi: strip filter, tombol Ekspor Excel dan Cetak PDF di kanan, tabel matriks dengan baris "Total Per Periode" menempel di bawah.

## Laporan, Ekspor, dan Cetak
- Segmented control `Harian | Mingguan | Bulanan` tanpa ikon, pemilih periode sesuai jenis, pratinjau tabel, dua tombol: Ekspor Excel dan Ekspor PDF.
- Excel: baris judul, header tebal, kolom sama dengan Rekapitulasi, format angka, nama sheet jelas, baris total.
- PDF: kop dengan logo berwarna dan "PT Terminal Petikemas Surabaya", judul laporan, rentang periode, tanggal cetak (Asia/Jakarta), tabel rekap, ringkasan total per shift dan per vendor. Tanpa emoji dan tanpa elemen dekoratif.