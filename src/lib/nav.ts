// Navigation definitions partitioned by user role
import { AppRole } from "./types";

export interface NavItem {
  title: string;
  href: string;
  icon: "dashboard" | "input" | "history" | "rekap" | "laporan" | "bagian" | "vendor" | "periode" | "users";
  badgeKey?: string;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    title: "Operasional",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: "dashboard",
      },
      {
        title: "Input Data Catering",
        href: "/admin/input",
        icon: "input",
      },
      {
        title: "Verifikasi Data",
        href: "/admin/verifikasi",
        icon: "history",
        badgeKey: "pendingCount",
      },
      {
        title: "Rekapitulasi",
        href: "/admin/rekapitulasi",
        icon: "rekap",
      },
      {
        title: "Laporan",
        href: "/admin/laporan",
        icon: "laporan",
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        title: "Data Bagian",
        href: "/admin/master/bagian",
        icon: "bagian",
      },
      {
        title: "Data Vendor",
        href: "/admin/master/vendor",
        icon: "vendor",
      },
      {
        title: "Periode Catering",
        href: "/admin/master/periode",
        icon: "periode",
      },
      {
        title: "Manajemen User",
        href: "/admin/master/users",
        icon: "users",
      },
    ],
  },
];

export const VENDOR_NAV_GROUPS: NavGroup[] = [
  {
    title: "Menu Utama",
    items: [
      {
        title: "Dashboard",
        href: "/vendor/dashboard",
        icon: "dashboard",
      },
      {
        title: "Pesanan & Riwayat",
        href: "/vendor/riwayat",
        icon: "history",
        badgeKey: "pendingOrderCount",
      },
    ],
  },
];

export function getNavGroupsForRole(role: AppRole): NavGroup[] {
  if (role === "admin_ga") {
    return ADMIN_NAV_GROUPS;
  }
  return VENDOR_NAV_GROUPS;
}
