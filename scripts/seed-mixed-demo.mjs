// scripts/seed-mixed-demo.mjs
// Mengondisikan data demo Oktober 2026 agar memuat variasi status lengkap sesuai PRD:
// - Belum Input (28 periode tanggal 22-31 Okt)
// - Draft (2 pesanan)
// - Final dengan respon disanggupi (mayoritas)
// - Final dengan respon tidak sanggup (1-2 pesanan contoh penolakan kapasitas vendor)
// - Revisi dengan revisi berstatus menunggu verifikasi
// - Variasi progres vendor: menunggu, dipersiapkan, dikirim, selesai

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Environment variables Supabase belum disetel.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function run() {
  console.log('Menyelaraskan variasi status demo data Oktober 2026...');

  // 1. Ambil pesanan tanggal 2026-10-18 atau 2026-10-19 untuk respon tidak_sanggup
  const { data: targetOrders } = await supabase
    .from('catering_orders')
    .select('id, status, respon_vendor, periods!inner(tanggal, shift_id)')
    .eq('periods.tanggal', '2026-10-19')
    .limit(1);

  if (targetOrders && targetOrders.length > 0) {
    const o = targetOrders[0];
    await supabase
      .from('catering_orders')
      .update({
        respon_vendor: 'tidak_sanggup',
        catatan_vendor: 'Kapasitas dapur penuh untuk shift malam mendadak',
        respon_vendor_at: '2026-10-19T14:30:00Z',
      })
      .eq('id', o.id);
    console.log(`Pesanan ${o.id} (2026-10-19) disetel respon: tidak_sanggup.`);
  }

  // 2. Pastikan ada revisi berstatus menunggu pada pesanan revisi 2026-10-21
  const { data: revisiOrders } = await supabase
    .from('catering_orders')
    .select('id, catering_items(id, jumlah_porsi, jumlah_karyawan)')
    .eq('status', 'revisi')
    .limit(1);

  if (revisiOrders && revisiOrders.length > 0) {
    const revOrder = revisiOrders[0];
    const item = revOrder.catering_items?.[0];
    if (item) {
      const { data: existingRev } = await supabase
        .from('revisions')
        .select('id, status')
        .eq('item_id', item.id)
        .eq('status', 'menunggu')
        .limit(1);

      if (!existingRev || existingRev.length === 0) {
        await supabase.from('revisions').insert({
          item_id: item.id,
          karyawan_awal: item.jumlah_karyawan,
          karyawan_baru: item.jumlah_karyawan + 3,
          porsi_awal: item.jumlah_porsi,
          porsi_baru: item.jumlah_porsi + 3,
          selisih_porsi: 3,
          alasan: 'Penambahan 3 personil pengamanan lembur mendadak',
          status: 'menunggu',
          diajukan_oleh: '00000000-0000-0000-0000-000000000002',
          respon_vendor: 'menunggu',
        });
        console.log(`Revisi menunggu berhasil dibuat untuk item ${item.id}.`);
      } else {
        console.log(`Revisi menunggu sudah aktif pada item ${item.id}.`);
      }
    }
  }

  console.log('Penyelarasan variasi status demo data selesai.');
}

run().catch((err) => {
  console.error('Error menyelaraskan demo:', err);
  process.exit(1);
});
