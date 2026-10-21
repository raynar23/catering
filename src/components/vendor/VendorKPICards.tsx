"use client";

import React from "react";
import { Utensils, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { VendorKPIs } from "@/lib/actions/vendor-portal";
import { formatNumber } from "@/lib/format";

interface VendorKPICardsProps {
  kpis: VendorKPIs;
}

// 4 operational KPI metrics for vendor daily monitoring
export function VendorKPICards({ kpis }: VendorKPICardsProps) {
  const cards = [
    {
      title: "Permintaan Hari Ini",
      value: formatNumber(kpis.permintaanHariIniPorsi),
      unit: "porsi",
      icon: Utensils,
      color: "text-[#0B5A94]",
      bgColor: "bg-[#E8F2FA]",
      borderColor: "border-[#BBD9EE]",
    },
    {
      title: "Menunggu Respons",
      value: formatNumber(kpis.menungguResponsCount),
      unit: "permintaan",
      icon: AlertCircle,
      color: kpis.menungguResponsCount > 0 ? "text-[#C5221F]" : "text-[#5F6368]",
      bgColor: kpis.menungguResponsCount > 0 ? "bg-[#FCE8E6]" : "bg-[#F1F3F4]",
      borderColor: kpis.menungguResponsCount > 0 ? "border-[#FAD2CF]" : "border-[#E8EAED]",
    },
    {
      title: "Sedang Diproses",
      value: formatNumber(kpis.sedangDiprosesCount),
      unit: "pesanan",
      icon: Clock,
      color: "text-[#E37400]",
      bgColor: "bg-[#FEF7E0]",
      borderColor: "border-[#FCE8B2]",
    },
    {
      title: "Selesai Bulan Ini",
      value: formatNumber(kpis.selesaiBulanIniCount),
      unit: "pesanan",
      icon: CheckCircle2,
      color: "text-[#1E8E3E]",
      bgColor: "bg-[#EBF7EE]",
      borderColor: "border-[#C8E9D0]",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="bg-surface border border-border rounded-[10px] p-4 flex flex-col justify-between shadow-xs transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] sm:text-[13px] font-medium text-text-muted">
                {card.title}
              </span>
              <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${card.bgColor} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-text">
                {card.value}
              </span>
              <span className="text-[12px] text-text-muted">
                {card.unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
