// Pure log formatter for catering chronological audit logs

export interface OrderLogEntry {
  id?: string;
  aksi: string;
  jumlah_awal?: number | null;
  selisih?: number | null;
  jumlah_baru?: number | null;
  keterangan?: string | null;
  bagian_nama?: string | null;
}

// Format formatted delta text e.g. +3 or -2
export function formatDelta(selisih: number | null | undefined): string {
  if (selisih === null || selisih === undefined || isNaN(selisih)) {
    return "";
  }
  if (selisih > 0) {
    return `+${selisih}`;
  }
  return String(selisih);
}

// Pure formatter for log change description based on action type
export function formatLogChange(entry: OrderLogEntry): string {
  const { aksi, jumlah_awal, selisih, jumlah_baru, bagian_nama } = entry;
  const prefix = bagian_nama ? `[${bagian_nama}] ` : "";

  switch (aksi) {
    case "input_awal":
      return jumlah_baru !== null && jumlah_baru !== undefined
        ? `Pembuatan draft awal (${jumlah_baru} porsi)`
        : "Pembuatan draft kebutuhan catering";

    case "simpan_draft":
      return jumlah_baru !== null && jumlah_baru !== undefined
        ? `Pembaruan draft (${jumlah_baru} porsi)`
        : "Pembaruan draft catering";

    case "kirim_ke_vendor":
      return jumlah_baru !== null && jumlah_baru !== undefined
        ? `Pesanan difinalisasi (${jumlah_baru} porsi)`
        : "Pesanan difinalisasi dan dikirim ke vendor";

    case "revisi_diajukan": {
      const delta = formatDelta(selisih);
      const deltaStr = delta ? ` (${delta})` : "";
      if (jumlah_awal !== null && jumlah_awal !== undefined && jumlah_baru !== null && jumlah_baru !== undefined) {
        return `${prefix}${jumlah_awal} menjadi ${jumlah_baru}${deltaStr}`;
      }
      return `${prefix}Pengajuan revisi porsi${deltaStr}`;
    }

    case "revisi_disetujui": {
      const delta = formatDelta(selisih);
      const deltaStr = delta ? ` (${delta})` : "";
      if (jumlah_awal !== null && jumlah_awal !== undefined && jumlah_baru !== null && jumlah_baru !== undefined) {
        return `${prefix}Disetujui: ${jumlah_awal} menjadi ${jumlah_baru}${deltaStr}`;
      }
      return `${prefix}Revisi disetujui${deltaStr}`;
    }

    case "revisi_ditolak": {
      if (jumlah_awal !== null && jumlah_awal !== undefined) {
        return `${prefix}Ditolak: tetap ${jumlah_awal} porsi`;
      }
      return `${prefix}Revisi ditolak`;
    }

    case "respon_disanggupi":
      return "Vendor menyanggupi pesanan";

    case "respon_tidak_sanggup":
      return "Vendor tidak menyanggupi pesanan";

    case "progres_dipersiapkan":
      return "Vendor sedang menyiapkan makanan";

    case "progres_dikirim":
      return "Pesanan sedang dalam pengantaran ke lokasi";

    case "progres_sampai":
      return "Pesanan telah sampai di lokasi antar";

    case "progres_selesai":
      return "Pesanan selesai dan serah terima tuntas";

    case "ganti_vendor":
      return "Penggantian mitra vendor periode";

    default:
      return aksi.replace(/_/g, " ");
  }
}
