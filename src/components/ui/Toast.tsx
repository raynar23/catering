"use client";

import React, { createContext, useContext, useState, useCallback, useId } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export type ToastVariant = "default" | "success" | "danger";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_BORDER_MAP: Record<ToastVariant, string> = {
  default: "border-border",
  success: "border-[#C8E9D0] bg-[#EBF7EE]/40",
  danger: "border-[#F7CCD0] bg-[#FDECEE]/40",
};

const VARIANT_TITLE_MAP: Record<ToastVariant, string> = {
  default: "text-text",
  success: "text-[#1E8E3E]",
  danger: "text-[#D70015]",
};

// Global notification toast provider without emojis and subtle transition
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const baseId = useId();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = "default", duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = `${baseId}-${Date.now()}-${Math.random()}`;
      // Enforce maximum 3 concurrent toasts to prevent notification clutter
      setToasts((prev) => [...prev.slice(-2), { id, title, description, variant, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [baseId, dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto w-full bg-surface border rounded-[8px] p-3 shadow-lg flex items-start justify-between gap-3 transition-all duration-150 animate-in fade-in slide-in-from-bottom-2",
              VARIANT_BORDER_MAP[t.variant ?? "default"]
            )}
          >
            <div className="min-w-0 flex-1">
              <h4 className={cn("text-xs font-semibold leading-tight", VARIANT_TITLE_MAP[t.variant ?? "default"])}>
                {t.title}
              </h4>
              {t.description && (
                <p className="text-xs text-text-muted mt-1 leading-normal">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-text-muted hover:text-text p-0.5 rounded cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Hook to trigger application toasts
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
