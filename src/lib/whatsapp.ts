// WhatsApp link generator and Indonesian phone number normalizer
import { formatDateIndonesian } from "./date";
import { formatDelta } from "./catering/log-formatter";

export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith("8")) {
    return `62${digits}`;
  }
  if (digits.startsWith("62")) {
    return digits;
  }
  return digits;
}

export function waLink(noTelepon: string, pesan?: string): string {
  const normalized = normalizePhoneNumber(noTelepon);
  if (!normalized) return "";

  const baseUrl = `https://wa.me/${normalized}`;
  if (!pesan || !pesan.trim()) {
    return baseUrl;
  }
  return `${baseUrl}?text=${encodeURIComponent(pesan.trim())}`;
}

export interface RevisionWaParams {
  vendorNama?: string;
  tanggal: string;
  shiftNama: string;
  bagianNama: string;
  porsiAwal: number;
  porsiBaru: number;
  selisih: number;
  alasan: string;
}

// Build pure formatted WhatsApp message for catering revision requests
export function buildRevisionWaMessage(params: RevisionWaParams): string {
  const {
    vendorNama,
    tanggal,
    shiftNama,
    bagianNama,
    porsiAwal,
    porsiBaru,
    selisih,
    alasan,
  } = params;

  const recipient = vendorNama ? `Halo Tim ${vendorNama}` : "Halo Tim Vendor Catering TPS";
  const tglFormatted = formatDateIndonesian(tanggal);
  const deltaStr = formatDelta(selisih);

  return `${recipient},
Pemberitahuan perubahan kuota pesanan catering:
- Tanggal: ${tglFormatted}
- Shift: ${shiftNama}
- Bagian: ${bagianNama}
- Perubahan: ${porsiAwal} menjadi ${porsiBaru} porsi (${deltaStr})
- Alasan: ${alasan}

Mohon konfirmasi kesanggupan atas perubahan kuota tersebut. Terima kasih.`;
}

export interface VendorFollowUpWaParams {
  vendorNama?: string;
  tanggal: string;
  shiftNama: string;
  catatan?: string;
}

// Build pure formatted WhatsApp message for vendor follow-up
export function buildVendorFollowUpWaMessage(
  params: VendorFollowUpWaParams
): string {
  const { vendorNama, tanggal, shiftNama, catatan } = params;
  const recipient = vendorNama ? `Halo Tim ${vendorNama}` : "Halo Tim Vendor Catering TPS";
  const tglFormatted = formatDateIndonesian(tanggal);
  const catatanLine = catatan ? `\n- Catatan: ${catatan}` : "";

  return `${recipient},
Konfirmasi operasional pesanan catering:
- Tanggal: ${tglFormatted}
- Shift: ${shiftNama}${catatanLine}

Mohon konfirmasi terkait pemenuhan kebutuhan catering operasional. Terima kasih.`;
}

