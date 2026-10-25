import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ProfileSettingsView } from "./ProfileSettingsView";
import { ToastProvider } from "@/components/ui/Toast";
import { Profile } from "@/lib/types";

const MOCK_PROFILE: Profile = {
  id: "user-ga-1",
  username: "admin_ga",
  nama: "Administrator General Affairs",
  role: "admin_ga",
  vendor_id: null,
  bagian_id: null,
  no_hp: "081234567890",
  aktif: true,
  created_at: "2026-01-15T08:00:00Z",
  updated_at: "2026-01-15T08:00:00Z",
};

describe("ProfileSettingsView Component", () => {
  it("renders full-container hero account banner and identity elements", () => {
    const html = renderToString(
      <ToastProvider>
        <ProfileSettingsView profile={MOCK_PROFILE} />
      </ToastProvider>
    );

    // Account Hero Banner
    expect(html).toContain("Administrator General Affairs");
    expect(html).toContain("@admin_ga");
    expect(html).toContain("Akun Aktif");
    expect(html).toContain("Hak Akses Penuh Admin GA");
    expect(html).toContain("Terdaftar");

    // Two settings cards
    expect(html).toContain("Informasi Profil");
    expect(html).toContain("Keamanan Kata Sandi");
    expect(html).toContain("Simpan Profil");
    expect(html).toContain("Perbarui Password");

    // System info footer
    expect(html).toContain("Sistem Pengelolaan Data Catering Karyawan");
  });

  it("renders vendor identity and badge when role is vendor", () => {
    const vendorProfile: Profile = {
      ...MOCK_PROFILE,
      id: "vendor-1",
      username: "catering_berkah",
      nama: "Bpk. Ahmad Subandi",
      role: "vendor",
      vendor_id: "v-1",
    };

    const html = renderToString(
      <ToastProvider>
        <ProfileSettingsView
          profile={vendorProfile}
          vendorName="Catering Berkah (CB)"
        />
      </ToastProvider>
    );

    expect(html).toContain("Bpk. Ahmad Subandi");
    expect(html).toContain("@catering_berkah");
    expect(html).toContain("Catering Berkah (CB)");
    expect(html).toContain("Hak Akses Vendor Catering");
  });
});
