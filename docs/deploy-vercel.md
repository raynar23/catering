# Panduan Deployment Vercel - Sistem Catering TPS

Dokumen ini memuat panduan resmi konfigurasi deployment produksi ke platform **Vercel** untuk Sistem Pengelolaan Data Catering Karyawan General Affairs PT Terminal Petikemas Surabaya.

---

## 1. Variabel Environment (Environment Variables)

Daftarkan variabel environment berikut pada menu **Project Settings > Environment Variables** di dasbor Vercel. 

> [!IMPORTANT]
> Jangan pernah memasukkan nilai rahasia aktual ke dalam dokumentasi Git. Cantumkan nama variabel saja pada konfigurasi tim.

| Nama Variabel Environment | Ruang Lingkup | Deskripsi & Nilai Bawaan |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production & Preview | URL REST API proyek Supabase produksi (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production & Preview | Kunci anonim publik Supabase (Aman di sisi peramban) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production & Preview (Secret) | Kunci rahasia server privilese tinggi (Wajib di sisi server, jangan centang otomatis untuk client) |
| `IMPORT_AI_ENABLED` | Production & Preview | Wajib disetel ke `false` (Menggunakan mesin aturan deterministik berbasis Excel/CSV/PDF) |
| `GEMINI_API_KEY` | Production & Preview (Opsional) | Kosongkan jika `IMPORT_AI_ENABLED=false` |
| `NODE_ENV` | Production | Diatur otomatis oleh Vercel ke `production` |

---

## 2. Konfigurasi Supabase Authentication

Untuk memastikan pengalihan rute login dan sesi pengguna berfungsi dengan benar pada domain Vercel:

1. Buka **Supabase Dashboard > Authentication > URL Configuration**.
2. **Site URL**:
   - Isi dengan domain produksi utama:
     `https://<project-name>.vercel.app` (atau domain kustom korporat jika terhubung).
3. **Redirect URLs**:
   - Tambahkan URL pengalihan autentikasi berikut:
     ```text
     https://<project-name>.vercel.app/**
     https://<project-name>-*.vercel.app/**
     http://localhost:3000/**
     ```

---

## 3. Pengaturan Build & Output

Proyek menggunakan framework Next.js 16 (App Router):
- **Framework Preset**: Next.js
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: `20.x` atau `22.x`

---

## 4. Pemeriksaan Pasca-Deploy (Read-Only Post-Deploy Verification)

Setelah deployment selesai dan berstatus **Ready**, jalankan daftar periksa baca-saja (*read-only*) berikut untuk memverifikasi fungsionalitas tanpa memutasi data produksi:

- [ ] **1. Halaman Masuk (Login UI)**:
  - Buka `https://<domain-vercel>/login`.
  - Pastikan halaman termuat dengan responsif, gambar latar belakang dermaga dan logo resmi Pelindo TPS tampil tajam tanpa distorsi.
- [ ] **2. Autentikasi Pengguna UAT**:
  - Uji masuk menggunakan akun Admin GA (`admin.ga@tps.co.id`).
  - Pastikan pengguna diarahkan langsung ke dasbor Admin (`/admin/dashboard`).
- [ ] **3. Pemuatan Dasbor Admin**:
  - Verifikasi 5 kartu KPI (Total Porsi, Karyawan, Anggaran, Pesanan Final, Revisi Menunggu) terisi angka konsisten.
  - Periksa grafik tren harian dan donut distribusi shift tampil tanpa error di konsol peramban.
- [ ] **4. Pemuatan Tabel Rekapitulasi**:
  - Buka `/admin/rekapitulasi`.
  - Pastikan matriks rekapitulasi harian termuat dengan data 5 bagian aktif.
- [ ] **5. Ekspor Laporan Baca-Saja**:
  - Klik tombol **Ekspor Excel** dan pastikan file `.xlsx` terunduh dengan benar.
  - Klik tombol **Ekspor PDF** dan pastikan berkas A4 landscape terunduh.
- [ ] **6. Portal Vendor (Uji Isolasi)**:
  - Keluar (*logout*) dan masuk sebagai vendor mitra (`vendor.aisya@tps.co.id`).
  - Pastikan vendor hanya dapat melihat jadwal dan alokasi miliknya sendiri, dengan 0 kebocoran data vendor lain.
- [ ] **7. Tidak Ada Error Konsol**:
  - Buka Developer Tools peramban (F12 > Console).
  - Pastikan tidak ada pesan error merah atau peringatan kegagalan hidrasi (*hydration failure*).
