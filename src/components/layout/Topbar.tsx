"use client";

import React, { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Bell, Menu, LogOut, Settings } from "lucide-react";
import { Profile } from "@/lib/types";
import { signOutAction } from "@/lib/auth/sign-out";
import { cn } from "@/lib/utils";

interface TopbarProps {
  profile: Profile | null;
  notificationCount?: number;
  onMenuToggle?: () => void;
  className?: string;
}

// Fixed 56px topbar displaying system identity, notification trigger, and profile menu
export function Topbar({
  profile,
  notificationCount = 0,
  onMenuToggle,
  className,
}: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    : "US";

  const roleLabel =
    profile?.role === "admin_ga"
      ? "Admin GA"
      : profile?.role === "vendor"
      ? "Vendor Catering"
      : "Pengguna";

  return (
    <header
      className={cn(
        "h-14 bg-surface border-b border-border px-4 lg:px-6 flex items-center justify-between shrink-0 select-none",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 -ml-1 text-text-muted hover:text-text rounded-[6px] hover:bg-bg cursor-pointer"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-text truncate">
            Pengelolaan Data Catering Karyawan
          </div>
          <div className="text-xs text-text-muted truncate hidden sm:block">
            PT Terminal Petikemas Surabaya
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 rounded-[6px] text-text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer"
            aria-label="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[10px] font-bold text-white flex items-center justify-center tabular-nums leading-none">
                {notificationCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-1.5 w-72 bg-surface border border-border rounded-[10px] shadow-xl p-3 z-40 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-border mb-2">
                <span className="text-xs font-semibold text-text">Notifikasi</span>
                {notificationCount > 0 && (
                  <span className="text-[11px] text-text-muted tabular-nums">
                    {notificationCount} baru
                  </span>
                )}
              </div>
              <div className="py-6 text-center text-xs text-text-muted">
                Tidak ada notifikasi
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar and Menu */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2.5 p-1 rounded-[8px] hover:bg-bg transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0 border border-primary/20">
              {initials}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <div className="text-xs font-semibold text-text truncate max-w-[140px]">
                {profile?.nama ?? "Pengguna"}
              </div>
              <div className="text-[11px] text-text-muted truncate">
                {roleLabel}
              </div>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-surface border border-border rounded-[10px] shadow-xl p-2 z-40 animate-in fade-in zoom-in-95">
              <div className="px-2 py-1.5 border-b border-border mb-1">
                <p className="text-xs font-semibold text-text truncate">
                  {profile?.nama ?? "Pengguna"}
                </p>
                <p className="text-[11px] text-text-muted truncate">
                  {profile?.username ? `@${profile.username}` : ""}
                </p>
              </div>

              <Link
                href={profile?.role === "admin_ga" ? "/admin/pengaturan" : "/vendor/pengaturan"}
                onClick={() => setProfileOpen(false)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-text hover:bg-bg rounded-[6px] transition-colors cursor-pointer mb-0.5"
              >
                <Settings className="w-3.5 h-3.5 text-text-muted" />
                <span>Pengaturan Akun</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-danger hover:bg-danger-soft/60 rounded-[6px] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isPending ? "Keluar..." : "Keluar"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
