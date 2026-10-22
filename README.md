# Sistem Pengelolaan Data Catering Karyawan
### PT Terminal Petikemas Surabaya (Pelindo TPS)

[![CI](https://github.com/raynar23/catering/actions/workflows/ci.yml/badge.svg)](https://github.com/raynar23/catering/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

Platform digital terintegrasi untuk mendigitalkan dan mengotomatiskan tata kelola pemesanan katering harian 3-shift di lingkungan PT Terminal Petikemas Surabaya. Sistem ini menghubungkan tim General Affairs (Admin GA) dengan lima mitra vendor katering secara real-time, mengeliminasi pencatatan manual di kertas/chat, mengamankan hak akses data katering, dan mengotomatiskan pelaporan rekapitulasi konsumsi porsi.

---

## Fitur Utama Berdasarkan Peran

### 1. Modul Admin General Affairs (Admin GA)
- **Dashboard Analitik**: 5 Kartu KPI terpadu, 4 grafik performa (tren harian, donut proporsi per shift, alokasi bagian, beban kerja per vendor), dan filter kalender rentang cepat.
- **Input Katering 3 Shift**: Grid berdampingan (Shift 3 Malam, Shift 1 Pagi, Shift 2 Siang) dengan *dirty cell tracking* dan kunci status final.
- **Manajemen Periode & Rotasi Vendor**: Kalender rotasi 5 vendor paten serta mekanisme penunjukan vendor darurat dengan alasan wajib.
- **Verifikasi Data**: Persetujuan revisi porsi pasca-final bertanda (+/-) dan penanganan notifikasi penolakan vendor.
- **Rekapitulasi & Ekspor Laporan**: Matriks porsi harian per bagian aktif dan ringkasan 4 dimensi dengan opsi ekspor spreadsheet Excel bergaris kisi dan PDF A4 Landscape ber-kop resmi Pelindo TPS.
- **Wizard Impor Data Cerdas**: Ekstraksi multi-format (XLSX, CSV, DOCX, PDF) dengan OCR pada peramban dan editor tabel interaktif sebelum simpan permanen.
- **Manajemen Pengguna**: Kelola akun admin dan perwakilan vendor, reset kata sandi, dan status aktif.

### 2. Modul Portal Mitra Vendor
- **Dashboard Operasional Vendor**: KPI volume harian dan panel pesanan 3 shift hari ini.
- **Antrean Ketersediaan Realtime**: Kotak masuk konfirmasi kesanggupan pesanan baru dan persetujuan revisi kuota porsi.
- **Pelaporan Progres 5 Tahap**: Stepper transparan satu arah (*Menunggu -> Dipersiapkan -> Dikirim -> Sampai -> Selesai*).
- **Inspektor Alokasi Bagian**: Tinjauan detail kuota per bagian kerja dan titik lokasi fisik pengantaran di dermaga TPS.
- **Arsip Riwayat Pesanan**: Pengecekan historis pesanan untuk rekonsiliasi tagihan bulanan.

---

## Arsitektur & Teknologi

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript Strict.
- **Desain Sistem**: Pelindo TPS corporate color palette (`#0A4D7C`), zero page scroll pada 4 target viewport desktop (1190x670, 1366x680, 1440x800, 1920x950).
- **Backend & Database**: Supabase PostgreSQL dengan Row Level Security (RLS) teruji, stored procedures atomik (`SECURITY DEFINER`), dan audit trail append-only (`order_logs`).
- **Realtime Engine**: Supabase Realtime publication dengan replica identity full, unmount cleanup, reconnection handling, dan debounce timer.
- **Security**: Strict security headers, role escalation guard triggers, zero leak credential client-side.

---

## Panduan Cepat Memulai (Quick Start)

### 1. Kloning Repositori & Pasang Dependensi
```bash
git clone https://github.com/raynar23/catering.git
cd catering
npm install
```

### 2. Konfigurasi Variabel Lingkungan
Salin `.env.example` ke `.env.local` dan lengkapi kredensial Supabase Anda:
```bash
cp .env.example .env.local
```

### 3. Setup Basis Data
Eksekusi berkas SQL terpadu `DATABASE_LENGKAP_CATERING.sql` pada menu **SQL Editor** di dashboard Supabase Anda.

### 4. Jalankan Server Lokal
```bash
npm run dev
```
Buka peramban di `http://localhost:3000`.

---

## Kredensial Akun Uji Coba

| Peran (Role) | Username | Password | Email Auth |
| :--- | :--- | :--- | :--- |
| **Admin General Affairs** | `admin` | `gatps2026` | `admin@tps.co.id` |
| **Mitra Vendor (Aisya)** | `vendor` | `vendortps2026` | `vendor@tps.co.id` |

*Catatan:* Pengguna dapat mengetikkan username langsung (`admin` atau `vendor`) pada form login.

---

## Dokumentasi Lengkap

Dokumentasi terperinci tersedia di folder `docs/`:
- [docs/01-panduan-instalasi.md](docs/01-panduan-instalasi.md): Panduan instalasi basis data, variabel lingkungan, dan deployment Vercel.
- [docs/02-dokumentasi-teknis.md](docs/02-dokumentasi-teknis.md): Metodologi teknis, diagram alur sistem, ERD Mermaid, dan katalog stored procedures.
- [docs/03-panduan-pengguna-admin.md](docs/03-panduan-pengguna-admin.md): Panduan operasional pengguna Admin General Affairs.
- [docs/04-panduan-pengguna-vendor.md](docs/04-panduan-pengguna-vendor.md): Panduan operasional pengguna Mitra Vendor Katering.
- [docs/05-skrip-demo.md](docs/05-skrip-demo.md): Skenario demo end-to-end lengkap untuk presentasi client.

---

## Skrip NPM Tersedia

- `npm run dev`: Menjalankan server pengembangan lokal.
- `npm run build`: Membangun bundel produksi Next.js.
- `npm run start`: Menjalankan server produksi hasil kompilasi.
- `npm run lint`: Memvalidasi kepatuhan kode via ESLint.
- `npm test`: Menjalankan pengujian unit Vitest (163 tests passed).
- `npm run test:db`: Menjalankan pengujian isolasi keamanan basis data.
- `npm run db:build`: Menghasilkan kembali berkas SQL tunggal `DATABASE_LENGKAP_CATERING.sql`.
- `npm run import:check -- <file>`: Skrip CLI untuk memverifikasi struktur berkas jadwal katering.

---

## Lisensi & Hak Cipta
Hak Cipta © 2026 PT Terminal Petikemas Surabaya (Pelindo TPS) & Muhammad Raynar Hammam. Seluruh hak cipta dilindungi undang-undang.
