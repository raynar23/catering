"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, PanelLeft } from "lucide-react";
import { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

import { NotificationItem } from "@/lib/realtime/notifications";

interface TopbarProps {
  profile?: Profile | null;
  notificationCount?: number;
  notificationItems?: NotificationItem[];
  isSidebarOpen?: boolean;
  onMenuToggle?: () => void;
  className?: string;
}

// Fixed 56px topbar displaying system identity, notification trigger, and Danantara logo
export function Topbar({
  notificationCount = 0,
  notificationItems = [],
  isSidebarOpen = true,
  onMenuToggle,
  className,
}: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={cn(
        "h-16 bg-white/85 backdrop-blur-xl border-b border-[#E5E5EA] px-3 sm:px-4 lg:px-6 flex items-center justify-between shrink-0 select-none",
        className
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-1.5 -ml-1 text-text-muted hover:text-text rounded-[6px] hover:bg-black/[0.04] active:bg-black/[0.08] transition-colors cursor-pointer shrink-0"
          title={isSidebarOpen ? "Sembunyikan Sidebar" : "Tampilkan Sidebar"}
          aria-label={isSidebarOpen ? "Sembunyikan Sidebar" : "Tampilkan Sidebar"}
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="text-[12.5px] sm:text-[13px] font-semibold text-text tracking-tight truncate">
            Pengelolaan Data Catering Karyawan
          </div>
          <div className="text-[11px] text-[#86868B] truncate hidden sm:block">
            PT Terminal Petikemas Surabaya
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 rounded-[8px] text-text-muted hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer"
            aria-label="Notifikasi"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#D70015] text-[10px] font-bold text-white flex items-center justify-center tabular-nums leading-none shadow-xs">
                {notificationCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-76 bg-white/95 backdrop-blur-2xl border border-black/[0.08] rounded-[12px] shadow-[0_12px_32px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.04)] p-3 z-40 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA] mb-2">
                <span className="text-xs font-semibold text-text">Notifikasi</span>
                {notificationCount > 0 && (
                  <span className="text-[10.5px] font-semibold text-primary bg-primary-50 px-2 py-0.5 rounded-full tabular-nums">
                    {notificationCount} baru
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#F2F2F7] -mx-1">
                {notificationItems && notificationItems.length > 0 ? (
                  notificationItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.tautan}
                      onClick={() => setNotifOpen(false)}
                      className="block p-2 hover:bg-primary-50/50 rounded-[6px] transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-text leading-tight truncate">
                        {item.judul}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-2 leading-snug">
                        {item.pesan}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-text-muted">
                    Tidak ada notifikasi baru
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-6 sm:h-7 w-px bg-border shrink-0 mx-1 sm:mx-1.5" aria-hidden="true" />

        {/* Danantara Logo at Far Right */}
        <div className="flex items-center shrink-0">
          <Image
            src="/images/logo-danantara.webp"
            alt="Logo Danantara Indonesia"
            width={130}
            height={34}
            className="h-6 sm:h-7.5 w-auto max-w-[95px] sm:max-w-[130px] object-contain select-none"
            priority
          />
        </div>
      </div>
    </header>
  );
}
