"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardFilterBar } from "./DashboardFilterBar";
import { DashboardKpiGrid } from "./DashboardKpiGrid";
import { DailyTrendChart } from "@/components/charts/DailyTrendChart";
import { ShiftDistributionDonut } from "@/components/charts/ShiftDistributionDonut";
import { BagianBarChart } from "@/components/charts/BagianBarChart";
import { VendorBarChart } from "@/components/charts/VendorBarChart";
import {
  DashboardPreset,
  DashboardSummaryData,
} from "@/lib/dashboard";
import { getDashboardSummaryAction } from "@/lib/actions/dashboard";
import { useToast } from "@/components/ui/Toast";

interface AdminDashboardViewProps {
  initialDari: string;
  initialSampai: string;
  initialPreset: DashboardPreset;
}

// Full admin dashboard view orchestrating KPI metrics, adaptive charts, and URL synchronization
export function AdminDashboardView({
  initialDari,
  initialSampai,
  initialPreset,
}: AdminDashboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [preset, setPreset] = useState<DashboardPreset>(initialPreset);
  const [dari, setDari] = useState(initialDari);
  const [sampai, setSampai] = useState(initialSampai);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardSummaryData | null>(null);

  // Synchronize state when URL search params change externally
  useEffect(() => {
    const urlDari = searchParams?.get("dari");
    const urlSampai = searchParams?.get("sampai");
    const urlPreset = searchParams?.get("preset") as DashboardPreset | null;

    if (urlDari && urlSampai && (urlDari !== dari || urlSampai !== sampai)) {
      setDari(urlDari);
      setSampai(urlSampai);
      if (urlPreset) setPreset(urlPreset);
    }
  }, [searchParams, dari, sampai]);

  // Load dashboard data for active range
  const loadDashboard = useCallback(
    async (rangeStart: string, rangeEnd: string) => {
      setLoading(true);
      try {
        const res = await getDashboardSummaryAction(rangeStart, rangeEnd);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          toast({
            title: "Gagal Memuat Data",
            description: res.error ?? "Terjadi kesalahan saat memuat data dashboard",
            variant: "danger",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Trigger load on initial render or range changes
  useEffect(() => {
    loadDashboard(dari, sampai);
  }, [dari, sampai, loadDashboard]);

  // Synchronize URL and state when range changes
  const handleRangeChange = (newDari: string, newSampai: string, newPreset: DashboardPreset) => {
    setDari(newDari);
    setSampai(newSampai);
    setPreset(newPreset);

    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("dari", newDari);
      params.set("sampai", newSampai);
      params.set("preset", newPreset);
      router.replace(`/admin/dashboard?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden select-none gap-3 sm:gap-3.5 lg:gap-2.5 pb-8 lg:pb-0">
      {/* Date Filter Bar */}
      <DashboardFilterBar
        preset={preset}
        dari={dari}
        sampai={sampai}
        onRangeChange={handleRangeChange}
        isLoading={loading || isPending}
      />

      {/* 5 KPI Metric Cards */}
      <DashboardKpiGrid
        totalPorsi={data?.total_porsi ?? 0}
        avgPorsiPerHari={data?.rata_rata_porsi_per_hari ?? 0}
        totalRevisi={data?.jumlah_revisi ?? 0}
        revisiMenunggu={data?.revisi_menunggu ?? 0}
        belumInput={data?.belum_input_hari_ini_besok ?? 0}
        isLoading={loading}
      />

      {/* Two Rows of Analytical Charts (Responsive: stacked on mobile, 2x2 grid on iPad, zero-scroll on desktop) */}
      <div className="flex flex-col lg:flex-1 lg:min-h-0 gap-3 sm:gap-3.5 lg:gap-2.5 pb-4 lg:pb-1">
        {/* Row 1: Trend line chart & Shift distribution donut */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-3.5 lg:gap-2.5 lg:flex-1 lg:min-h-0">
          <div className="md:col-span-7 lg:col-span-8 min-h-[250px] sm:min-h-[270px] lg:min-h-0 lg:h-full">
            <DailyTrendChart
              currentSeries={data?.seri_harian ?? []}
              previousSeries={data?.seri_periode_sebelumnya ?? []}
              isLoading={loading}
            />
          </div>
          <div className="md:col-span-5 lg:col-span-4 min-h-[220px] sm:min-h-[240px] lg:min-h-0 lg:h-full">
            <ShiftDistributionDonut
              series={data?.seri_shift ?? []}
              totalPorsi={data?.total_porsi ?? 0}
              isLoading={loading}
            />
          </div>
        </div>

        {/* Row 2: Department vertical bars & Vendor horizontal bars */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-3.5 lg:gap-2.5 lg:flex-1 lg:min-h-0">
          <div className="md:col-span-7 lg:col-span-7 min-h-[250px] sm:min-h-[270px] lg:min-h-0 lg:h-full">
            <BagianBarChart
              series={data?.seri_bagian ?? []}
              isLoading={loading}
            />
          </div>
          <div className="md:col-span-5 lg:col-span-5 min-h-[240px] sm:min-h-[260px] lg:min-h-0 lg:h-full">
            <VendorBarChart
              series={data?.seri_vendor ?? []}
              totalPorsi={data?.total_porsi ?? 0}
              isLoading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
