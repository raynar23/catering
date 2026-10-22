// Custom hook for subscribing to Supabase Realtime table events with reconnection handling and debouncing
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { RealtimeEventPayload } from "./notification-mapper";

export type RealtimeStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR"
  | "CONNECTING";

export interface UseRealtimeTableOptions<T = any> {
  table: string;
  schema?: string;
  filter?: string;
  debounceMs?: number;
  enabled?: boolean;
  onInsert?: (record: T) => void;
  onUpdate?: (newRecord: T, oldRecord: T) => void;
  onDelete?: (oldRecord: T) => void;
  onChange?: (payload: RealtimeEventPayload<T>) => void;
  onReconnect?: () => void;
}

export function useRealtimeTable<T = any>({
  table,
  schema = "public",
  filter,
  debounceMs = 300,
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  onReconnect,
}: UseRealtimeTableOptions<T>) {
  const [status, setStatus] = useState<RealtimeStatus>("CONNECTING");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const prevStatusRef = useRef<RealtimeStatus | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid recreating subscription on function reference changes
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onChangeRef = useRef(onChange);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
    onChangeRef.current = onChange;
    onReconnectRef.current = onReconnect;
  });

  useEffect(() => {
    if (!enabled) {
      setStatus("CLOSED");
      return;
    }

    const supabase = createClient();
    const channelName = `realtime_${table}_${filter || "all"}_${Date.now()}`;

    // Create channel
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    const channelConfig: any = {
      event: "*",
      schema,
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    // Subscribe to postgres changes
    channel.on("postgres_changes", channelConfig, (payload: any) => {
      const eventPayload: RealtimeEventPayload<T> = {
        table,
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
      };

      // Debounce rapid events to prevent render thrashing
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChangeRef.current?.(eventPayload);

        if (payload.eventType === "INSERT") {
          onInsertRef.current?.(payload.new);
        } else if (payload.eventType === "UPDATE") {
          onUpdateRef.current?.(payload.new, payload.old);
        } else if (payload.eventType === "DELETE") {
          onDeleteRef.current?.(payload.old);
        }
      }, debounceMs);
    });

    // Handle channel connection status
    channel.subscribe((subStatus, err) => {
      const currentSubStatus = subStatus as RealtimeStatus;
      setStatus(currentSubStatus);

      // Detect reconnection from offline/error/closed to SUBSCRIBED
      if (
        prevStatusRef.current &&
        prevStatusRef.current !== "SUBSCRIBED" &&
        currentSubStatus === "SUBSCRIBED"
      ) {
        onReconnectRef.current?.();
      }

      prevStatusRef.current = currentSubStatus;
    });

    // Cleanup subscription on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, schema, filter, debounceMs, enabled]);

  return {
    status,
    isConnected: status === "SUBSCRIBED",
  };
}
