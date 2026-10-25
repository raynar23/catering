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
    textClass: "text-[#1B7F39]",
    bgClass: "bg-[#34C759]/10",
    borderClass: "border-[#34C759]/25",
  },
  disetujui: {
    label: "Disetujui",
    textClass: "text-[#1B7F39]",
    bgClass: "bg-[#34C759]/10",
    borderClass: "border-[#34C759]/25",
  },
  aktif: {
    label: "Aktif",
    textClass: "text-[#1B7F39]",
    bgClass: "bg-[#34C759]/10",
    borderClass: "border-[#34C759]/25",
  },
  disanggupi: {
    label: "Disanggupi",
    textClass: "text-[#1B7F39]",
    bgClass: "bg-[#34C759]/10",
    borderClass: "border-[#34C759]/25",
  },
  selesai: {
    label: "Selesai",
    textClass: "text-[#1B7F39]",
    bgClass: "bg-[#34C759]/10",
    borderClass: "border-[#34C759]/25",
  },

  diajukan: {
    label: "Diajukan",
    textClass: "text-[#0066CC]",
    bgClass: "bg-[#007AFF]/10",
    borderClass: "border-[#007AFF]/25",
  },
  dipersiapkan: {
    label: "Dipersiapkan",
    textClass: "text-[#0066CC]",
    bgClass: "bg-[#007AFF]/10",
    borderClass: "border-[#007AFF]/25",
  },
  dikirim: {
    label: "Dikirim",
    textClass: "text-[#0066CC]",
    bgClass: "bg-[#007AFF]/10",
    borderClass: "border-[#007AFF]/25",
  },

  draft: {
    label: "Draft",
    textClass: "text-[#636366]",
    bgClass: "bg-[#8E8E93]/10",
    borderClass: "border-black/[0.06]",
  },
  nonaktif: {
    label: "Nonaktif",
    textClass: "text-[#636366]",
    bgClass: "bg-[#8E8E93]/10",
    borderClass: "border-black/[0.06]",
  },

  revisi: {
    label: "Revisi",
    textClass: "text-[#B25E00]",
    bgClass: "bg-[#FF9500]/10",
    borderClass: "border-[#FF9500]/25",
  },
  menunggu: {
    label: "Menunggu Verifikasi",
    textClass: "text-[#B25E00]",
    bgClass: "bg-[#FF9500]/10",
    borderClass: "border-[#FF9500]/25",
  },
  sampai: {
    label: "Sampai di Lokasi",
    textClass: "text-[#B25E00]",
    bgClass: "bg-[#FF9500]/10",
    borderClass: "border-[#FF9500]/25",
  },

  belum_input: {
    label: "Belum Input",
    textClass: "text-[#D70015]",
    bgClass: "bg-[#FF3B30]/10",
    borderClass: "border-[#FF3B30]/25",
  },
  ditolak: {
    label: "Ditolak",
    textClass: "text-[#D70015]",
    bgClass: "bg-[#FF3B30]/10",
    borderClass: "border-[#FF3B30]/25",
  },
  tidak_sanggup: {
    label: "Tidak Sanggup",
    textClass: "text-[#D70015]",
    bgClass: "bg-[#FF3B30]/10",
    borderClass: "border-[#FF3B30]/25",
  },

  admin_ga: {
    label: "Admin GA",
    textClass: "text-[#1D1D1F]",
    bgClass: "bg-black/[0.05]",
    borderClass: "border-black/[0.08]",
  },
  vendor: {
    label: "Vendor",
    textClass: "text-[#006CA2]",
    bgClass: "bg-[#006CA2]/10",
    borderClass: "border-[#006CA2]/20",
  },
};

// Clean, Apple-grade status tag with crisp typography and subtle translucent tints
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalizedKey = status.toLowerCase();
  const config = STATUS_CONFIG[normalizedKey] ?? {
    label: status,
    textClass: "text-[#636366]",
    bgClass: "bg-black/[0.04]",
    borderClass: "border-black/[0.06]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[5px] border px-2 py-0.5 text-[11px] font-medium tracking-tight whitespace-nowrap tabular-nums select-none transition-colors",
        config.textClass,
        config.bgClass,
        config.borderClass,
        className
      )}
    >
      <span>{label ?? config.label}</span>
    </span>
  );
}
