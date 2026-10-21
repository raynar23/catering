// WhatsApp link generator and Indonesian phone number normalizer

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
