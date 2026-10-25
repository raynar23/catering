"use client";

import React, { useState, useCallback } from "react";
import {
  VerificationRevisionItem,
  VendorResponseItem,
  verifikasiRevisiAction,
  getVerificationRevisionsList,
  getVendorResponseFollowUpList,
} from "@/lib/actions/revisi";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { RevisiTable } from "./RevisiTable";
import { ResponsVendorTable } from "./ResponsVendorTable";
import { VerifikasiDialog } from "./VerifikasiDialog";
import { useToast } from "@/components/ui/Toast";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import { Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifikasiViewProps {
  initialRevisions: VerificationRevisionItem[];
  initialVendorResponses: VendorResponseItem[];
}

// Complete verification workspace view with segmented tabs, filters, and verification dialog
export function VerifikasiView({
  initialRevisions,
  initialVendorResponses,
}: VerifikasiViewProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("revisi");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("semua");

  const [revisions, setRevisions] = useState<VerificationRevisionItem[]>(initialRevisions);
  const [vendorResponses, setVendorResponses] = useState<VendorResponseItem[]>(initialVendorResponses);

  // Dialog state
  const [selectedRevision, setSelectedRevision] = useState<VerificationRevisionItem | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const pendingRevisionsCount = revisions.filter((r) => r.status === "menunggu").length;
  const vendorRejectionsCount = vendorResponses.length;

  const refreshRevisions = useCallback(async () => {
    try {
      const fresh = await getVerificationRevisionsList();
      setRevisions(fresh);
    } catch (err) {
      console.error("Failed to refresh revisions", err);
    }
  }, []);

  const refreshVendorResponses = useCallback(async () => {
    try {
      const fresh = await getVendorResponseFollowUpList();
      setVendorResponses(fresh);
    } catch (err) {
      console.error("Failed to refresh vendor responses", err);
    }
  }, []);

  // Subscribe to real-time revisions updates
  useRealtimeTable({
    table: "revisions",
    onUpdate: (newRev: any) => {
      setRevisions((prev) =>
        prev.map((r) =>
          r.id === newRev.id
            ? {
                ...r,
                status: newRev.status ?? r.status,
                responVendor: newRev.respon_vendor ?? r.responVendor,
                catatanVendor:
                  newRev.catatan_vendor !== undefined
                    ? newRev.catatan_vendor
                    : r.catatanVendor,
                catatanVerifikator:
                  newRev.catatan_verifikator !== undefined
                    ? newRev.catatan_verifikator
                    : r.catatanVerifikator,
                diverifikasiAt: newRev.diverifikasi_at ?? r.diverifikasiAt,
              }
            : r
        )
      );
    },
    onInsert: () => {
      refreshRevisions();
    },
    onReconnect: () => {
      refreshRevisions();
      refreshVendorResponses();
    },
  });

  // Subscribe to real-time catering orders for vendor rejection follow-ups
  useRealtimeTable({
    table: "catering_orders",
    onUpdate: () => {
      refreshVendorResponses();
    },
    onReconnect: () => {
      refreshVendorResponses();
    },
  });

  const handleVerify = async (
    revisionId: string,
    setuju: boolean,
    catatan?: string
  ) => {
    try {
      setIsVerifying(true);
      const res = await verifikasiRevisiAction({
        revisionId,
        setuju,
        catatan,
      });

      if (!res.success) {
        toast({
          title: "Verifikasi gagal",
          description: res.error || "Gagal memproses verifikasi revisi.",
          variant: "danger",
        });
        return;
      }

      toast({
        title: setuju ? "Revisi disetujui" : "Revisi dibatalkan",
        description: res.message || "Status pengajuan revisi telah diperbarui.",
        variant: "success",
      });

      // Update local state
      setRevisions((prev) =>
        prev.map((r) =>
          r.id === revisionId
            ? {
                ...r,
                status: setuju ? "disetujui" : "ditolak",
                catatanVerifikator: catatan || null,
                diverifikasiAt: new Date().toISOString(),
              }
            : r
        )
      );

      setSelectedRevision(null);
    } catch (err: unknown) {
      console.error("Verification error:", err);
      toast({
        title: "Kesalahan verifikasi",
        description: err instanceof Error ? err.message : "Terjadi kesalahan sistem.",
        variant: "danger",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Filter revisions by search and status
  const filteredRevisions = revisions.filter((r) => {
    const matchSearch =
      r.bagianNama.toLowerCase().includes(search.toLowerCase()) ||
      r.vendorNama.toLowerCase().includes(search.toLowerCase()) ||
      r.alasan.toLowerCase().includes(search.toLowerCase()) ||
      r.diajukanOlehNama.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "semua" || r.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // Filter vendor responses by search
  const filteredVendorResponses = vendorResponses.filter((v) => {
    return (
      v.vendorNama.toLowerCase().includes(search.toLowerCase()) ||
      v.shiftNama.toLowerCase().includes(search.toLowerCase()) ||
      (v.catatanVendor && v.catatanVendor.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      {/* Top Toolbar: Tabs and Search Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-black/[0.08] rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] select-none">
        {/* Segmented Control */}
        <div className="flex items-center gap-2">
          <SegmentedControl
            options={[
              {
                value: "revisi",
                label: `Pengajuan Revisi ${pendingRevisionsCount > 0 ? `(${pendingRevisionsCount})` : ""}`,
              },
              {
                value: "respons_vendor",
                label: `Respons Vendor ${vendorRejectionsCount > 0 ? `(${vendorRejectionsCount})` : ""}`,
              },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Tab Verifikasi Data"
          />
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari bagian, vendor, alasan..."
              className="pl-8 pr-3 h-8 text-xs rounded-[8px] border border-[#D1D1D6] bg-white text-text placeholder:text-[#86868B] shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all w-48 sm:w-64"
            />
          </div>

          {activeTab === "revisi" && (
            <div className="flex items-center gap-1 bg-[#E5E5EA]/70 p-[2.5px] rounded-[8px] text-xs">
              <Filter className="w-3 h-3 text-[#86868B] ml-1.5" />
              {(["semua", "menunggu", "disetujui", "ditolak"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-[6px] font-semibold capitalize transition-all cursor-pointer",
                    statusFilter === st
                      ? "bg-white text-text shadow-[0_1px_2.5px_rgba(0,0,0,0.12),0_0.5px_1px_rgba(0,0,0,0.06)]"
                      : "text-[#6E6E73] hover:text-[#1D1D1F]"
                  )}
                >
                  {st === "semua" ? "Semua" : st === "menunggu" ? "Menunggu" : st === "disetujui" ? "Disetujui" : "Dibatalkan"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="flex-1 min-h-0 flex flex-col bg-white border border-black/[0.08] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        {activeTab === "revisi" ? (
          <RevisiTable
            items={filteredRevisions}
            onOpenVerify={(rev) => setSelectedRevision(rev)}
          />
        ) : (
          <ResponsVendorTable items={filteredVendorResponses} />
        )}
      </div>

      {/* Verifikasi Modal Dialog */}
      <VerifikasiDialog
        open={Boolean(selectedRevision)}
        onOpenChange={(open) => !open && setSelectedRevision(null)}
        item={selectedRevision}
        onVerify={handleVerify}
        isProcessing={isVerifying}
      />
    </div>
  );
}
