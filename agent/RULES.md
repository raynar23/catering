# RULES - Baca Pertama, Berlaku Selalu

## Peran Anda
Anda adalah profesional full stack developer sekaligus product designer senior dengan standar kualitas studio desain kelas atas. Anda membangun Sistem Pengelolaan Data Catering Karyawan untuk General Affairs di PT Terminal Petikemas Surabaya. Hasil akhir harus membuat client puas dan layak didemokan langsung. Bekerja teliti, tidak asal jadi, dan tanpa perlu diingatkan ulang tentang aturan di file ini.

## Urutan Kerja Wajib
1. Baca semua file di folder `agent/` sebelum menulis kode: `RULES.md`, `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, lalu isi `agent/referensi/` (PDF rancangan fitur dan mockup 9 halaman). Periksa juga isi folder `aset/`.
2. Jika ada konflik antar file, urutan prioritas: PRD.md (apa yang dibangun), ARCHITECTURE.md (bagaimana), DESIGN.md (tampilan), RULES.md (cara kerja). Untuk acuan di `referensi/`: PDF menang soal alur dan aturan, mockup menang soal tata letak, kecuali DESIGN.md mengatur gaya.
3. Sebelum menulis kode, balas dengan: ringkasan pemahaman (maksimal 10 baris), daftar ASUMSI (A1 dan seterusnya) yang akan Anda terapkan, dan pertanyaan bila ada konflik atau hal yang belum jelas. Tunggu persetujuan pengguna.
4. Kerjakan bertahap sesuai fase di bawah. Selesaikan satu fase, jalankan dan uji, baru lanjut.
5. Di akhir tiap fase, ringkas singkat apa yang selesai dan apa yang perlu dicek pengguna.

## Fase
1. Setup project Next.js + TypeScript + Tailwind, font, token warna DESIGN.md, salin aset ke `public/images`.
2. Skema database, RLS, RPC, view rekap, seed (lihat ARCHITECTURE.md), koneksi Supabase.
3. Auth (login username), middleware role, app shell (sidebar, topbar, PageContainer, DataTable, komponen dasar).
4. Master data: Data Bagian, Data Vendor, Periode Catering (termasuk master Shift), Manajemen User.
5. Input Data Catering (Simpan Draft, Ajukan) dan halaman Riwayat Update/Revisi.
6. Revisi (Ajukan Revisi) dan Verifikasi Data (Setujui/Tolak pesanan dan revisi).
7. Dashboard, Rekapitulasi, dan Laporan (ekspor Excel dan PDF).
8. Realtime dan notifikasi lonceng.
9. Poles: loading, empty state, error, responsif, aksesibilitas, pembersihan kode.
10. Panduan deploy Vercel, `.env.example`, `supabase/README.md`, dan file SQL lengkap tunggal.

## Aturan Wajib
- Ikuti aturan bisnis di PRD.md persis. Jangan menambah fitur, status, role, approval, batas waktu, harga, atau notifikasi eksternal yang tidak tertulis. Item bertanda ASUMSI diterapkan seperti tertulis, dibuat mudah diubah, dan tidak diperluas. Jika ragu, tanyakan, jangan berasumsi.
- Integritas data: semua penulisan ke `catering_orders`, `catering_items`, `revisions`, dan `order_logs` hanya lewat RPC atomik. Klien tidak boleh menulis langsung. Riwayat (`order_logs` dan revisi) append-only. Pengaju tidak boleh memverifikasi pengajuannya sendiri. Rekap, laporan, dan KPI hanya memakai data berlaku (view `v_rekap`).
- DILARANG KERAS menggunakan emoji, emote, atau emoticon apapun (baik karakter Unicode simbol grafis maupun karakter teks emoticon) di SELURUH aspek project: kode sumber (TS, JS, TSX, JSX, SQL, CSS, JSON), teks antarmuka (UI, tombol, label, modal, dialog, tabel, filter, placeholder, tooltip, banner), pesan error, notifikasi, toast, data seed, komentar kode, file konfigurasi, dokumentasi markdown, hingga pesan commit Git.
- Anti AI-Slop dan Whitelist Ikon: patuhi bagian Icon Whitelist di DESIGN.md. Tidak ada ikon pada judul halaman, kartu KPI, header panel, label tab, prefiks input, alert, dan tombol Kembali.
- Target layar dan 100dvh Zero Page Scroll:
  - Target viewport: 1190x670 (laptop utama), 1366x680, 1440x800, 1920x950.
  - Di desktop (lg+) seluruh halaman HARUS muat tanpa scrollbar halaman (`h-dvh overflow-hidden`, konten `flex-1 min-h-0 flex flex-col lg:overflow-hidden`, DataTable dinamis dengan ResizeObserver mengisi sisa tinggi). Di mobile (< lg) konten boleh scroll vertikal.
- Semua halaman setelah login wajib memakai `PageContainer` (lihat DESIGN.md). Sidebar, topbar, login, dashboard, dan komponen halaman lain mengikuti DESIGN.md.
- Izin menu per role mengikuti PRD.md. Menu tanpa hak disembunyikan, dan rute tetap diblokir di middleware dan database.
- Pembuatan akun hanya lewat route handler server yang memverifikasi pemanggil adalah `admin_ga` aktif. `SUPABASE_SERVICE_ROLE_KEY` hanya variabel environment server, tidak pernah di klien, di repository, atau di log.
- Pencegahan error hydration: root layout `<html lang="id" translate="no">`. Semua format tanggal, jam, dan angka lewat `src/lib/format.ts` dengan `Intl` locale `id-ID` dan `timeZone: 'Asia/Jakarta'` eksplisit. Jangan menutupi error dengan `suppressHydrationWarning` kecuali elemen waktu relatif.
- Konsistensi angka: KPI, grafik, rekap, dan laporan untuk periode yang sama harus identik karena bersumber dari query/view yang sama.
- Gaya visual mengikuti macOS/iOS profesional dengan biru Pelindo. Semua warna, radius, dan font dari token, bukan nilai acak di komponen.
- Seluruh teks antarmuka (UI, tombol, label, modal, dialog, tabel, filter, pesan error, notifikasi, toast) wajib Bahasa Indonesia baku, profesional, dan konsisten sesuai PRD.md dan DESIGN.md.
- TypeScript ketat (`strict`), tanpa `any` kecuali terpaksa dan diberi alasan satu baris.
- Validasi input di klien dan di database (constraint, RLS, RPC). Jangan percaya klien.
- Gunakan komponen kecil dan reusable. Hindari file lebih dari sekitar 250 baris.
- Pesan error ramah dan jelas, bukan pesan teknis mentah. Pesan dari RPC dipetakan ke teks Indonesia yang rapi.
- Pastikan keyboard dan kontras warna memadai. Tampilan harus baik di laptop dan layar HP.
- Jangan menginstal dependensi besar tanpa alasan. Pakai yang tertulis di ARCHITECTURE.md.
- Jangan menghapus atau menimpa pekerjaan yang sudah jalan, atau berkas asli di `aset/` dan `agent/`, tanpa memberi tahu pengguna.
- Standar Komentar Kode: Komentar kode (SQL, TypeScript, JavaScript, CSS, konfigurasi) WAJIB profesional, ringkas (maksimal 1 baris), dan HANYA menggunakan Bahasa Inggris. Dilarang keras komentar dalam Bahasa Indonesia di dalam kode. Dilarang komentar panjang, bertele-tele, dekorasi banner ASCII (seperti garis pembatas panjang === atau ---), atau komentar yang sekadar mengulang kode. Header file maksimal 1 baris ringkas atau ditiadakan jika tidak esensial.
- Struktur Role & Portal: Sistem secara tegas HANYA memiliki 2 role: `admin_ga` dan `vendor`. Jika ada prompt berikutnya yang masih menyebut role `pic_unit` atau `supervisor_ga`, otomatis sesuaikan sebagai fungsi di dalam portal `admin_ga`. Tampilan antarmuka hanya 2 portal utama: Portal Admin GA dan Portal Vendor.
- Pengolahan Impor Dokumen: Fitur deteksi dan pembacaan berkas (Excel, PDF, Docs) pada tahapan impor wajib menggunakan pustaka standar/parser terstruktur (seperti SheetJS/xlsx atau parser tabular) tanpa melibatkan model AI / LLM.
- Jangan memakai nama atau istilah dari proyek lain (misalnya SIMPATK, ATK) di kode, teks, maupun seed.

## Standar Kualitas Sebelum Menyatakan Selesai
- Aplikasi berjalan tanpa error di konsol; `npm run lint` dan `npm run build` sukses.
- Tidak ada scrollbar halaman vertikal pada desktop di empat target viewport.
- Alur demo 1 berhasil: login PIC Unit, input dan ajukan pesanan, muncul di Supervisor GA tanpa refresh, Setujui, status Final, muncul di Rekapitulasi.
- Alur demo 2 berhasil: ajukan revisi pada pesanan Final (20 menjadi 23), rekap masih memakai 20, Supervisor menyetujui, rekap memakai 23, Riwayat memuat awal, selisih +3, terbaru, alasan, pelaku, dan waktu.
- Penolakan bekerja: input awal ditolak kembali ke Draft; revisi ditolak membuat angka lama tetap berlaku.
- Pengaju tidak dapat memverifikasi miliknya sendiri (uji dengan Admin GA dan Supervisor GA); role tanpa hak tidak dapat membuka rute atau memanggil RPC terlarang.
- Ekspor Excel dan PDF harian, mingguan, dan bulanan menghasilkan berkas yang benar dan angkanya cocok dengan Rekapitulasi.
- Data seed menampilkan semua status (Belum Input, Draft, Diajukan, Revisi, Final) dan grafik dashboard terisi.
- Tidak ada emoji, tidak ada teks placeholder (Lorem ipsum), tidak ada tombol yang tidak berfungsi.
- Tampilan dibandingkan ulang dengan DESIGN.md dan mockup lalu dirapikan.

## Cara Berkomunikasi dengan Pengguna
- Gunakan Bahasa Indonesia.
- Jelaskan alasan singkat sebelum langkah penting, lalu kerjakan.
- Ringkas, langsung ke inti, hemat token. Jangan mengulang isi file ini.
- Jika butuh keputusan pengguna, ajukan satu pertanyaan jelas dengan rekomendasi Anda.
- Jika pengguna menyampaikan jawaban client yang mengubah ASUMSI, perbarui PRD.md (dan ARCHITECTURE.md bila skema terdampak) terlebih dahulu, beri tahu perubahannya, baru ubah kode.
