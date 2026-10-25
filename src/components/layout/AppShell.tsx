"use client";

// 100dvh root shell enforcing desktop collapsible sidebar, live realtime notifications, and responsive mobile/tablet drawer
import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Profile } from "@/lib/types";
import { getNavGroupsForRole } from "@/lib/nav";
import { ToastProvider } from "@/components/ui/Toast";
import {
  RealtimeNotificationProvider,
  useNotifications,
} from "./RealtimeNotificationProvider";
import { cn } from "@/lib/utils";

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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  // Restore desktop sidebar preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tps_sidebar_open");
      if (stored !== null) {
        setDesktopSidebarOpen(stored === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleDesktopSidebar = () => {
    setDesktopSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("tps_sidebar_open", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleMenuToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      handleToggleDesktopSidebar();
    } else {
      setDrawerOpen((prev) => !prev);
    }
  };

  const role = profile?.role ?? "vendor";
  const navGroups = getNavGroupsForRole(role);
  const { notificationCount, notificationItems, badges } = useNotifications();

  const mergedBadges = { ...initialBadges, ...badges };

  return (
    <div className="h-dvh max-h-dvh w-full overflow-hidden flex bg-bg text-text">
      {/* Desktop Collapsible Sidebar */}
      <div
        className={cn(
          "hidden lg:flex shrink-0 h-full transition-[width] duration-300 ease-in-out overflow-hidden border-r border-[#005E8D]",
          desktopSidebarOpen ? "w-[264px]" : "w-0 border-r-0"
        )}
      >
        <div className="w-[264px] h-full shrink-0">
          <Sidebar
            groups={navGroups}
            badges={mergedBadges}
            profile={profile}
            onToggleCollapse={() => handleToggleDesktopSidebar()}
          />
        </div>
      </div>

      {/* Mobile / Tablet Drawer Overlay */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative z-10 w-[264px] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar
              groups={navGroups}
              badges={mergedBadges}
              profile={profile}
              isMobile
              onToggleCollapse={() => setDrawerOpen(false)}
              onItemClick={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <Topbar
          profile={profile}
          isSidebarOpen={desktopSidebarOpen}
          onMenuToggle={handleMenuToggle}
          notificationCount={notificationCount}
          notificationItems={notificationItems}
        />
        <main className="flex-1 min-h-0 flex flex-col overflow-y-auto p-3 sm:p-4 lg:p-6">
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
