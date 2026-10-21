import React, { Suspense } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminDashboardView } from "@/components/dashboard/AdminDashboardView";
import { DashboardPreset, getPresetDateRange } from "@/lib/dashboard";
import { formatDateLong } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

interface AdminDashboardPageProps {
  searchParams?: Promise<{
    dari?: string;
    sampai?: string;
    preset?: string;
  }>;
}

// Fallback skeleton while parameters resolve or client hydration takes place
function DashboardSkeleton() {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 animate-pulse">
      <div className="h-9 w-72 bg-border/40 rounded-[8px]" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-[10px] p-3.5 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="flex-1 min-h-[220px] bg-surface border border-border rounded-[10px]" />
    </div>
  );
}

// Admin dashboard overview page with synchronized date filters, KPI metrics, and charts
export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const defaultRange = getPresetDateRange("bulan_ini");

  const initialPreset = (resolvedParams.preset as DashboardPreset) || "bulan_ini";
  const initialDari = resolvedParams.dari || defaultRange.dari;
  const initialSampai = resolvedParams.sampai || defaultRange.sampai;
  const todayStr = formatDateLong(new Date());

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle={todayStr}
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminDashboardView
          initialDari={initialDari}
          initialSampai={initialSampai}
          initialPreset={initialPreset}
        />
      </Suspense>
    </PageContainer>
  );
}
