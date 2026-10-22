"use client";

import React, { useState } from "react";
import { Search, Clock, Eye, AlertCircle, Filter } from "lucide-react";
import { VendorPermintaanRow } from "@/lib/actions/vendor-portal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VendorDetailInspector } from "./VendorDetailInspector";
import { formatNumber } from "@/lib/format";

interface PermintaanTableProps {
  initialRows: VendorPermintaanRow[];
}

// Interactive table for browsing vendor incoming final orders with inspector drawer
export function PermintaanTable({ initialRows }: PermintaanTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<VendorPermintaanRow | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Client-side filtering for immediate fast responsiveness
  const filteredRows = initialRows.filter((row) => {
    if (dateFilter && row.tanggal !== dateFilter) return false;
    if (statusFilter !== "all" && row.responVendor !== statusFilter) return false;

    if (search) {
      const q = search.toLowerCase();
      const match =
        row.tanggal.includes(q) ||
        row.shiftNama.toLowerCase().includes(q) ||
        row.shiftLabel.toLowerCase().includes(q) ||
        (row.catatanGa || "").toLowerCase().includes(q) ||
        row.items.some(
          (it) =>
            it.bagianNama.toLowerCase().includes(q) ||
            it.lokasiAntar.toLowerCase().includes(q)
        );
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Filters Toolbar */}
      <div className="bg-surface border border-border rounded-[10px] p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari shift, tanggal, bagian, catatan..."
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-border rounded-[8px] bg-surface focus:outline-hidden focus:ring-1 focus:ring-primary min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-[13px] px-3 py-2 border border-border rounded-[8px] bg-surface min-h-[44px]"
              title="Filter Tanggal"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter("")}
                className="text-[12px] text-text-muted hover:text-text px-2 py-1 min-h-[44px] cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted shrink-0 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-[13px] pl-3 pr-10 py-2 border border-border rounded-[8px] bg-surface min-h-[44px] cursor-pointer"
            >
              <option value="all">Semua Status Respon</option>
              <option value="menunggu">Menunggu Respon</option>
              <option value="disanggupi">Disanggupi</option>
              <option value="tidak_sanggup">Tidak Sanggup</option>
            </select>
          </div>
        </div>

        <div className="text-[12px] text-text-muted shrink-0 text-right">
          Menampilkan <strong className="text-text">{filteredRows.length}</strong> data
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface border border-border rounded-[10px] flex-1 min-h-0 flex flex-col overflow-hidden shadow-xs">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-[13px] text-left border-collapse min-w-[700px]">
            <thead className="bg-[#F8FAFC] text-text-muted font-semibold border-b border-border text-[12px] sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Shift Kerja</th>
                <th className="py-3 px-4">Batas Jam Tiba</th>
                <th className="py-3 px-4 text-right">Total Porsi</th>
                <th className="py-3 px-4">Respon Vendor</th>
                <th className="py-3 px-4">Progres Pengantaran</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted">
                    Tidak ada permintaan catering yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.orderId}
                    onClick={() => {
                      setSelectedOrder(row);
                      setInspectorOpen(true);
                    }}
                    className="hover:bg-black/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-text">
                      {row.tanggal}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-text">
                          {row.shiftNama}
                        </span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[4px] bg-[#E8F2FA] text-[#0B5A94]">
                          {row.shiftLabel}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      <span className="flex items-center gap-1 text-[12px]">
                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                        {row.batasTiba} WIB ({row.shiftJam})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-text">
                      {formatNumber(row.totalPorsi)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={row.responVendor} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={row.progresVendor} />
                        {row.pendingRevisionsCount > 0 && (
                          <span
                            className="flex items-center gap-1 text-[11px] text-[#C5221F] bg-[#FCE8E6] px-1.5 py-0.5 rounded-[4px]"
                            title="Terdapat revisi kuota menunggu konfirmasi"
                          >
                            <AlertCircle className="w-3 h-3" />
                            {row.pendingRevisionsCount} Revisi
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(row);
                          setInspectorOpen(true);
                        }}
                        className="p-2 rounded-[6px] hover:bg-black/5 text-text-muted hover:text-text min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer"
                        title="Buka Rincian Bagian"
                        aria-label="Buka Rincian Bagian"
                      >
                        <Eye className="w-4 h-4 text-primary" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Inspector Drawer */}
      <VendorDetailInspector
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        orderInfo={
          selectedOrder
            ? {
                tanggal: selectedOrder.tanggal,
                shiftNama: selectedOrder.shiftNama,
                shiftLabel: selectedOrder.shiftLabel,
                shiftJam: selectedOrder.shiftJam,
                batasTiba: selectedOrder.batasTiba,
                totalPorsi: selectedOrder.totalPorsi,
                status: selectedOrder.status,
                responVendor: selectedOrder.responVendor,
                progresVendor: selectedOrder.progresVendor,
                catatanGa: selectedOrder.catatanGa,
                catatanVendor: selectedOrder.catatanVendor,
                diupdateOleh: selectedOrder.diupdateOleh,
                items: selectedOrder.items,
              }
            : null
        }
      />
    </div>
  );
}
