import React, { Suspense } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminRekapView } from "@/components/rekap/AdminRekapView";
import { RekapPreset, getRekapPresetRange } from "@/lib/rekap";
import { formatDateLong } from "@/lib/format";

interface AdminRekapitulasiPageProps {
  searchParams?: Promise<{
    dari?: string;
    sampai?: string;
    preset?: string;
    tab?: string;
  }>;
}

// Fallback skeleton while server parameters resolve
function RekapLoadingFallback() {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 animate-pulse">
      <div className="h-9 w-72 bg-border/40 rounded-[8px]" />
      <div className="flex-1 bg-surface border border-border rounded-[10px]" />
    </div>
  );
}

// Admin recapitulation and reporting page unifying daily matrix, summary analytics, and export
export default async function AdminRekapitulasiPage({
  searchParams,
}: AdminRekapitulasiPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const defaultRange = getRekapPresetRange("bulanan");

  const initialPreset = (resolvedParams.preset as RekapPreset) || "bulanan";
  const initialDari = resolvedParams.dari || defaultRange.dari;
  const initialSampai = resolvedParams.sampai || defaultRange.sampai;
  const initialTab = resolvedParams.tab === "ringkasan" ? "ringkasan" : "harian";
  const todayStr = formatDateLong(new Date());

  return (
    <PageContainer>
      <PageHeader
        title="Rekapitulasi dan Laporan"
        subtitle={todayStr}
      />
      <Suspense fallback={<RekapLoadingFallback />}>
        <AdminRekapView
          initialDari={initialDari}
          initialSampai={initialSampai}
          initialPreset={initialPreset}
          initialTab={initialTab}
        />
      </Suspense>
    </PageContainer>
  );
}
