-- Analytical and vendor safe views
create or replace view v_rekap with (security_invoker = true) as
select
  o.id as order_id,
  p.id as period_id,
  p.tanggal,
  s.id as shift_id,
  s.nama as shift_nama,
  s.label as shift_label,
  s.alias as shift_alias,
  s.urutan as shift_urutan,
  s.urutan_laporan as shift_urutan_laporan,
  v.id as vendor_id,
  v.kode as vendor_kode,
  v.nama as vendor_nama,
  b.id as bagian_id,
  b.kode as bagian_kode,
  b.nama as bagian_nama,
  b.kelompok as bagian_kelompok,
  b.lokasi_antar as bagian_lokasi_antar,
  b.urutan as bagian_urutan,
  ci.jumlah_karyawan,
  ci.jumlah_porsi,
  ci.keterangan as keterangan_item,
  o.status as order_status,
  o.respon_vendor,
  o.respon_vendor_at,
  o.progres_vendor,
  o.progres_vendor_at
from catering_orders o
join periods p on p.id = o.period_id
join shifts s on s.id = p.shift_id
join vendors v on v.id = o.vendor_id
join catering_items ci on ci.order_id = o.id
join bagian b on b.id = ci.bagian_id
where o.status in ('final', 'revisi');

-- View v_timeline_vendor: Safe timeline view masking GA internal staff identities
create or replace view v_timeline_vendor with (security_invoker = true) as
select
  ol.id as log_id,
  ol.order_id,
  o.vendor_id,
  ol.aksi,
  ol.jumlah_awal,
  ol.selisih,
  ol.jumlah_baru,
  ol.keterangan,
  case
    when pr.role in ('admin_ga', 'pic_unit', 'supervisor_ga') then 'Tim General Affairs'
    else pr.nama
  end as nama_pengupdate,
  ol.created_at
from order_logs ol
join catering_orders o on o.id = ol.order_id
join profiles pr on pr.id = ol.oleh;
