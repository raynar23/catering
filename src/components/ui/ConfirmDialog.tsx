"use client";

import React, { useState } from "react";
import { Dialog } from "./Dialog";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger" | "warning";
  onConfirm: () => void | Promise<void>;
  isProcessing?: boolean;
  children?: React.ReactNode;
}

const BUTTON_VARIANTS = {
  primary: "bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white",
  danger: "bg-[#D70015] hover:bg-[#B70012] active:bg-[#9B000F] text-white",
  warning: "bg-[#9A5B00] hover:bg-[#854E00] active:bg-[#6D4000] text-white",
};

// Specialized confirmation dialog for approval, rejection, submission, and deletion
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "primary",
  onConfirm,
  isProcessing = false,
  children,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isProcessing || internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={loading ? () => {} : onOpenChange}
      title={title}
      description={description}
      maxWidth="sm"
    >
      {children}
      <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border">
        <button
          type="button"
          disabled={loading}
          onClick={() => onOpenChange(false)}
          className="h-9 px-4 rounded-[8px] border border-border text-xs font-medium text-text hover:bg-bg transition-colors disabled:opacity-50 cursor-pointer"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleConfirm}
          className={cn(
            "h-9 px-4 rounded-[8px] text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            BUTTON_VARIANTS[variant]
          )}
        >
          {loading ? "Memproses..." : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
