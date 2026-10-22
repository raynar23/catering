// Navigation definitions partitioned by user role
import { AppRole } from "./types";

export interface NavItem {
  title: string;
  href: string;
  icon: "dashboard" | "input" | "history" | "rekap" | "laporan" | "bagian" | "vendor" | "periode" | "users" | "checkSquare";
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
        title: "Rekapitulasi dan Laporan",
        href: "/admin/rekapitulasi",
        icon: "rekap",
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
        title: "Impor Data",
        href: "/admin/impor-data",
        icon: "input",
      },
      {
        title: "Manajemen User",
        href: "/admin/manajemen-user",
        icon: "users",
      },
    ],
  },
];

export const VENDOR_NAV_GROUPS: NavGroup[] = [
  {
    title: "Operasional Vendor",
    items: [
      {
        title: "Dashboard",
        href: "/vendor/dashboard",
        icon: "dashboard",
      },
      {
        title: "Permintaan Masuk",
        href: "/vendor/permintaan",
        icon: "input",
      },
      {
        title: "Ketersediaan",
        href: "/vendor/ketersediaan",
        icon: "checkSquare",
        badgeKey: "pendingVendorConfirmation",
      },
      {
        title: "Progres Pengiriman",
        href: "/vendor/progres",
        icon: "vendor",
      },
      {
        title: "Riwayat Pesanan",
        href: "/vendor/riwayat",
        icon: "history",
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
