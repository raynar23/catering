-- Migration: 010_view_periode_ringkas
-- Fast period summary view preventing N+1 queries and adding index optimizations

create or replace view v_periode_ringkas with (security_invoker = true) as
select
  p.id as period_id,
  p.tanggal,
  p.shift_id,
  p.vendor_id,
  p.keterangan as period_keterangan,
  p.created_at as period_created_at,
  s.nama as shift_nama,
  s.label as shift_label,
  s.alias as shift_alias,
  s.jam_mulai as shift_jam_mulai,
  s.jam_selesai as shift_jam_selesai,
  s.batas_tiba as shift_batas_tiba,
  s.urutan as shift_urutan,
  s.urutan_laporan as shift_urutan_laporan,
  v.kode as vendor_kode,
  v.nama as vendor_nama,
  v.kontak as vendor_kontak,
  v.alamat as vendor_alamat,
  co.id as order_id,
  coalesce(co.status::text, 'belum_input') as status,
  coalesce(co.respon_vendor::text, 'menunggu') as respon_vendor,
  coalesce(co.progres_vendor::text, 'menunggu') as progres_vendor,
  coalesce(ci_agg.total_porsi, 0) as total_porsi,
  co.created_by,
  co.submitted_by,
  co.updated_at as order_updated_at,
  coalesce(prof_sub.nama, prof_upd.nama, prof_cre.nama) as diupdate_oleh
from periods p
join shifts s on s.id = p.shift_id
join vendors v on v.id = p.vendor_id
left join catering_orders co on co.period_id = p.id
left join lateral (
  select coalesce(sum(ci.porsi), 0)::integer as total_porsi
  from catering_items ci
  where ci.order_id = co.id
) ci_agg on true
left join profiles prof_sub on prof_sub.id = co.submitted_by
left join profiles prof_upd on prof_upd.id = co.verified_by
left join profiles prof_cre on prof_cre.id = co.created_by;

-- Performance indexes for period lookups and order aggregates
create index if not exists idx_periods_tanggal_shift on periods(tanggal, shift_id);
create index if not exists idx_periods_vendor_id on periods(vendor_id);
create index if not exists idx_catering_orders_period_id on catering_orders(period_id);
create index if not exists idx_catering_items_order_id on catering_items(order_id);
