// scripts/seed-mixed-demo.mjs
// Seeds mixed demo statuses for October 2026 per PRD specifications.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function run() {
  console.log('Aligning October 2026 demo data distribution...');

  // Set sample vendor rejection response
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
        catatan_vendor: 'Kitchen capacity full for unscheduled night shift',
        respon_vendor_at: '2026-10-19T14:30:00Z',
      })
      .eq('id', o.id);
    console.log(`Order ${o.id} (2026-10-19) response set to: tidak_sanggup.`);
  }

  // Ensure sample pending revision exists
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
          alasan: 'Urgent security personnel overtime addition',
          status: 'menunggu',
          diajukan_oleh: '00000000-0000-0000-0000-000000000002',
          respon_vendor: 'menunggu',
        });
        console.log(`Pending revision created for item ${item.id}.`);
      } else {
        console.log(`Pending revision already exists for item ${item.id}.`);
      }
    }
  }

  console.log('Demo data distribution alignment complete.');
}

run().catch((err) => {
  console.error('Failed to align demo data:', err);
  process.exit(1);
});
