import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { Profile } from "@/lib/types";
import { NavGroup } from "@/lib/nav";

const MOCK_PROFILE_GA: Profile = {
  id: "user-1",
  username: "admin_ga",
  nama: "Administrator General Affair",
  role: "admin_ga",
  vendor_id: null,
  bagian_id: null,
  aktif: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_PROFILE_VENDOR: Profile = {
  id: "user-2",
  username: "vendor_catering",
  nama: "Catering Berkah",
  role: "vendor",
  vendor_id: "vendor-1",
  bagian_id: null,
  aktif: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_GROUPS: NavGroup[] = [
  {
    title: "Operasional",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: "dashboard",
      },
      {
        title: "Input Pesanan",
        href: "/admin/catering",
        icon: "input",
        badgeKey: "pendingOrders",
      },
    ],
  },
];

describe("Topbar Layout Component", () => {
  it("renders system identity, notification trigger, and Danantara logo without user profile dropdown", () => {
    const html = renderToString(
      <Topbar
        profile={MOCK_PROFILE_GA}
        notificationCount={3}
        notificationItems={[
          {
            id: "notif-1",
            judul: "Pesanan Baru",
            pesan: "Ada pesanan masuk untuk Shift 1",
            tautan: "/admin/catering",
            waktu: new Date().toISOString(),
            tipe: "pesanan",
          },
        ]}
      />
    );

    // Verifies system branding and Danantara logo are present
    expect(html).toContain("Pengelolaan Catering");
    expect(html).toContain("PT Terminal Petikemas Surabaya");
    expect(html).not.toContain("Sistem Aktif");
    expect(html).toContain("Logo Danantara Indonesia");
    expect(html).toContain("tps-symbol.png");

    // Verifies notification badge counter is rendered
    expect(html).toContain("3");

    // Verifies profile card is NOT inside the Topbar
    expect(html).not.toContain("Administrator General Affair");
    expect(html).not.toContain("@admin_ga");
  });
});

describe("Sidebar Layout Component", () => {
  it("renders navigation items, Pelindo TPS brand, and macOS squircle profile card in footer", () => {
    const html = renderToString(
      <Sidebar
        groups={MOCK_GROUPS}
        badges={{ pendingOrders: 5 }}
        profile={MOCK_PROFILE_GA}
      />
    );

    // Pelindo brand and navigation
    expect(html).toContain("Logo Pelindo Terminal Petikemas Surabaya");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Input Pesanan");
    expect(html).toContain("5");

    // Profile card at footer
    expect(html).toContain("Administrator General Affair");
    expect(html).toContain("Admin GA");
    expect(html).toContain("AG"); // Initials
    expect(html).toContain("/admin/pengaturan");
    expect(html).toContain("Buka Pengaturan Akun");
    expect(html).toContain("Keluar");
  });

  it("renders vendor profile role and vendor settings destination correctly", () => {
    const html = renderToString(
      <Sidebar
        groups={MOCK_GROUPS}
        profile={MOCK_PROFILE_VENDOR}
      />
    );

    expect(html).toContain("Catering Berkah");
    expect(html).toContain("Vendor Catering");
    expect(html).toContain("CB"); // Initials
    expect(html).toContain("/vendor/pengaturan");
  });

  it("renders collapse button when onToggleCollapse handler is provided", () => {
    const html = renderToString(
      <Sidebar
        groups={MOCK_GROUPS}
        profile={MOCK_PROFILE_GA}
        onToggleCollapse={() => {}}
      />
    );

    expect(html).toContain("Tutup Sidebar");
  });

  it("renders mobile close button when isMobile is set", () => {
    const html = renderToString(
      <Sidebar
        groups={MOCK_GROUPS}
        profile={MOCK_PROFILE_GA}
        isMobile
        onToggleCollapse={() => {}}
      />
    );

    expect(html).toContain("Tutup Menu");
  });

  it("renders icon-only rail with monochrome Pelindo icon and accessible tooltips when collapsed", () => {
    const html = renderToString(
      <Sidebar
        groups={MOCK_GROUPS}
        badges={{ pendingOrders: 5 }}
        profile={MOCK_PROFILE_GA}
        collapsed
      />
    );

    // Monochrome Pelindo icon should be rendered instead of full logo
    expect(html).toContain("Icon Pelindo Monokrom");
    expect(html).toContain("w-[68px]");
    expect(html).toContain('title="Buka Sidebar"');
    // Nav items rendered with tooltips/aria-labels
    expect(html).toContain('title="Dashboard"');
    expect(html).toContain('title="Input Pesanan"');
    expect(html).toContain("5"); // Badge count still visible
    // Avatar initials rendered with tooltip
    expect(html).toContain("AG");
    expect(html).toContain('title="Pengaturan Akun: Administrator General Affair (Admin GA)"');
    expect(html).toContain('title="Keluar"');
  });
});
