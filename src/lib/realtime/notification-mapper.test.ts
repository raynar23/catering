// Unit tests for realtime notification event mapper
import { describe, it, expect } from "vitest";
import { mapRealtimePayloadToNotification } from "./notification-mapper";

describe("realtime/notification-mapper.ts", () => {
  const VENDOR_A = "vendor-a-uuid";
  const VENDOR_B = "vendor-b-uuid";

  it("maps order finalization to notification for vendor", () => {
    const payload = {
      table: "catering_orders",
      eventType: "UPDATE" as const,
      old: { id: "o1", status: "draft", vendor_id: VENDOR_A },
      new: { id: "o1", status: "final", vendor_id: VENDOR_A },
    };

    const notifForVendor = mapRealtimePayloadToNotification(payload, "vendor", VENDOR_A);
    expect(notifForVendor).not.toBeNull();
    expect(notifForVendor?.title).toBe("Permintaan Baru dari GA");
    expect(notifForVendor?.link).toBe("/vendor/ketersediaan");

    // Vendor B should ignore Vendor A event
    const notifForVendorB = mapRealtimePayloadToNotification(payload, "vendor", VENDOR_B);
    expect(notifForVendorB).toBeNull();

    // Admin GA does not receive this specific notification
    const notifForAdmin = mapRealtimePayloadToNotification(payload, "admin_ga");
    expect(notifForAdmin).toBeNull();
  });

  it("maps vendor acceptance to success notification for admin", () => {
    const payload = {
      table: "catering_orders",
      eventType: "UPDATE" as const,
      old: { id: "o1", respon_vendor: "menunggu", vendor_id: VENDOR_A },
      new: { id: "o1", respon_vendor: "disanggupi", vendor_id: VENDOR_A },
    };

    const notif = mapRealtimePayloadToNotification(payload, "admin_ga");
    expect(notif).not.toBeNull();
    expect(notif?.title).toBe("Vendor Menyanggupi Pesanan");
    expect(notif?.variant).toBe("success");
    expect(notif?.link).toBe("/admin/verifikasi");
  });

  it("maps vendor rejection to danger notification for admin", () => {
    const payload = {
      table: "catering_orders",
      eventType: "UPDATE" as const,
      old: { id: "o1", respon_vendor: "menunggu", vendor_id: VENDOR_A },
      new: { id: "o1", respon_vendor: "tidak_sanggup", vendor_id: VENDOR_A },
    };

    const notif = mapRealtimePayloadToNotification(payload, "admin_ga");
    expect(notif).not.toBeNull();
    expect(notif?.title).toBe("Pesanan Ditolak Vendor");
    expect(notif?.variant).toBe("danger");
    expect(notif?.link).toBe("/admin/verifikasi");
  });

  it("maps delivery progress advancement for admin", () => {
    const payload = {
      table: "catering_orders",
      eventType: "UPDATE" as const,
      old: { id: "o1", progres_vendor: "dipersiapkan", vendor_id: VENDOR_A },
      new: { id: "o1", progres_vendor: "dikirim", vendor_id: VENDOR_A },
    };

    const notif = mapRealtimePayloadToNotification(payload, "admin_ga");
    expect(notif).not.toBeNull();
    expect(notif?.title).toBe("Pembaruan Progres Pengiriman");
    expect(notif?.description).toContain("dikirim");
    expect(notif?.link).toBe("/admin/periode");
  });

  it("maps revision creation for both admin and vendor", () => {
    const payload = {
      table: "revisions",
      eventType: "INSERT" as const,
      old: null,
      new: { id: "r1", status: "menunggu", item_id: "i1" },
    };

    const adminNotif = mapRealtimePayloadToNotification(payload, "admin_ga");
    expect(adminNotif).not.toBeNull();
    expect(adminNotif?.title).toBe("Revisi Menunggu Verifikasi");
    expect(adminNotif?.link).toBe("/admin/verifikasi");

    const vendorNotif = mapRealtimePayloadToNotification(payload, "vendor", VENDOR_A);
    expect(vendorNotif).not.toBeNull();
    expect(vendorNotif?.title).toBe("Pengajuan Revisi Kuota");
    expect(vendorNotif?.link).toBe("/vendor/ketersediaan");
  });

  it("maps revision approval and rejection for vendor", () => {
    const approvedPayload = {
      table: "revisions",
      eventType: "UPDATE" as const,
      old: { id: "r1", status: "menunggu" },
      new: { id: "r1", status: "disetujui" },
    };

    const appNotif = mapRealtimePayloadToNotification(approvedPayload, "vendor", VENDOR_A);
    expect(appNotif?.title).toBe("Revisi Porsi Disetujui");
    expect(appNotif?.variant).toBe("success");

    const rejectedPayload = {
      table: "revisions",
      eventType: "UPDATE" as const,
      old: { id: "r1", status: "menunggu" },
      new: { id: "r1", status: "ditolak" },
    };

    const rejNotif = mapRealtimePayloadToNotification(rejectedPayload, "vendor", VENDOR_A);
    expect(rejNotif?.title).toBe("Revisi Porsi Ditolak");
    expect(rejNotif?.variant).toBe("danger");
  });
});
