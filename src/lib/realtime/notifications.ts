// Client helpers for fetching and handling real-time notifications via get_notifikasi RPC
import { createClient } from "@/lib/supabase/client";

export interface NotificationItem {
  id: string;
  judul: string;
  pesan: string;
  tautan: string;
  waktu: string;
  tipe: "revisi" | "pesanan" | "progres" | "info";
}

export interface GetNotifikasiResponse {
  role: "admin_ga" | "vendor";
  total: number;
  revisi_menunggu?: number;
  vendor_tidak_sanggup?: number;
  pesanan_baru_menunggu_respon?: number;
  revisi_menunggu_respon?: number;
  items: NotificationItem[];
}

/**
 * Invokes the get_notifikasi RPC function to retrieve live actionable items and counts
 */
export async function fetchLiveNotifications(): Promise<GetNotifikasiResponse> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_notifikasi");

  if (error || !data) {
    return {
      role: "admin_ga",
      total: 0,
      items: [],
    };
  }

  return data as GetNotifikasiResponse;
}
