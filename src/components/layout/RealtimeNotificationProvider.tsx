// Realtime notification provider synchronizing topbar bell, sidebar badges, and event toasts
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Profile } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { fetchLiveNotifications, NotificationItem } from "@/lib/realtime/notifications";
import { mapRealtimePayloadToNotification } from "@/lib/realtime/notification-mapper";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";

interface NotificationContextValue {
  notificationCount: number;
  notificationItems: NotificationItem[];
  badges: Record<string, number>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notificationCount: 0,
  notificationItems: [],
  badges: {},
  refreshNotifications: async () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

interface RealtimeNotificationProviderProps {
  profile: Profile | null;
  initialBadges?: Record<string, number>;
  children: React.ReactNode;
}

export function RealtimeNotificationProvider({
  profile,
  initialBadges = {},
  children,
}: RealtimeNotificationProviderProps) {
  const { toast } = useToast();
  const [notificationCount, setNotificationCount] = useState<number>(
    initialBadges.pendingCount ?? initialBadges.pendingVendorConfirmation ?? 0
  );
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
  const [badges, setBadges] = useState<Record<string, number>>(initialBadges);
  const initialFetchDone = useRef(false);

  // Refresh notification items and badge counts from database
  const refreshNotifications = useCallback(async () => {
    if (!profile) return;

    try {
      const data = await fetchLiveNotifications();
      setNotificationCount(data.total);
      setNotificationItems(data.items || []);

      if (profile.role === "admin_ga") {
        setBadges((prev) => ({
          ...prev,
          pendingCount: data.total,
        }));
      } else if (profile.role === "vendor") {
        setBadges((prev) => ({
          ...prev,
          pendingVendorConfirmation: data.total,
          pendingCount: data.total,
        }));
      }
    } catch {
      // Gracefully handle network/rpc hiccups
    }
  }, [profile]);

  // Initial fetch on mount
  useEffect(() => {
    if (!initialFetchDone.current && profile) {
      initialFetchDone.current = true;
      refreshNotifications();
    }
  }, [profile, refreshNotifications]);

  // Handle incoming realtime event
  const handleRealtimeEvent = useCallback(
    (payload: any) => {
      if (!profile) return;

      const message = mapRealtimePayloadToNotification(
        payload,
        profile.role,
        profile.vendor_id
      );

      if (message) {
        // Trigger silent event toast (max 3 toasts, no audio sound)
        toast({
          title: message.title,
          description: message.description,
          variant: message.variant,
        });

        // Refresh badge counts and notification drawer
        refreshNotifications();
      }
    },
    [profile, toast, refreshNotifications]
  );

  // Subscribe to catering_orders table
  useRealtimeTable({
    table: "catering_orders",
    enabled: !!profile,
    onChange: handleRealtimeEvent,
    onReconnect: refreshNotifications,
  });

  // Subscribe to revisions table
  useRealtimeTable({
    table: "revisions",
    enabled: !!profile,
    onChange: handleRealtimeEvent,
    onReconnect: refreshNotifications,
  });

  return (
    <NotificationContext.Provider
      value={{
        notificationCount,
        notificationItems,
        badges,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
