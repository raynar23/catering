"use client";

import React, { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  Table,
  FileText,
  Building2,
  Truck,
  Calendar,
  Users,
  CheckSquare,
  LogOut,
  Settings,
  PanelLeftClose,
  X,
} from "lucide-react";
import { NavGroup, NavItem } from "@/lib/nav";
import { Profile } from "@/lib/types";
import { signOutAction } from "@/lib/auth/sign-out";
import { cn } from "@/lib/utils";

interface SidebarProps {
  groups: NavGroup[];
  badges?: Record<string, number>;
  profile?: Profile | null;
  isMobile?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: () => void;
  className?: string;
}

const ICON_MAP = {
  dashboard: LayoutDashboard,
  input: ClipboardList,
  history: Clock,
  rekap: Table,
  laporan: FileText,
  bagian: Building2,
  vendor: Truck,
  periode: Calendar,
  users: Users,
  checkSquare: CheckSquare,
};

// Fixed 264px (or 68px collapsed rail) navy sidebar displaying role navigation, user profile, and sign out action
export function Sidebar({
  groups,
  badges = {},
  profile,
  isMobile = false,
  collapsed = false,
  onToggleCollapse,
  onItemClick,
  className,
}: SidebarProps) {
  const pathname = usePathname() ?? "";
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  const initials = profile?.nama
    ? profile.nama
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("")
    : "AG";

  const roleLabel =
    profile?.role === "admin_ga"
      ? "Admin GA"
      : profile?.role === "vendor"
      ? "Vendor Catering"
      : "Pengguna";

  const settingsHref =
    profile?.role === "admin_ga" ? "/admin/pengaturan" : "/vendor/pengaturan";
  const isSettingsActive = pathname.startsWith(settingsHref);

  return (
    <aside
      className={cn(
        "bg-[#006CA2] flex flex-col h-full select-none shrink-0 border-r border-[#005E8D] transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[68px]" : "w-[264px]",
        className
      )}
    >
      <div
        className={cn(
          "h-20 sm:h-[84px] flex items-center shrink-0 border-b border-white/10",
          collapsed ? "justify-center px-2" : "justify-between px-5 sm:px-6"
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center justify-center p-2 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all cursor-pointer group"
            title="Buka Sidebar"
            aria-label="Buka Sidebar"
          >
            <Image
              src="/images/icon-pelindo-monokrom.png"
              alt="Icon Pelindo Monokrom"
              width={40}
              height={40}
              className="w-9 h-9 object-contain select-none transition-transform group-hover:scale-105"
              priority
            />
          </button>
        ) : (
          <>
            <Image
              src="/images/logo-pelindo-tps.png"
              alt="Logo Pelindo Terminal Petikemas Surabaya"
              width={200}
              height={66}
              className="h-8.5 sm:h-10 w-auto max-w-[175px] object-contain select-none"
              priority
            />
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-[6px] text-white/70 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer"
                title={isMobile ? "Tutup Menu" : "Tutup Sidebar"}
                aria-label={isMobile ? "Tutup Menu" : "Tutup Sidebar"}
              >
                {isMobile ? (
                  <X className="w-5 h-5" />
                ) : (
                  <PanelLeftClose className="w-5 h-5" />
                )}
              </button>
            )}
          </>
        )}
      </div>

      <nav
        className={cn(
          "flex-1 min-h-0 overflow-y-auto py-4 space-y-6",
          collapsed ? "px-2" : "px-3"
        )}
      >
        {groups.map((group, groupIdx) => (
          <div key={group.title ?? `group-${groupIdx}`} className="space-y-1">
            {collapsed ? (
              groupIdx > 0 ? (
                <div className="h-px bg-white/10 my-2 mx-1.5" aria-hidden="true" />
              ) : null
            ) : (
              group.title && (
                <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/50 select-none">
                  {group.title}
                </p>
              )
            )}

            <div className={collapsed ? "space-y-1.5" : "space-y-0.5"}>
              {group.items.map((item: NavItem) => {
                const IconComponent = ICON_MAP[item.icon] ?? LayoutDashboard;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin/dashboard" &&
                    item.href !== "/vendor/dashboard" &&
                    pathname.startsWith(item.href)) ||
                  (item.href === "/admin/rekapitulasi" && pathname.startsWith("/admin/laporan"));
                const badgeCount = item.badgeKey ? badges[item.badgeKey] : undefined;

                if (collapsed) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={onItemClick}
                      title={item.title}
                      aria-label={item.title}
                      className={cn(
                        "relative flex items-center justify-center w-11 h-10 mx-auto rounded-[8px] transition-all duration-150 cursor-pointer select-none group",
                        isActive
                          ? "bg-white/20 text-white shadow-xs font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <IconComponent
                        className={cn(
                          "w-5 h-5 shrink-0 transition-colors",
                          isActive ? "text-white" : "text-white/70 group-hover:text-white"
                        )}
                      />
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#D70015] text-[10px] font-bold text-white flex items-center justify-center tabular-nums leading-none shadow-xs border border-[#006CA2]">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={onItemClick}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] font-medium transition-all duration-150 cursor-pointer select-none",
                      isActive
                        ? "bg-white/20 text-white font-semibold shadow-xs"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <IconComponent
                      className={cn(
                        "w-4 h-4 shrink-0 transition-colors",
                        isActive ? "text-white" : "text-white/70"
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                    {badgeCount !== undefined && badgeCount > 0 && (
                      <span className="ml-auto text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-white/25 text-white">
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {collapsed ? (
        <div className="p-2 border-t border-white/10 shrink-0 flex flex-col items-center gap-2">
          {/* User Profile Avatar Link */}
          <Link
            href={settingsHref}
            onClick={onItemClick}
            className={cn(
              "w-11 h-11 rounded-[10px] flex items-center justify-center transition-all duration-150 cursor-pointer select-none group border",
              isSettingsActive
                ? "bg-white/20 border-white/25 shadow-xs text-white"
                : "bg-white/[0.08] border-white/10 text-white hover:bg-white/[0.14] hover:border-white/20"
            )}
            title={`Pengaturan Akun: ${profile?.nama ?? "Administrator GA"} (${roleLabel})`}
            aria-label={`Pengaturan Akun: ${profile?.nama ?? "Administrator GA"}`}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs select-none group-hover:bg-white/25 transition-colors">
              {initials}
            </div>
          </Link>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isPending}
            className="w-11 h-9 rounded-[8px] flex items-center justify-center text-white/70 hover:bg-red-500/20 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            title={isPending ? "Keluar..." : "Keluar"}
            aria-label="Keluar"
          >
            <LogOut className="w-4 h-4 shrink-0" />
          </button>
        </div>
      ) : (
        <div className="p-3 border-t border-white/10 shrink-0 space-y-2">
          {/* User Profile Card - Entire card navigates to profile/settings */}
          <Link
            href={settingsHref}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] border transition-all duration-150 cursor-pointer select-none group",
              isSettingsActive
                ? "bg-white/20 border-white/25 shadow-xs text-white"
                : "bg-white/[0.08] border-white/10 text-white hover:bg-white/[0.14] hover:border-white/20 active:bg-white/20"
            )}
            title="Buka Pengaturan Akun"
            aria-label="Buka Pengaturan Akun"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs select-none group-hover:bg-white/25 transition-colors">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-white truncate leading-tight group-hover:text-white">
                {profile?.nama ?? "Administrator GA"}
              </div>
              <div className="text-[11px] text-white/65 truncate leading-tight mt-0.5 group-hover:text-white/85">
                {roleLabel}
              </div>
            </div>
            <span
              className={cn(
                "p-1.5 rounded-[6px] transition-colors shrink-0",
                isSettingsActive
                  ? "text-white"
                  : "text-white/60 group-hover:text-white group-hover:bg-white/15"
              )}
              aria-hidden="true"
            >
              <Settings className="w-4 h-4" />
            </span>
          </Link>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isPending}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[7px] text-[13px] font-medium text-white/80 hover:bg-red-500/20 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0 text-white/70" />
            <span>{isPending ? "Keluar..." : "Keluar"}</span>
          </button>
        </div>
      )}
    </aside>
  );
}
