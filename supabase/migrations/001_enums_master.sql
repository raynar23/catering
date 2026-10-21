-- Enums and master tables

create extension if not exists "pgcrypto";

-- Enums
create type app_role as enum ('admin_ga', 'pic_unit', 'supervisor_ga', 'vendor');
create type order_status as enum ('draft', 'diajukan', 'final', 'revisi');
create type revision_status as enum ('menunggu', 'disetujui', 'ditolak');
create type vendor_response_status as enum ('menunggu', 'disanggupi', 'tidak_sanggup');
create type vendor_progress as enum ('menunggu', 'dipersiapkan', 'dikirim', 'sampai', 'selesai');
create type log_action as enum (
  'input_awal',
  'diajukan',
  'disetujui',
  'dikembalikan',
  'kirim_ke_vendor',
  'ganti_vendor',
  'vendor_sanggup',
  'vendor_tidak_sanggup',
  'vendor_update_progres',
  'revisi_diajukan',
  'revisi_respon_vendor',
  'revisi_disetujui',
  'revisi_ditolak',
  'impor_dokumen'
);

-- Master Shifts
create table shifts (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  label text not null,
  alias text not null,
  jam_mulai time not null,
  jam_selesai time not null,
  batas_tiba time not null,
  urutan integer not null default 0,
  urutan_laporan integer not null default 0,
  keterangan text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Master Bagian
create table bagian (
  id uuid primary key default gen_random_uuid(),
  kode text unique,
  nama text not null unique,
  kelompok text,
  lokasi_antar text,
  alias text,
  keterangan text,
  urutan integer not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Master Vendors
create table vendors (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  kontak text,
  alamat text,
  urutan_rotasi integer not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- User Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  nama text not null,
  role app_role not null,
  vendor_id uuid references vendors(id) on delete set null,
  bagian_id uuid references bagian(id) on delete set null,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_shifts_urutan on shifts (urutan);
create index idx_shifts_laporan on shifts (urutan_laporan);
create index idx_bagian_urutan on bagian (urutan);
create index idx_vendors_rotasi on vendors (urutan_rotasi);
create index idx_profiles_role on profiles (role);
create index idx_profiles_vendor on profiles (vendor_id);
