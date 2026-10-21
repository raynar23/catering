"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Profile } from "@/lib/types";
import { getNavGroupsForRole } from "@/lib/nav";
import { ToastProvider } from "@/components/ui/Toast";

interface AppShellProps {
  profile: Profile | null;
  children: React.ReactNode;
  badges?: Record<string, number>;
}

// 100dvh root shell enforcing desktop zero-scroll architecture and mobile drawer
export function AppShell({ profile, children, badges = {} }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role = profile?.role ?? "vendor";
  const navGroups = getNavGroupsForRole(role);

  return (
    <ToastProvider>
      <div className="h-dvh max-h-dvh w-full overflow-hidden flex bg-bg text-text">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:flex shrink-0 h-full">
        <Sidebar groups={navGroups} badges={badges} />
      </div>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-[264px] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar
              groups={navGroups}
              badges={badges}
              onItemClick={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <Topbar
          profile={profile}
          onMenuToggle={() => setDrawerOpen(true)}
          notificationCount={badges.pendingCount ?? 0}
        />
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden p-4 sm:p-6">
          {children}
        </main>
      </div>
      </div>
    </ToastProvider>
  );
}
