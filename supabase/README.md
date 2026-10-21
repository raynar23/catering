# Panduan Database Supabase - Sistem Catering Karyawan TPS

Dokumen ini memuat panduan struktur database, migrasi SQL, fungsi RPC, akun demo, dan pengujian database untuk sistem catering PT Terminal Petikemas Surabaya.

---

## 1. Urutan Migrasi & Eksekusi SQL

File migrasi tersimpan di folder `supabase/migrations/`:

| Nomor | Berkas Migrasi | Deskripsi |
|---|---|---|
| **001** | `001_enums_master.sql` | Enum tipe role, status, progress, log action, serta tabel master `shifts`, `bagian`, `vendors`, `profiles`. |
| **002** | `002_periods_items.sql` | Tabel `periods` (slot tanggal + shift + vendor), `catering_orders`, dan `catering_items`. |
| **003** | `003_revisions_logs.sql` | Tabel `revisions` (indeks satu revisi menunggu), `order_logs`, trigger append-only, dan trigger immutability. |
| **004** | `004_import_batches.sql` | Tabel penampung berkas batch impor dokumen catering. |
| **005** | `005_views.sql` | View `v_rekap` (hanya data Final/Revisi) dan `v_timeline_vendor` (masking nama staf GA). |
| **006** | `006_rls.sql` | Konfigurasi RLS ketat dan kebijakan isolasi vendor. |
| **007** | `007_rpc_admin.sql` | Fungsi RPC Admin/PIC: `simpan_catering`, `kirim_catering`, `ajukan_revisi`, `verifikasi_revisi`, `ganti_vendor_periode`, `konfirmasi_impor`. |
| **008** | `008_rpc_vendor.sql` | Fungsi RPC Vendor: `respon_periode_vendor`, `respon_revisi_vendor`, `update_progres_vendor`, `get_notifikasi`. |
| **009** | `009_realtime.sql` | Menambahkan tabel pesanan, revisi, dan log ke publikasi realtime Supabase. |
| **Seed**| `seed.sql` | Data master dan jadwal bergulir 29 hari (-14 s.d. +14 hari dari tanggal hari ini). |

> **Catatan Praktis**: Seluruh berkas di atas telah digabungkan menjadi satu file utuh:
> [`DATABASE_LENGKAP_CATERING.sql`](../DATABASE_LENGKAP_CATERING.sql). Anda dapat langsung menjalankan file tersebut di Supabase **SQL Editor** pada project baru.

---

## 2. Kredensial Akun Demo (2 Role: Admin GA & Vendor)

| Username | Email Auth | Role | Akses / Keterangan | Kata Sandi Default |
|---|---|---|---|---|
| `admin` / `admin.ga` | `admin@tps.co.id` | `admin_ga` | Administrator General Affairs (Kelola Master, Input, Verifikasi, Pengaturan) | `gatps2026` |
| `vendor` / `vendor.aisya` | `vendor@tps.co.id` | `vendor` | Rekanan Aisya Catering (V001) | `vendortps2026` |
| `vendor.ibu` | `vendor.ibu@tps.co.id` | `vendor` | Rekanan Catering IBU (V002) - Akun Demo Vendor Kedua untuk Uji Isolasi | `vendortps2026` |
| `admin2.ga` | `admin2.ga@tps.co.id` | `admin_ga` | Administrator General Affairs 2 (Multi-PIC) | `TpsCatering2026!` |
| `vendor.nikmat` | `vendor.nikmat@tps.co.id` | `vendor` | Rekanan Nikmat Rasa (V003) | `TpsCatering2026!` |
| `vendor.adhi` | `vendor.adhi@tps.co.id` | `vendor` | Rekanan Adhi Hidayah (V004) | `TpsCatering2026!` |
| `vendor.nurina` | `vendor.nurina@tps.co.id` | `vendor` | Rekanan Nurina Catering (V005) | `TpsCatering2026!` |

Seluruh akun di atas otomatis terdaftar saat mengeksekusi `DATABASE_LENGKAP_CATERING.sql`. Anda juga dapat menyinkronkannya kembali lewat perintah:
```bash
node scripts/seed-auth.mjs
```

---

## 3. Rumus Rotasi Vendor (Patent)

Rotasi 5 vendor dihitung dengan rumus deterministik:
$$\text{indeks vendor} = ((3 \times \Delta\text{hari dari 2026-10-01} + \text{urutan shift}) \bmod 5 + 5) \bmod 5$$

Urutan shift:
- `0`: Shift 1 (Siang: 08.00 - 16.00)
- `1`: Shift 2 (Sore: 16.00 - 24.00)
- `2`: Shift 3 (Malam: 00.00 - 08.00)

Daftar vendor:
- `0`: Aisya Catering (V001)
- `1`: Catering IBU (V002)
- `2`: Nikmat Rasa (V003)
- `3`: Adhi Hidayah (V004)
- `4`: Nurina Catering (V005)

Uji unit rumus rotasi:
```bash
npm test
```

---

## 4. Pengujian SQL Database

Tersedia berkas pengujian di `supabase/tests/`:

1. **`01_vendor_isolation.sql`**: Menguji isolasi data vendor (Vendor A tidak dapat membaca atau mengubah data milik Vendor B via query langsung maupun RPC).
2. **`02_rpc_business_rules.sql`**: Menguji integritas RLS, immutability trigger log dan revisi, keharusan kelengkapan bagian saat `kirim_catering`, self-verification blocker, dan validasi progres vendor.

### Cara Menjalankan Tes SQL:
1. Buka Supabase Dashboard > **SQL Editor**.
2. Buka tab baru, salin isi berkas `supabase/tests/01_vendor_isolation.sql` atau `supabase/tests/02_rpc_business_rules.sql`.
3. Klik **Run**.
4. Seluruh tes dijalankan dalam blok `begin ... rollback;` sehingga tidak merusak data operasional. Output `NOTICE: TEST PASSED` akan tampil pada panel hasil query.
