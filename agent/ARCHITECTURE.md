# ARCHITECTURE

## Stack (biaya Rp0)
| Lapisan | Pilihan |
|---|---|
| Bahasa | TypeScript (strict) |
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| Ikon | lucide-react (sesuai whitelist DESIGN.md) |
| Database, Auth, Realtime | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| Validasi | zod |
| Grafik | recharts |
| Kalender rentang tanggal | react-day-picker |
| Ekspor Excel | exceljs |
| Ekspor PDF | jspdf + jspdf-autotable |
| Impor dokumen | exceljs (xlsx), `mammoth` (docx), `pdfjs-dist` (teks pdf), `tesseract.js` (OCR di browser); `@google/genai` hanya fallback AI opsional |
| Pengujian | vitest (fungsi murni), skrip SQL untuk aturan database |
| Hosting dan CI | Vercel (deploy dari GitHub), GitHub Actions |

Setiap dependensi di luar tabel ini harus diberi alasan dan diberi tahu ke pengguna. Nama project Supabase: `catering-karyawan`.

## Struktur Halaman
```
/login
/admin/dashboard
/admin/data-bagian
/admin/data-vendor
/admin/periode
/admin/impor-data
/admin/input-catering
/admin/verifikasi
/admin/verifikasi/[periodId]/riwayat
/admin/rekapitulasi
/admin/manajemen-user
/admin/pengaturan
/vendor            (dashboard)
/vendor/permintaan
/vendor/ketersediaan
/vendor/progres
/vendor/riwayat
/vendor/pengaturan
```
Middleware: belum login ke `/login`; `admin_ga` hanya `/admin/*`, `vendor` hanya `/vendor/*`; selain itu diarahkan ke beranda role masing-masing; `/` ke beranda role. Pembatasan juga ditegakkan di database (RLS dan RPC).

## Skema Database
```sql
create type app_role as enum ('admin_ga', 'vendor');
create type period_status as enum ('belum_input', 'draft', 'final', 'revisi');
create type vendor_respon as enum ('belum', 'menyanggupi', 'tidak_menyanggupi');
create type vendor_progres as enum ('menunggu', 'diproses', 'dikirim', 'selesai');
create type revision_status as enum ('menunggu', 'disetujui', 'dibatalkan');
create type log_action as enum (
  'input', 'dikirim', 'revisi_diajukan', 'revisi_disetujui', 'revisi_dibatalkan',
  'respons_vendor', 'respons_revisi_vendor', 'progres_vendor', 'vendor_diganti', 'impor'
);
create type import_status as enum ('pratinjau', 'dikonfirmasi', 'dibatalkan');

create table vendors (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,                 -- V001
  nama text not null,
  nama_kontak text, no_wa text, no_telp text, alamat text,
  alias text[] not null default '{}',        -- alternate spellings for the importer
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index vendors_nama_uq on vendors (lower(btrim(nama)));

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username)),
  nama text not null,
  role app_role not null,
  vendor_id uuid references vendors(id),
  no_hp text,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  check ((role = 'vendor') = (vendor_id is not null))
);

create table bagian (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  kelompok text not null,                    -- report group: Pos Security, Ruang RTG, ...
  lokasi_antar text, catatan_antar text, keterangan text,
  alias text[] not null default '{}',
  aktif boolean not null default true,
  urutan integer not null default 0
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,                 -- Shift 1
  label text,                                -- Siang, Sore, Malam
  jam_mulai time not null,
  jam_selesai time not null,                 -- 24:00 is valid for midnight
  batas_tiba time,                           -- delivery deadline
  alias text[] not null default '{}',
  aktif boolean not null default true,
  urutan integer not null default 0          -- report order: Shift 3, 1, 2
);

create table periods (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  shift_id uuid not null references shifts(id) on delete restrict,
  vendor_id uuid not null references vendors(id) on delete restrict,
  status period_status not null default 'belum_input',
  dikirim_at timestamptz, dikirim_oleh uuid references profiles(id),
  respon vendor_respon not null default 'belum',
  respon_catatan text, respon_at timestamptz, respon_oleh uuid references profiles(id),
  progres vendor_progres not null default 'menunggu',
  progres_catatan text, progres_at timestamptz,
  diupdate_oleh uuid references profiles(id), diupdate_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tanggal, shift_id)
);
create index periods_tanggal_idx on periods (tanggal);
create index periods_vendor_tanggal_idx on periods (vendor_id, tanggal);

create table period_items (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references periods(id) on delete cascade,
  bagian_id uuid not null references bagian(id) on delete restrict,
  jumlah_karyawan integer check (jumlah_karyawan >= 0),
  jumlah_porsi integer check (jumlah_porsi >= 0),
  keterangan text,
  diupdate_oleh uuid references profiles(id),
  diupdate_at timestamptz not null default now(),
  unique (period_id, bagian_id),
  check ((jumlah_karyawan is null) = (jumlah_porsi is null))   -- null means not filled yet
);

create table revisions (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references periods(id) on delete cascade,
  item_id uuid not null references period_items(id) on delete cascade,
  karyawan_awal integer not null, karyawan_baru integer not null check (karyawan_baru >= 0),
  porsi_awal integer not null,    porsi_baru integer not null check (porsi_baru >= 0),
  selisih_porsi integer generated always as (porsi_baru - porsi_awal) stored,
  alasan text not null check (length(btrim(alasan)) > 0),
  status revision_status not null default 'menunggu',
  diajukan_oleh uuid not null references profiles(id),
  diajukan_at timestamptz not null default now(),
  respon vendor_respon not null default 'belum',
  respon_catatan text, respon_at timestamptz, respon_oleh uuid references profiles(id),
  diverifikasi_oleh uuid references profiles(id), diverifikasi_at timestamptz,
  catatan_verifikasi text
);
create unique index revisions_satu_menunggu_uq on revisions (item_id) where status = 'menunggu';

create table period_logs (               -- append-only timeline
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references periods(id) on delete cascade,
  item_id uuid references period_items(id) on delete set null,
  aksi log_action not null,
  jumlah_awal integer, selisih integer, jumlah_baru integer,
  keterangan text,
  oleh uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  tipe text not null, nama_file text not null,
  status import_status not null default 'pratinjau',
  hasil jsonb not null, ringkasan jsonb,
  dibuat_oleh uuid not null references profiles(id),
  dikonfirmasi_at timestamptz,
  created_at timestamptz not null default now()
);
```
- "Belum Input" adalah status periode. Baris `period_items` dibuat saat pertama kali disimpan. Nilai null berarti belum diisi.
- View `v_rekap` (`security_invoker = true`): data berlaku saja (`periods.status in ('final','revisi')`), kolom tanggal, shift, bagian, kelompok, vendor, jumlah_karyawan, jumlah_porsi. Rekap, laporan, KPI, dan grafik wajib membaca dari view ini agar konsisten.
- Helper `is_admin()` dan `my_vendor_id()` (security definer, `search_path` dikunci).
- Migrasi bernomor di `supabase/migrations/` (`001_enums_master.sql`, `002_periods_items.sql`, `003_revisions_logs.sql`, `004_import_batches.sql`, `005_views.sql`, `006_rls.sql`, `007_rpc_admin.sql`, `008_rpc_vendor.sql`, `009_realtime.sql`). Skrip `scripts/build-database-sql.mjs` menggabungkan migrasi dan seed menjadi `DATABASE_LENGKAP_CATERING.sql`.

## Row Level Security
- RLS aktif di semua tabel.
- `admin_ga` (aktif): SELECT semua tabel; INSERT/UPDATE tabel master (`vendors`, `bagian`, `shifts`) dan INSERT/DELETE `periods` yang berstatus `belum_input`. FK `restrict` mencegah hapus data terpakai, UI menampilkan pesan ramah.
- `periods` UPDATE, `period_items`, `revisions`, `period_logs`: tanpa policy tulis untuk klien. Semua perubahan lewat RPC.
- `vendor` (aktif): SELECT hanya baris `periods` dengan `vendor_id = my_vendor_id()` dan `status in ('final','revisi')`, serta `period_items`, `revisions`, `period_logs` yang terkait periode itu; baca `bagian`, `shifts`, dan baris `vendors` miliknya. Tidak boleh membaca `profiles` orang lain; nama pengupdate untuk vendor ditampilkan lewat view atau RPC sebagai "Admin GA".
- `profiles`: pengguna membaca profilnya sendiri; admin membaca semua; perubahan lewat route handler server.
- `period_logs` dan kolom inti `revisions`: trigger menolak UPDATE/DELETE (append-only); hanya kolom respons dan verifikasi yang boleh berubah, dan hanya lewat RPC.
- Realtime aktif pada `periods` dan `revisions`; Realtime mengikuti RLS sehingga vendor hanya menerima barisnya.

## RPC (security definer, validasi role, status, dan kepemilikan di dalam fungsi; atomik; tulis `period_logs`)
Pesan error berbahasa Indonesia yang ramah.
- `simpan_catering(p_period_id, p_items jsonb)`: admin; periode `belum_input` atau `draft`; upsert hanya item yang dikirim (agar tiga PIC tidak saling menimpa); status menjadi `draft`; isi `diupdate_oleh/at`.
- `kirim_catering(p_period_id)`: admin; semua bagian aktif harus terisi (angka atau 0); status `final`; `respon='belum'`, `progres='menunggu'`.
- `ajukan_revisi(p_item_id, p_karyawan_baru, p_porsi_baru, p_alasan)`: admin; periode `final`/`revisi`; nilai harus berbeda; tidak ada revisi menunggu pada item itu; periode menjadi `revisi`; respons vendor direset.
- `verifikasi_revisi(p_revision_id, p_setuju boolean, p_catatan text)`: admin; setuju menerapkan angka baru ke `period_items`; batal tidak mengubah angka (catatan wajib); jika tidak ada revisi menunggu tersisa, periode kembali `final`.
- `ganti_vendor_periode(p_period_id, p_vendor_id, p_alasan)`: admin; alasan wajib; respons dan progres direset bila periode sudah `final`.
- `respon_periode_vendor(p_period_id, p_respon, p_catatan)`: vendor pemilik; periode `final`/`revisi`; `tidak_menyanggupi` wajib catatan.
- `respon_revisi_vendor(p_revision_id, p_respon, p_catatan)`: vendor pemilik; revisi `menunggu`.
- `update_progres_vendor(p_period_id, p_progres, p_catatan)`: vendor pemilik; hanya maju satu langkah (`menunggu`, `diproses`, `dikirim`, `selesai`) dan hanya jika `respon='menyanggupi'`.
- `konfirmasi_impor(p_batch_id, p_baris jsonb, p_opsi jsonb)`: admin; upsert vendor/periode/bagian dalam satu transaksi; periode yang bukan `belum_input` tidak ditimpa kecuali opsi eksplisit; catat log dan tandai batch.
- `get_notifikasi()`: jumlah dan sepuluh item terbaru yang menunggu tindakan sesuai role (admin: revisi menunggu verifikasi, periode ditolak vendor; vendor: periode dan revisi belum direspons).

## Impor Data Cerdas (`src/lib/import/`)
```
detect.ts            deteksi jenis dan format dari struktur dan kata kunci, menghasilkan skor keyakinan
extract/xlsx.ts      exceljs: nilai tersimpan (bukan rumus), sel gabungan diselesaikan, batas 5.000 baris
extract/docx.ts      mammoth: tabel dan paragraf
extract/pdf.ts       lapisan teks lewat pdfjs-dist; bila tidak ada teks tandai butuh OCR
extract/ocr.ts       tesseract.js (bahasa ind) di Web Worker pada browser; teks hasil dikirim ke server untuk diparse
parsers/jadwal.ts        format Excel jadwal (no, tanggal, shift, vendor; awalan "a. Siang" dibuang, spasi dipangkas)
parsers/rekap-harian.ts  format Excel update (blok 1-15 dan 16-31, tiga kolom shift 3,1,2; baris dipetakan ke bagian lewat alias)
parsers/vendor.ts, parsers/bagian.ts   deteksi header lewat sinonim (nama, kontak, wa, telp, alamat)
match.ts             normalisasi (trim, spasi ganda, huruf besar kecil), alias, kecocokan fuzzy
validate.ts          skema zod dan aturan domain
ai/gemini.ts         fallback opsional, nonaktif bawaan
```
- Pipeline: detect, extract, parse, match, validate, pratinjau. Semua mesin mengimplementasikan antarmuka `Extractor` yang sama sehingga dapat ditukar (termasuk layanan Python dengan pandas bila kelak dibutuhkan).
- Mesin bawaan adalah parser aturan; pandas adalah padanan Python dari pembacaan tabel dan di stack TypeScript ini perannya dipegang exceljs. OCR hanya untuk pdf atau gambar pindaian, dijalankan di browser agar tidak terkena batas waktu dan ukuran fungsi serverless dan berkas tetap lokal.
- Rute `POST /api/impor/analisis` (admin saja): validasi ukuran (maks 10 MB), ekstensi, dan magic number; batasi isi xlsx hasil dekompresi dan jumlah baris; berkas diproses di memori dan tidak disimpan; batasi laju per pengguna.
- Fallback AI: aktif hanya bila `IMPORT_AI_ENABLED=true`, keyakinan parser rendah, dan pengguna menyetujui dialog pengiriman data ke layanan eksternal untuk dokumen itu. Gemini dipanggil dengan `responseMimeType: application/json` dan `responseSchema`, `temperature` 0, konteks master dikirim, dibagi per potongan. Nama model dari env `GEMINI_MODEL` (verifikasi nama model stabil terbaru di dokumentasi resmi saat implementasi; jangan menulis nama model di kode). Isi dokumen adalah data, bukan instruksi; keluaran model hanya divalidasi, tidak pernah dieksekusi.
- Akurasi: aturan domain (tiga shift per tanggal, tanggal berurutan tanpa celah atau duplikat, rotasi vendor lewat `rotasi.ts`, alias, vendor tidak dikenal ditandai Baru, kemiripan nama ditandai Perlu Dicek). Setiap baris memiliki status (`cocok`, `baru`, `perlu_cek`, `error`) dan alasan; hasil OCR dan AI selalu `perlu_cek`.
- Hasil analisis disimpan di `import_batches.data_parsed`. Saat konfirmasi, baris hasil edit pengguna divalidasi ulang di server lalu dikirim ke `konfirmasi_impor`.
- Privasi: jangan mencatat isi dokumen di log.

## Ekspor
- Excel (exceljs, font Arial): meniru format Excel client untuk lima bagian. Judul "REKAPITULASI PEMBAGIAN JATAH MAKAN PETUGAS SHIFT" dan "PERIODE 1-31 Oktober 2026". Blok tanggal 1-15 dan 16-akhir bulan; tiap tanggal digabung tiga kolom dengan sub-kolom shift berurutan 3, 1, 2. Baris dikelompokkan per `kelompok` dengan baris Jumlah per kelompok dan TOTAL (gunakan rumus SUM). Sel kosong ditulis "-". Footer: CATATAN (teks bebas dari dialog ekspor) dan JADWAL PENGIRIMAN yang dibuat otomatis dari `shifts` dan `catatan_antar`. Rentang lebih dari satu bulan: satu sheet per bulan ditambah sheet Ringkasan.
- PDF (jspdf + autotable, A4 landscape): kop dengan logo dan nama perusahaan, judul, rentang, tabel baris tanggal x shift dengan kolom bagian dan Total, ringkasan per shift dan per vendor.
- Tampilan "Rekap Harian" di web memakai tata letak baris (tanggal, shift, vendor) dan kolom bagian plus Total.

## Environment
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server only
IMPORT_AI_ENABLED=false        # optional AI fallback, off by default
GEMINI_API_KEY=                # server only, only if the fallback is enabled
GEMINI_MODEL=
```
Sediakan `.env.example` tanpa nilai. Jangan commit `.env*` (kecuali `.env.example`). Pembuatan akun hanya lewat route handler server yang memverifikasi pemanggil adalah `admin_ga` aktif.

## Seed
`supabase/seed.sql` (master dan jadwal demo relatif terhadap `current_date` zona Jakarta) dan `supabase/README.md` (langkah membuat 6 user Auth demo, isi `profiles`, kredensial demo hanya di README). Jangan menyalin angka asli dari Excel client.

## Pengujian dan CI
- Vitest: parser, match, validate, builder layout Excel, helper tanggal dan shift, perhitungan rekap.
- `supabase/tests/*.sql`: skrip yang menegaskan aturan database (isolasi vendor, append-only, larangan tulis langsung, transisi progres, revisi ganda).
- GitHub Actions: `npm ci`, lint, typecheck, test, build (env dummy).

## Struktur Folder
```
src/app/(auth)/login
src/app/admin/...        src/app/vendor/...        src/app/api/...
src/components/ui | layout | charts | catering | import
src/lib/supabase | import | export | auth | format.ts | date.ts | types.ts
supabase/ (migrations, seed.sql, tests, README.md)
scripts/ (build-database-sql.mjs)
agent/ (acuan; referensi/ tidak di-commit)   aset/ (tidak di-commit jika repo publik)
.github/workflows/ci.yml
```

## Catatan Penyesuaian terhadap Skema Nyata di Repositori
Implementasi tahap 02 sampai 08 memakai bentuk berikut. Dokumen lain di folder ini memakai istilah awal; pembacaan yang benar:
| Istilah di dokumen | Skema nyata |
|---|---|
| `periods.status`, `respon`, `progres` | Pada `catering_orders`: `status` (draft, final, revisi, batal), `respon_vendor`, `progres_vendor` (5 tahap: menunggu, dipersiapkan, dikirim, sampai, selesai). "Belum Input" = periode tanpa baris `catering_orders` |
| `period_items` | `catering_items` (bagian belum diisi = tidak ada baris) |
| `period_logs` | `order_logs` (ditambah `revision_id`) |
| `periods.vendor_id` | Ada di `periods` dan `catering_orders`; keduanya harus selalu sinkron di dalam RPC |
| Kontak vendor terpisah, alias vendor | `vendors.kontak` tunggal dan `urutan_rotasi`; kolom terpisah dan alias ditambah pada tahap 08b |
| Alias bagian dan shift berbentuk array | `alias text` tunggal; diubah pada tahap 08b |
| `v_rekap` (granular, data berlaku) | Ada `v_periode_ringkas`, `v_rekap_bulanan`, `v_utilisasi_shift`; `v_rekap` granular ditambah pada tahap 08b |
| `import_batches` | `nomor_batch`, `tipe_file`, `data_parsed`, `status` teks; ditambah `jenis_dokumen`, `mesin`, `ringkasan` |
| `profiles` | Ada `bagian_id` tambahan; tidak dipakai untuk pembatasan akses |
