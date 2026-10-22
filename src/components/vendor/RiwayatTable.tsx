"use client";

import React, { useState } from "react";
import { Search, Clock, Eye, Filter } from "lucide-react";
import { VendorPermintaanRow } from "@/lib/actions/vendor-portal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VendorDetailInspector } from "./VendorDetailInspector";
import { formatNumber } from "@/lib/format";

interface RiwayatTableProps {
  initialRows: VendorPermintaanRow[];
}

// Full historical order log and inspection table for vendor
export function RiwayatTable({ initialRows }: RiwayatTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [progresFilter, setProgresFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<VendorPermintaanRow | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const filteredRows = initialRows.filter((row) => {
    if (startDate && row.tanggal < startDate) return false;
    if (endDate && row.tanggal > endDate) return false;
    if (statusFilter !== "all" && row.responVendor !== statusFilter) return false;
    if (progresFilter !== "all" && row.progresVendor !== progresFilter) return false;

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
      <div className="bg-surface border border-border rounded-[10px] p-3 sm:p-4 flex flex-col gap-3 shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tanggal, shift, bagian, catatan..."
              className="w-full pl-9 pr-3 py-2 text-[13px] border border-border rounded-[8px] bg-surface focus:outline-hidden focus:ring-1 focus:ring-primary min-h-[44px]"
            />
          </div>

          <div className="text-[12px] text-text-muted shrink-0 text-right sm:text-left">
            Menampilkan <strong className="text-text">{filteredRows.length}</strong> dari {initialRows.length} data
          </div>
        </div>

        {/* Date and Status Filters */}
        <div className="flex items-center gap-2 flex-wrap text-[13px]">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted text-[12px]">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-[12px] px-2.5 py-1.5 border border-border rounded-[8px] bg-surface min-h-[44px]"
              title="Dari Tanggal"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-text-muted text-[12px]">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-[12px] px-2.5 py-1.5 border border-border rounded-[8px] bg-surface min-h-[44px]"
              title="Sampai Tanggal"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted shrink-0 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-[12px] pl-2.5 pr-8 py-1.5 border border-border rounded-[8px] bg-surface min-h-[44px] cursor-pointer"
            >
              <option value="all">Semua Respon</option>
              <option value="menunggu">Menunggu</option>
              <option value="disanggupi">Disanggupi</option>
              <option value="tidak_sanggup">Tidak Sanggup</option>
            </select>

            <select
              value={progresFilter}
              onChange={(e) => setProgresFilter(e.target.value)}
              className="text-[12px] pl-2.5 pr-8 py-1.5 border border-border rounded-[8px] bg-surface min-h-[44px] cursor-pointer"
            >
              <option value="all">Semua Progres</option>
              <option value="menunggu">Menunggu</option>
              <option value="dipersiapkan">Dipersiapkan</option>
              <option value="dikirim">Dikirim</option>
              <option value="sampai">Sampai</option>
              <option value="selesai">Selesai</option>
            </select>
          </div>

          {(startDate || endDate || statusFilter !== "all" || progresFilter !== "all" || search) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setStatusFilter("all");
                setProgresFilter("all");
                setSearch("");
              }}
              className="text-[12px] text-text-muted hover:text-text px-2 py-1 min-h-[44px] cursor-pointer ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Table */}
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
                <th className="py-3 px-4">Progres</th>
                <th className="py-3 px-4">Diupdate Oleh</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    Tidak ada arsip riwayat pesanan yang cocok dengan kriteria filter.
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
                    <td className="py-3 px-4 text-text-muted text-[12px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                        {row.batasTiba} WIB
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-text">
                      {formatNumber(row.totalPorsi)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={row.responVendor} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={row.progresVendor} />
                    </td>
                    <td className="py-3 px-4 text-text-muted text-[12px]">
                      {row.diupdateOleh}
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
                        title="Buka Rincian Riwayat"
                        aria-label="Buka Rincian Riwayat"
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
