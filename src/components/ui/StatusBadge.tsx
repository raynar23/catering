import React from "react";
import { cn } from "@/lib/utils";

export type StatusType =
  | "draft"
  | "diajukan"
  | "final"
  | "revisi"
  | "menunggu"
  | "disetujui"
  | "ditolak"
  | "belum_input"
  | "aktif"
  | "nonaktif"
  | "disanggupi"
  | "tidak_sanggup"
  | "dipersiapkan"
  | "dikirim"
  | "sampai"
  | "selesai"
  | "admin_ga"
  | "vendor";

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; textClass: string; bgClass: string; borderClass: string }
> = {
  final: {
    label: "Final",
    textClass: "text-[#1E8E3E]",
    bgClass: "bg-[#EBF7EE]",
    borderClass: "border-[#C8E9D0]",
  },
  disetujui: {
    label: "Disetujui",
    textClass: "text-[#1E8E3E]",
    bgClass: "bg-[#EBF7EE]",
    borderClass: "border-[#C8E9D0]",
  },
  aktif: {
    label: "Aktif",
    textClass: "text-[#1E8E3E]",
    bgClass: "bg-[#EBF7EE]",
    borderClass: "border-[#C8E9D0]",
  },
  disanggupi: {
    label: "Disanggupi",
    textClass: "text-[#1E8E3E]",
    bgClass: "bg-[#EBF7EE]",
    borderClass: "border-[#C8E9D0]",
  },
  selesai: {
    label: "Selesai",
    textClass: "text-[#1E8E3E]",
    bgClass: "bg-[#EBF7EE]",
    borderClass: "border-[#C8E9D0]",
  },

  diajukan: {
    label: "Diajukan",
    textClass: "text-[#0B5A94]",
    bgClass: "bg-[#E8F2FA]",
    borderClass: "border-[#BBD9EE]",
  },
  dipersiapkan: {
    label: "Dipersiapkan",
    textClass: "text-[#0B5A94]",
    bgClass: "bg-[#E8F2FA]",
    borderClass: "border-[#BBD9EE]",
  },
  dikirim: {
    label: "Dikirim",
    textClass: "text-[#0B5A94]",
    bgClass: "bg-[#E8F2FA]",
    borderClass: "border-[#BBD9EE]",
  },

  draft: {
    label: "Draft",
    textClass: "text-[#6E6E73]",
    bgClass: "bg-[#F2F2F7]",
    borderClass: "border-[#E5E5EA]",
  },
  nonaktif: {
    label: "Nonaktif",
    textClass: "text-[#6E6E73]",
    bgClass: "bg-[#F2F2F7]",
    borderClass: "border-[#E5E5EA]",
  },

  revisi: {
    label: "Revisi",
    textClass: "text-[#9A5B00]",
    bgClass: "bg-[#FFF8E6]",
    borderClass: "border-[#FFE2A4]",
  },
  menunggu: {
    label: "Menunggu Verifikasi",
    textClass: "text-[#9A5B00]",
    bgClass: "bg-[#FFF8E6]",
    borderClass: "border-[#FFE2A4]",
  },
  sampai: {
    label: "Sampai di Lokasi",
    textClass: "text-[#9A5B00]",
    bgClass: "bg-[#FFF8E6]",
    borderClass: "border-[#FFE2A4]",
  },

  belum_input: {
    label: "Belum Input",
    textClass: "text-[#D70015]",
    bgClass: "bg-[#FDECEE]",
    borderClass: "border-[#F7CCD0]",
  },
  ditolak: {
    label: "Ditolak",
    textClass: "text-[#D70015]",
    bgClass: "bg-[#FDECEE]",
    borderClass: "border-[#F7CCD0]",
  },
  tidak_sanggup: {
    label: "Tidak Sanggup",
    textClass: "text-[#D70015]",
    bgClass: "bg-[#FDECEE]",
    borderClass: "border-[#F7CCD0]",
  },

  admin_ga: {
    label: "Admin GA",
    textClass: "text-[#0B5A94]",
    bgClass: "bg-[#E8F2FA]",
    borderClass: "border-[#BBD9EE]",
  },
  vendor: {
    label: "Vendor",
    textClass: "text-[#0E7490]",
    bgClass: "bg-[#ECFEFF]",
    borderClass: "border-[#CFFAFE]",
  },
};

// Text-only badge without dots or icons, strictly following DESIGN.md
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalizedKey = status.toLowerCase();
  const config = STATUS_CONFIG[normalizedKey] ?? {
    label: status,
    textClass: "text-text-muted",
    bgClass: "bg-bg",
    borderClass: "border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[6px] border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums",
        config.textClass,
        config.bgClass,
        config.borderClass,
        className
      )}
    >
      {label ?? config.label}
    </span>
  );
}
