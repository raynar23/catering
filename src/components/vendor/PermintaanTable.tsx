"use client";

import React, { useState } from "react";
import { Search, Clock, Eye, AlertCircle, Filter, FileSpreadsheet } from "lucide-react";
import { VendorPermintaanRow } from "@/lib/actions/vendor-portal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VendorDetailInspector } from "./VendorDetailInspector";
import { formatNumber, formatDate } from "@/lib/format";
import { exportToExcel } from "@/lib/export/client-excel";

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

  // Export displayed rows to Excel
  const handleExportToExcel = async () => {
    await exportToExcel({
      filename: `permintaan_pesanan_vendor_${new Date().toISOString().split("T")[0]}`,
      sheetName: "Permintaan Vendor",
      title: "DAFTAR PERMINTAAN PESANAN CATERING",
      subtitle: `Diekspor pada: ${new Date().toLocaleString("id-ID")} | Total: ${filteredRows.length} Permintaan`,
      columns: [
        { header: "Tanggal", key: "tanggal", width: 14 },
        { header: "Shift", key: "shift", width: 18 },
        { header: "Batas Jam Tiba", key: "jamTiba", width: 16 },
        { header: "Total Porsi", key: "totalPorsi", width: 14 },
        { header: "Status Respon", key: "respon", width: 18 },
        { header: "Status Pengiriman", key: "pengiriman", width: 20 },
        { header: "Rincian Bagian & Alokasi", key: "rincian", width: 45 },
        { header: "Catatan GA", key: "catatan", width: 30 },
      ],
      data: filteredRows.map((r) => ({
        tanggal: r.tanggal,
        shift: `${r.shiftNama} (${r.shiftLabel})`,
        jamTiba: r.batasTiba || "-",
        totalPorsi: r.totalPorsi,
        respon:
          r.responVendor === "disanggupi"
            ? "Disanggupi"
            : r.responVendor === "tidak_sanggup"
            ? "Tidak Sanggup"
            : "Menunggu Respon",
        pengiriman: r.progresVendor || "Belum Dikirim",
        rincian: r.items.map((it) => `${it.bagianNama}: ${it.jumlahPorsi} porsi`).join(", "),
        catatan: r.catatanGa || "-",
      })),
    });
  };

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

        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
          <div className="text-[12px] text-text-muted whitespace-nowrap">
            Menampilkan <strong className="text-text">{filteredRows.length}</strong> data
          </div>
          <button
            type="button"
            onClick={handleExportToExcel}
            className="h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white hover:bg-[#F2F2F7] active:bg-[#E5E5EA] text-[#1C1C1E] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)] whitespace-nowrap shrink-0"
            title="Ekspor data saat ini ke Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#48484A]" />
            <span className="hidden sm:inline whitespace-nowrap">Ekspor Excel</span>
            <span className="sm:hidden whitespace-nowrap">Ekspor</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface border border-border rounded-[10px] flex-1 min-h-0 flex flex-col overflow-hidden shadow-xs">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <table className="w-full text-xs text-left border-collapse table-fixed">
            <thead className="bg-[#F8FAFC] text-text-muted font-semibold border-b border-border text-[11px] sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">
                  <span className="sm:hidden">Tanggal & Shift</span>
                  <span className="hidden sm:inline">Tanggal</span>
                </th>
                <th className="py-3 px-4 hidden sm:table-cell">Shift Kerja</th>
                <th className="py-3 px-4 hidden md:table-cell">Batas Jam Tiba</th>
                <th className="py-2.5 px-2 text-right w-[75px] sm:w-[90px]">Porsi</th>
                <th className="py-2.5 px-2 text-center w-[85px] sm:w-[130px]">Respon</th>
                <th className="py-3 px-4 hidden md:table-cell">Progres Pengantaran</th>
                <th className="py-2.5 px-2 text-center w-12 sm:w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
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
                    <td className="py-2 px-3 align-middle">
                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="font-semibold text-text text-xs">
                          {row.tanggal}
                        </span>
                        <span className="text-[10px] text-text-muted truncate sm:hidden">
                          {row.shiftNama} ({row.shiftLabel})
                        </span>
                        <span className="text-[10px] text-text-muted truncate sm:hidden">
                          Tiba: {row.batasTiba} WIB
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-text">
                          {row.shiftNama}
                        </span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[4px] bg-[#E8F2FA] text-[#0B5A94]">
                          {row.shiftLabel}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-muted hidden md:table-cell">
                      <span className="flex items-center gap-1 text-[12px]">
                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                        {row.batasTiba} WIB ({row.shiftJam})
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-text align-middle">
                      {formatNumber(row.totalPorsi)}
                    </td>
                    <td className="py-2 px-2 text-center align-middle">
                      <StatusBadge status={row.responVendor} />
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
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
                    <td className="py-2 px-2 text-center align-middle">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(row);
                          setInspectorOpen(true);
                        }}
                        className="p-1 rounded-[6px] hover:bg-black/5 text-text-muted hover:text-text inline-flex items-center justify-center cursor-pointer"
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
