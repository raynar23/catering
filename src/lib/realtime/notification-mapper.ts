// Pure notification mapping functions translating database events into human-readable messages
import { ToastVariant } from "@/components/ui/Toast";

export interface RealtimeEventPayload<T = any> {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T;
}

export interface NotificationMessage {
  title: string;
  description: string;
  variant: ToastVariant;
  link?: string;
  forRole: "admin_ga" | "vendor" | "all";
  targetVendorId?: string | null;
}

/**
 * Pure function mapping a database mutation event to a user notification message
 */
export function mapRealtimePayloadToNotification(
  payload: RealtimeEventPayload,
  userRole: "admin_ga" | "vendor",
  userVendorId?: string | null
): NotificationMessage | null {
  const { table, eventType, new: newRec, old: oldRec } = payload;
  if (!newRec && !oldRec) return null;

  // 1. Catering orders mutations
  if (table === "catering_orders") {
    const targetVendorId = newRec?.vendor_id || oldRec?.vendor_id;

    // Filter by vendor isolation: if current user is vendor, ignore events for other vendors
    if (userRole === "vendor" && userVendorId && targetVendorId !== userVendorId) {
      return null;
    }

    if (eventType === "UPDATE") {
      // Order submitted by GA to vendor (transition draft -> final/revisi)
      if (oldRec?.status === "draft" && (newRec?.status === "final" || newRec?.status === "revisi")) {
        if (userRole === "vendor") {
          return {
            title: "Permintaan Baru dari GA",
            description: "Pesanan katering baru telah diterbitkan dan siap dikonfirmasi.",
            variant: "default",
            link: "/vendor/ketersediaan",
            forRole: "vendor",
            targetVendorId,
          };
        }
      }

      // Vendor response status updated
      if (oldRec?.respon_vendor !== newRec?.respon_vendor) {
        if (newRec?.respon_vendor === "disanggupi" && userRole === "admin_ga") {
          return {
            title: "Vendor Menyanggupi Pesanan",
            description: "Mitra vendor telah menyatakan sanggup memenuhi pesanan katering.",
            variant: "success",
            link: "/admin/verifikasi",
            forRole: "admin_ga",
            targetVendorId,
          };
        }

        if (newRec?.respon_vendor === "tidak_sanggup" && userRole === "admin_ga") {
          return {
            title: "Pesanan Ditolak Vendor",
            description: "Mitra vendor menyatakan tidak sanggup. Harap segera lakukan penyesuaian vendor.",
            variant: "danger",
            link: "/admin/verifikasi",
            forRole: "admin_ga",
            targetVendorId,
          };
        }
      }

      // Vendor delivery progress updated
      if (oldRec?.progres_vendor !== newRec?.progres_vendor) {
        if (userRole === "admin_ga") {
          const stageName = newRec?.progres_vendor || "diperbarui";
          return {
            title: "Pembaruan Progres Pengiriman",
            description: `Mitra vendor memperbarui progres ke tahap '${stageName}'.`,
            variant: "default",
            link: "/admin/periode",
            forRole: "admin_ga",
            targetVendorId,
          };
        }
      }
    }

    if (eventType === "INSERT") {
      if (newRec?.status === "final" && userRole === "vendor") {
        return {
          title: "Permintaan Baru dari GA",
          description: "Pesanan katering baru siap dikonfirmasi.",
          variant: "default",
          link: "/vendor/ketersediaan",
          forRole: "vendor",
          targetVendorId,
        };
      }
    }
  }

  // 2. Revisions mutations
  if (table === "revisions") {
    if (eventType === "INSERT") {
      if (newRec?.status === "menunggu") {
        if (userRole === "admin_ga") {
          return {
            title: "Revisi Menunggu Verifikasi",
            description: "Pengajuan perubahan kuota porsi baru menunggu persetujuan General Affairs.",
            variant: "default",
            link: "/admin/verifikasi",
            forRole: "admin_ga",
          };
        }

        if (userRole === "vendor") {
          return {
            title: "Pengajuan Revisi Kuota",
            description: "Pengajuan perubahan kuota porsi baru membutuhkan konfirmasi vendor.",
            variant: "default",
            link: "/vendor/ketersediaan",
            forRole: "vendor",
          };
        }
      }
    }

    if (eventType === "UPDATE") {
      if (oldRec?.status === "menunggu" && newRec?.status === "disetujui") {
        if (userRole === "vendor") {
          return {
            title: "Revisi Porsi Disetujui",
            description: "General Affairs telah menyetujui pengajuan perubahan kuota katering.",
            variant: "success",
            link: "/vendor/permintaan",
            forRole: "vendor",
          };
        }
      }

      if (oldRec?.status === "menunggu" && newRec?.status === "ditolak") {
        if (userRole === "vendor") {
          return {
            title: "Revisi Porsi Ditolak",
            description: "General Affairs menolak pengajuan perubahan kuota katering.",
            variant: "danger",
            link: "/vendor/permintaan",
            forRole: "vendor",
          };
        }
      }
    }
  }

  // 3. Periods mutations (Vendor reassignment)
  if (table === "periods") {
    if (eventType === "UPDATE" && oldRec?.vendor_id !== newRec?.vendor_id) {
      if (userRole === "vendor" && userVendorId && newRec?.vendor_id === userVendorId) {
        return {
          title: "Penugasan Periode Baru",
          description: "Jadwal katering baru dialokasikan ke vendor Anda.",
          variant: "default",
          link: "/vendor/ketersediaan",
          forRole: "vendor",
          targetVendorId: newRec?.vendor_id,
        };
      }
    }
  }

  return null;
}
