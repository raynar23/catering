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
} from "lucide-react";
import { NavGroup, NavItem } from "@/lib/nav";
import { signOutAction } from "@/lib/auth/sign-out";
import { cn } from "@/lib/utils";

interface SidebarProps {
  groups: NavGroup[];
  badges?: Record<string, number>;
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

// Fixed 264px navy sidebar displaying role navigation and sign out action
export function Sidebar({ groups, badges = {}, onItemClick, className }: SidebarProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <aside
      className={cn(
        "w-[264px] bg-[#006CA2] flex flex-col h-full select-none shrink-0 border-r border-[#005E8D]",
        className
      )}
    >
      <div className="h-20 sm:h-[84px] px-6 flex items-center shrink-0 border-b border-white/10">
        <Image
          src="/images/logo-pelindo-tps.png"
          alt="Logo Pelindo Terminal Petikemas Surabaya"
          width={200}
          height={66}
          className="h-8.5 sm:h-10 w-auto max-w-[185px] object-contain select-none"
          priority
        />
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group, groupIdx) => (
          <div key={group.title ?? `group-${groupIdx}`} className="space-y-1">
            {group.title && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                {group.title}
              </p>
            )}

            <div className="space-y-0.5">
              {group.items.map((item: NavItem) => {
                const IconComponent = ICON_MAP[item.icon] ?? LayoutDashboard;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin/dashboard" &&
                    item.href !== "/vendor/dashboard" &&
                    pathname.startsWith(item.href)) ||
                  (item.href === "/admin/rekapitulasi" && pathname.startsWith("/admin/laporan"));
                const badgeCount = item.badgeKey ? badges[item.badgeKey] : undefined;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onItemClick}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <IconComponent className="w-4 h-4 shrink-0 text-white/70" />
                    <span className="truncate">{item.title}</span>
                    {badgeCount !== undefined && badgeCount > 0 && (
                      <span className="ml-auto text-xs font-semibold tabular-nums text-white/90">
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

      <div className="p-3 border-t border-white/10 shrink-0">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isPending}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-[8px] text-[13px] font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0 text-white/70" />
          <span>{isPending ? "Keluar..." : "Keluar"}</span>
        </button>
      </div>
    </aside>
  );
}
