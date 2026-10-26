"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RekapFilterBar } from "./RekapFilterBar";
import { RekapHarianTable } from "./RekapHarianTable";
import { RekapRingkasanPanel } from "./RekapRingkasanPanel";
import { ExportDialog } from "./ExportDialog";
import {
  RekapPreset,
} from "@/lib/rekap";
import {
  RekapFilterOptions,
  RekapHarianData,
  RekapRingkasanData,
  getRekapFilterOptionsAction,
  getRekapHarianAction,
  getRekapRingkasanAction,
} from "@/lib/actions/rekap";
import { useToast } from "@/components/ui/Toast";

interface AdminRekapViewProps {
  initialDari: string;
  initialSampai: string;
  initialPreset: RekapPreset;
  initialTab?: "harian" | "ringkasan";
}

// Master view orchestrating filters, server queries, matrix tables, summary panel, and export modal
export function AdminRekapView({
  initialDari,
  initialSampai,
  initialPreset,
  initialTab = "harian",
}: AdminRekapViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Filter states
  const [preset, setPreset] = useState<RekapPreset>(initialPreset);
  const [dari, setDari] = useState(initialDari);
  const [sampai, setSampai] = useState(initialSampai);
  const [vendorId, setVendorId] = useState("");
  const [bagianId, setBagianId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [activeTab, setActiveTab] = useState<"harian" | "ringkasan">(initialTab);

  // Pagination states for Rekap Harian
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data states
  const [filterOptions, setFilterOptions] = useState<RekapFilterOptions>({
    vendors: [],
    bagian: [],
    shifts: [],
  });
  const [harianData, setHarianData] = useState<RekapHarianData | null>(null);
  const [ringkasanData, setRingkasanData] = useState<RekapRingkasanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  // Load filter dropdown options once
  useEffect(() => {
    let mounted = true;
    getRekapFilterOptionsAction().then((res) => {
      if (mounted && res.success && res.data) {
        setFilterOptions(res.data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Synchronize state with URL search parameters
  const updateUrlParams = useCallback(
    (
      newDari: string,
      newSampai: string,
      newPreset: RekapPreset,
      newVendor: string,
      newBagian: string,
      newShift: string,
      newTab: "harian" | "ringkasan"
    ) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        params.set("dari", newDari);
        params.set("sampai", newSampai);
        params.set("preset", newPreset);
        if (newVendor) params.set("vendor", newVendor);
        else params.delete("vendor");
        if (newBagian) params.set("bagian", newBagian);
        else params.delete("bagian");
        if (newShift) params.set("shift", newShift);
        else params.delete("shift");
        params.set("tab", newTab);

        router.replace(`/admin/rekapitulasi?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  // Fetch active tab data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "harian") {
        const res = await getRekapHarianAction({
          dari,
          sampai,
          vendorId: vendorId || undefined,
          bagianId: bagianId || undefined,
          shiftId: shiftId || undefined,
          page,
          pageSize,
        });

        if (res.success && res.data) {
          setHarianData(res.data);
        } else {
          toast({
            title: "Gagal Memuat Rekap Harian",
            description: res.error ?? "Terjadi kesalahan sistem",
            variant: "danger",
          });
        }
      } else {
        const res = await getRekapRingkasanAction({
          dari,
          sampai,
          vendorId: vendorId || undefined,
          bagianId: bagianId || undefined,
          shiftId: shiftId || undefined,
        });

        if (res.success && res.data) {
          setRingkasanData(res.data);
        } else {
          toast({
            title: "Gagal Memuat Ringkasan",
            description: res.error ?? "Terjadi kesalahan sistem",
            variant: "danger",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [dari, sampai, vendorId, bagianId, shiftId, activeTab, page, pageSize, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handlePresetChange = (newPreset: RekapPreset, newDari: string, newSampai: string) => {
    setPreset(newPreset);
    setDari(newDari);
    setSampai(newSampai);
    setPage(1);
    updateUrlParams(newDari, newSampai, newPreset, vendorId, bagianId, shiftId, activeTab);
  };

  const handleCustomRangeChange = (newDari: string, newSampai: string) => {
    setPreset("kustom");
    setDari(newDari);
    setSampai(newSampai);
    setPage(1);
    updateUrlParams(newDari, newSampai, "kustom", vendorId, bagianId, shiftId, activeTab);
  };

  const handleVendorChange = (newVendor: string) => {
    setVendorId(newVendor);
    setPage(1);
    updateUrlParams(dari, sampai, preset, newVendor, bagianId, shiftId, activeTab);
  };

  const handleBagianChange = (newBagian: string) => {
    setBagianId(newBagian);
    setPage(1);
    updateUrlParams(dari, sampai, preset, vendorId, newBagian, shiftId, activeTab);
  };

  const handleShiftChange = (newShift: string) => {
    setShiftId(newShift);
    setPage(1);
    updateUrlParams(dari, sampai, preset, vendorId, bagianId, newShift, activeTab);
  };

  const handleTabChange = (newTab: "harian" | "ringkasan") => {
    setActiveTab(newTab);
    updateUrlParams(dari, sampai, preset, vendorId, bagianId, shiftId, newTab);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden select-none">
      {/* Filter and Tab Bar */}
      <RekapFilterBar
        preset={preset}
        dari={dari}
        sampai={sampai}
        vendorId={vendorId}
        bagianId={bagianId}
        shiftId={shiftId}
        activeTab={activeTab}
        filterOptions={filterOptions}
        isLoading={loading || isPending}
        onPresetChange={handlePresetChange}
        onCustomRangeChange={handleCustomRangeChange}
        onVendorChange={handleVendorChange}
        onBagianChange={handleBagianChange}
        onShiftChange={handleShiftChange}
        onTabChange={handleTabChange}
        onOpenExport={() => setExportOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col mt-2">
        {activeTab === "harian" ? (
          <RekapHarianTable
            data={harianData}
            isLoading={loading}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        ) : (
          <RekapRingkasanPanel
            data={ringkasanData}
            isLoading={loading}
          />
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        dari={dari}
        sampai={sampai}
        vendorId={vendorId || undefined}
        bagianId={bagianId || undefined}
        shiftId={shiftId || undefined}
      />
    </div>
  );
}
