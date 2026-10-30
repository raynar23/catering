"use client";

import React from "react";
import { Utensils, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { VendorKPIs } from "@/lib/actions/vendor-portal";
import { formatNumber } from "@/lib/format";

interface VendorKPICardsProps {
  kpis: VendorKPIs;
}

// 4 operational KPI metrics for vendor daily monitoring following Apple HIG
export function VendorKPICards({ kpis }: VendorKPICardsProps) {
  const cards = [
    {
      title: "Permintaan Hari Ini",
      value: formatNumber(kpis.permintaanHariIniPorsi),
      unit: "porsi",
      icon: Utensils,
      color: "text-primary",
    },
    {
      title: "Menunggu Respons",
      value: formatNumber(kpis.menungguResponsCount),
      unit: "permintaan",
      icon: AlertCircle,
      color: "text-primary",
    },
    {
      title: "Sedang Diproses",
      value: formatNumber(kpis.sedangDiprosesCount),
      unit: "pesanan",
      icon: Clock,
      color: "text-primary",
    },
    {
      title: "Selesai Bulan Ini",
      value: formatNumber(kpis.selesaiBulanIniCount),
      unit: "pesanan",
      icon: CheckCircle2,
      color: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 shrink-0 select-none">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-white border border-black/[0.08] rounded-[12px] p-3.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#86868B] tracking-tight uppercase">
                {card.title}
              </span>
              <Icon className="w-3.5 h-3.5 text-[#86868B]/70" />
            </div>

            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-[24px] sm:text-[26px] font-bold tracking-tight ${card.color}`}>
                {card.value}
              </span>
              <span className="text-xs text-[#86868B] font-medium">
                {card.unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
