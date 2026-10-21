# ARCHITECTURE

## Stack (biaya Rp0)
| Lapisan | Pilihan |
|---|---|
| Bahasa | TypeScript (strict) |
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| Ikon | lucide-react |
| Database | Supabase PostgreSQL (free tier) |
| Auth | Supabase Auth (email + password, dipetakan dari username) |
| Realtime | Supabase Realtime |
| Grafik | Recharts |
| Ekspor Excel | `xlsx` (SheetJS) |
| Ekspor PDF | `jspdf` + `jspdf-autotable` |
| Hosting | Vercel (free tier), deploy dari GitHub |

Nama project Supabase: `catering-karyawan`. Dependensi lain hanya jika ada alasan kuat dan diberi tahu ke pengguna.

## Struktur Halaman
```
/login
/dashboard
/data-bagian
/data-vendor
/periode
/input-catering
/verifikasi
/verifikasi/[orderId]/riwayat
/rekapitulasi
/laporan
/manajemen-user
```
Middleware: belum login ke `/login`; role tanpa hak menu diarahkan ke `/dashboard`; `/` ke `/dashboard`. Pembatasan juga ditegakkan di database (RLS dan RPC), bukan hanya di UI.

## Skema Database
```sql
create type app_role as enum ('admin_ga', 'vendor');
create type order_status as enum ('draft', 'diajukan', 'final', 'revisi');
create type revision_status as enum ('menunggu', 'disetujui', 'ditolak');
create type log_action as enum (
  'input_awal', 'diajukan', 'disetujui', 'dikembalikan',
  'revisi_diajukan', 'revisi_disetujui', 'revisi_ditolak'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  nama text not null,
  role app_role not null,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table bagian (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  keterangan text,
  aktif boolean not null default true,
  urutan integer not null default 0
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,          -- V001 ...
  nama text not null,
  kontak text,
  alamat text,
  aktif boolean not null default true
);

create table shifts (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,          -- Shift 1
  jam_mulai time not null,
  jam_selesai time not null,
  keterangan text,                    -- Pagi, Siang, Malam
  aktif boolean not null default true,
  urutan integer not null default 0
);

create table periods (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  shift_id uuid not null references shifts(id) on delete restrict,
  keterangan text,
  unique (tanggal, shift_id)
);

create table catering_orders (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null unique references periods(id) on delete restrict,
  vendor_id uuid not null references vendors(id) on delete restrict,
  status order_status not null default 'draft',
  created_by uuid not null references profiles(id),
  submitted_by uuid references profiles(id),
  submitted_at timestamptz,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table catering_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references catering_orders(id) on delete cascade,
  bagian_id uuid not null references bagian(id) on delete restrict,
  jumlah_karyawan integer not null check (jumlah_karyawan >= 0),
  jumlah_porsi integer not null check (jumlah_porsi >= 0),
  keterangan text,
  unique (order_id, bagian_id)
);

create table revisions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references catering_items(id) on delete cascade,
  karyawan_awal integer not null,
  karyawan_baru integer not null check (karyawan_baru >= 0),
  porsi_awal integer not null,
  porsi_baru integer not null check (porsi_baru >= 0),
  selisih_porsi integer generated always as (porsi_baru - porsi_awal) stored,
  alasan text not null check (length(trim(alasan)) > 0),
  status revision_status not null default 'menunggu',
  diajukan_oleh uuid not null references profiles(id),
  diajukan_at timestamptz not null default now(),
  diverifikasi_oleh uuid references profiles(id),
  diverifikasi_at timestamptz,
  catatan_verifikator text
);

create table order_logs (            -- append-only timeline
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references catering_orders(id) on delete cascade,
  item_id uuid references catering_items(id) on delete set null,
  aksi log_action not null,
  jumlah_awal integer,
  selisih integer,
  jumlah_baru integer,
  keterangan text,
  oleh uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
```
- "Belum Input" bukan status tersimpan: periode tanpa baris `catering_orders`.
- Buat view `v_rekap` (`security_invoker = true`): data berlaku saja (`status in ('final','revisi')`) berisi tanggal, shift, bagian, vendor, jumlah_karyawan, jumlah_porsi. Rekap, laporan, dan KPI wajib membaca dari view ini agar konsisten.
- Helper `current_role()` dan `is_role(variadic roles)` (security definer, `search_path` dikunci) untuk policy dan RPC.

## Row Level Security
- RLS aktif di semua tabel.
- SELECT: semua pengguna login (aktif) boleh membaca semua tabel di atas (asumsi A5).
- `bagian`, `vendors`, `shifts`, `periods`: INSERT/UPDATE/DELETE hanya `admin_ga`. FK `on delete restrict` mencegah hapus data terpakai; UI menampilkan pesan ramah dan menawarkan nonaktifkan.
- `catering_orders`, `catering_items`, `revisions`, `order_logs`: tanpa policy INSERT/UPDATE/DELETE untuk klien. Semua perubahan lewat RPC di bawah.
- `order_logs` dan kolom inti `revisions` (angka, alasan, pengaju): trigger menolak UPDATE/DELETE (append-only). Hanya kolom verifikasi `revisions` yang boleh berubah, dan hanya lewat RPC.
- `profiles`: INSERT/UPDATE hanya lewat route handler server (service role) atau `admin_ga`.
- Realtime aktif pada `catering_orders` dan `revisions`.

## RPC (security definer, validasi role dan status di dalam fungsi)
Semua atomik dan menulis `order_logs` dalam transaksi yang sama.
- `simpan_catering(p_period_id, p_vendor_id, p_items jsonb, p_ajukan boolean)`: role `admin_ga`/`pic_unit`; hanya jika pesanan belum ada atau berstatus `draft`; upsert order dan item (satu baris per bagian aktif); jika `p_ajukan` maka status `diajukan` dan isi `submitted_by/at`.
- `verifikasi_catering(p_order_id, p_setuju boolean, p_catatan text)`: role `supervisor_ga`; status harus `diajukan`; `auth.uid()` tidak boleh sama dengan `submitted_by`; setuju menjadi `final`, tolak menjadi `draft` (catatan wajib).
- `ajukan_revisi(p_item_id, p_karyawan_baru, p_porsi_baru, p_alasan)`: role `admin_ga`/`pic_unit`; order harus `final`/`revisi`; tidak boleh ada revisi `menunggu` untuk item yang sama; angka baru harus berbeda; order menjadi `revisi`.
- `verifikasi_revisi(p_revision_id, p_setuju boolean, p_catatan text)`: role `supervisor_ga`; pengaju tidak boleh sama dengan verifikator; setuju memperbarui `catering_items`; tolak (catatan wajib) tidak mengubah angka; jika tidak ada revisi `menunggu` tersisa, order kembali `final`.
- Pesan error dari RPC ditulis dalam Bahasa Indonesia yang ramah (`raise exception` dengan teks jelas).

## Pembuatan Akun
Admin GA membuat akun lewat route handler server yang memakai `SUPABASE_SERVICE_ROLE_KEY`. Handler wajib memverifikasi dahulu bahwa pemanggil adalah `admin_ga` aktif. Key ini hanya variabel environment server (tanpa awalan `NEXT_PUBLIC`), tidak pernah di klien atau repository. Email Auth = `username@tps.co.id` (A10).

## Environment
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only, jangan commit
```
Sediakan `.env.example` tanpa nilai. Jangan commit `.env.local`.

## Waktu
Semua tanggal bertipe `date` atau `timestamptz`; "hari ini" dan format tampilan dihitung di `Asia/Jakarta`.

## Seed
`supabase/seed.sql` dan `supabase/README.md`: langkah membuat 3 user Auth (admin.ga, pic.unit, supervisor.ga), isi `profiles`, master, periode, pesanan, dan satu revisi menunggu sesuai bagian Data Demo di PRD.md. Tanggal seed dihitung relatif terhadap `current_date` (zona Jakarta) agar demo selalu "hari ini". Kredensial demo hanya di README, tidak di halaman login. Di akhir proyek gabungkan skema, RLS, RPC, dan seed menjadi satu file `DATABASE_LENGKAP_<NAMA>.sql` yang dapat dijalankan sekali di SQL Editor.

## Deploy
1. Push ke GitHub. 2. Import ke Vercel. 3. Isi 3 environment variable. 4. Deploy.
Catatan: free tier Supabase menidurkan project yang lama tidak dipakai; buka aplikasi beberapa hari sebelum demo.

## Struktur Folder (saran)
```
src/app/(auth)/login
src/app/(app)/dashboard, data-bagian, data-vendor, periode,
              input-catering, verifikasi, rekapitulasi, laporan, manajemen-user
src/app/api/users
src/components/ui, src/components/layout, src/components/charts
src/lib/supabase (client.ts, server.ts, middleware.ts)
src/lib/ (types.ts, format.ts, permissions.ts, export/)
supabase/ (schema.sql, rls.sql, rpc.sql, seed.sql, README.md)
agent/ (file acuan), aset/ (logo, foto terminal)
```
