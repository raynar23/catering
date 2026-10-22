"use client";

// 100dvh root shell enforcing desktop zero-scroll architecture, live realtime notifications, and mobile drawer
import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Profile } from "@/lib/types";
import { getNavGroupsForRole } from "@/lib/nav";
import { ToastProvider } from "@/components/ui/Toast";
import {
  RealtimeNotificationProvider,
  useNotifications,
} from "./RealtimeNotificationProvider";

interface AppShellProps {
  profile: Profile | null;
  children: React.ReactNode;
  badges?: Record<string, number>;
}

function AppShellInner({
  profile,
  children,
  initialBadges = {},
}: {
  profile: Profile | null;
  children: React.ReactNode;
  initialBadges?: Record<string, number>;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role = profile?.role ?? "vendor";
  const navGroups = getNavGroupsForRole(role);
  const { notificationCount, notificationItems, badges } = useNotifications();

  const mergedBadges = { ...initialBadges, ...badges };

  return (
    <div className="h-dvh max-h-dvh w-full overflow-hidden flex bg-bg text-text">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:flex shrink-0 h-full">
        <Sidebar groups={navGroups} badges={mergedBadges} />
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
              badges={mergedBadges}
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
          notificationCount={notificationCount}
          notificationItems={notificationItems}
        />
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ profile, children, badges = {} }: AppShellProps) {
  return (
    <ToastProvider>
      <RealtimeNotificationProvider profile={profile} initialBadges={badges}>
        <AppShellInner profile={profile} initialBadges={badges}>
          {children}
        </AppShellInner>
      </RealtimeNotificationProvider>
    </ToastProvider>
  );
}
