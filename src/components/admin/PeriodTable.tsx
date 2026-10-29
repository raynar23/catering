"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PeriodDialog } from "./PeriodDialog";
import { GantiVendorDialog } from "./GantiVendorDialog";
import { ShiftDialog } from "./ShiftDialog";
import {
  PeriodListItem,
  getPeriodList,
  deleteSelectedPeriodsAction,
} from "@/lib/actions/periode";
import { getShiftList } from "@/lib/actions/shift";
import { getVendorList, VendorRecord } from "@/lib/actions/vendor";
import { Shift } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { formatTimeShort, MONTH_OPTIONS } from "@/lib/date";
import { waLink } from "@/lib/whatsapp";
import { useToast } from "@/components/ui/Toast";
import { useRealtimeTable } from "@/lib/realtime/useRealtimeTable";
import {
  Plus,
  Settings2,
  Pencil,
  Trash2,
  ArrowLeftRight,
  MessageSquare,
  CheckSquare,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { exportToExcel } from "@/lib/export/client-excel";

export function PeriodTable() {
  const { toast } = useToast();
  const [data, setData] = useState<PeriodListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedShift, setSelectedShift] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodListItem | null>(null);

  const [gantiVendorOpen, setGantiVendorOpen] = useState(false);
  const [periodToGanti, setPeriodToGanti] = useState<PeriodListItem | null>(null);

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [selectedShiftToEdit, setSelectedShiftToEdit] = useState<Shift | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<PeriodListItem | null>(null);

  const [selectedPeriodIds, setSelectedPeriodIds] = useState<Set<string>>(new Set());
  const [deleteSelectedConfirmOpen, setDeleteSelectedConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Load shifts and vendors options
  const loadOptions = useCallback(async () => {
    const [shiftData, vendorRes] = await Promise.all([
      getShiftList(),
      getVendorList(),
    ]);
    setShifts(shiftData);
    setVendors(vendorRes.data);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPeriodList({
        year: selectedYear,
        month: selectedMonth === 0 ? undefined : selectedMonth,
        shift_id: selectedShift === "all" ? undefined : selectedShift,
        vendor_id: selectedVendor === "all" ? undefined : selectedVendor,
        status: selectedStatus === "all" ? undefined : selectedStatus,
      });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedShift, selectedVendor, selectedStatus]);

  // Subscribe to real-time catering order updates to mutate row statuses in place
  useRealtimeTable({
    table: "catering_orders",
    onUpdate: (newOrder: any) => {
      setData((prev) =>
        prev.map((row) => {
          if (row.id === newOrder.period_id) {
            return {
              ...row,
              status: newOrder.status ?? row.status,
              respon_vendor: newOrder.respon_vendor ?? row.respon_vendor,
              progres_vendor: newOrder.progres_vendor ?? row.progres_vendor,
              total_porsi:
                typeof newOrder.total_porsi === "number"
                  ? newOrder.total_porsi
                  : row.total_porsi,
            };
          }
          return row;
        })
      );
    },
    onInsert: () => {
      loadData();
    },
    onReconnect: () => {
      loadData();
    },
  });

  // Subscribe to real-time period updates for vendor assignment and status changes
  useRealtimeTable({
    table: "periods",
    onUpdate: (newPeriod: any) => {
      setData((prev) =>
        prev.map((row) => {
          if (row.id === newPeriod.id) {
            const v = vendors.find((x) => x.id === newPeriod.vendor_id);
            return {
              ...row,
              vendor_id: newPeriod.vendor_id ?? row.vendor_id,
              vendor_nama: v ? v.nama : row.vendor_nama,
              vendor_kode: v ? v.kode : row.vendor_kode,
              vendor_kontak: v ? (v.no_wa || v.no_telp || "") : row.vendor_kontak,
              keterangan: newPeriod.keterangan !== undefined ? newPeriod.keterangan : row.keterangan,
            };
          }
          return row;
        })
      );
    },
    onInsert: () => {
      loadData();
    },
    onDelete: () => {
      loadData();
    },
    onReconnect: () => {
      loadData();
    },
  });

  useEffect(() => {
    let active = true;
    Promise.all([getShiftList(), getVendorList()]).then(([shiftData, vendorRes]) => {
      if (active) {
        setShifts(shiftData);
        setVendors(vendorRes.data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getPeriodList({
      year: selectedYear,
      month: selectedMonth,
      shift_id: selectedShift === "all" ? undefined : selectedShift,
      vendor_id: selectedVendor === "all" ? undefined : selectedVendor,
      status: selectedStatus === "all" ? undefined : selectedStatus,
    })
      .then((res) => {
        if (active) {
          setData(res.data);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedYear, selectedMonth, selectedShift, selectedVendor, selectedStatus]);

  const handleAddPeriod = () => {
    setSelectedPeriod(null);
    setPeriodDialogOpen(true);
  };

  const handleEditPeriod = (row: PeriodListItem) => {
    setSelectedPeriod(row);
    setPeriodDialogOpen(true);
  };

  const handleGantiVendor = (row: PeriodListItem) => {
    setPeriodToGanti(row);
    setGantiVendorOpen(true);
  };

  const handleToggleSelectAll = () => {
    if (data.length === 0) return;
    const allSelected = data.every((item) => selectedPeriodIds.has(item.id));
    if (allSelected) {
      setSelectedPeriodIds(new Set());
    } else {
      setSelectedPeriodIds(new Set(data.map((item) => item.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedPeriodIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirmDeleteSelected = async () => {
    if (selectedPeriodIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await deleteSelectedPeriodsAction(Array.from(selectedPeriodIds));
      setDeleteSelectedConfirmOpen(false);
      if (res.success) {
        toast({
          title: "Berhasil Menghapus",
          description: res.message ?? `${selectedPeriodIds.size} periode berhasil dihapus`,
          variant: "success",
        });
        setSelectedPeriodIds(new Set());
        loadData();
      } else {
        toast({
          title: "Gagal Menghapus",
          description: res.error ?? "Terjadi kesalahan saat menghapus data terpilih",
          variant: "danger",
        });
      }
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeletePeriodClick = (row: PeriodListItem) => {
    setPeriodToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!periodToDelete) return;
    const res = await deleteSelectedPeriodsAction([periodToDelete.id]);
    setDeleteConfirmOpen(false);

    if (res.success) {
      toast({
        title: "Berhasil",
        description: "Jadwal periode berhasil dihapus",
        variant: "success",
      });
      loadData();
    } else {
      toast({
        title: "Gagal Menghapus",
        description: res.error ?? "Terjadi kesalahan",
        variant: "danger",
      });
    }
  };

  const handleExportToExcel = () => {
    if (data.length === 0) {
      toast({
        title: "Data Kosong",
        description: "Tidak ada jadwal periode yang tersedia untuk diekspor",
        variant: "default",
      });
      return;
    }

    const monthLabel =
      selectedMonth === 0
        ? "Semua Bulan"
        : MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || `Bulan ${selectedMonth}`;
    const filename = `Jadwal_Periode_Catering_${selectedYear}_${selectedMonth || "Semua"}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    exportToExcel({
      filename,
      title: "JADWAL OPERASIONAL & PERIODE CATERING",
      subtitle: `PT Terminal Petikemas Surabaya | Tahun: ${selectedYear} (${monthLabel}) | Total: ${data.length} Jadwal`,
      columns: [
        { header: "Tanggal", key: "tanggal", width: 14, format: (r) => formatDate(r.tanggal) },
        {
          header: "Shift Kerja",
          key: "shift_nama",
          width: 18,
          format: (r) =>
            `${r.shift_nama} (${formatTimeShort(r.shift_jam_mulai)} - ${formatTimeShort(r.shift_jam_selesai)})`,
        },
        { header: "Kode Vendor", key: "vendor_kode", width: 12 },
        { header: "Nama Vendor", key: "vendor_nama", width: 25 },
        { header: "Kontak Vendor", key: "vendor_kontak", width: 16 },
        {
          header: "Total Porsi",
          key: "total_porsi",
          width: 12,
          align: "right",
          format: (r) => (r.total_porsi > 0 ? r.total_porsi : 0),
        },
        { header: "Status Pesanan", key: "status", width: 14 },
        { header: "Progres Vendor", key: "progres_vendor", width: 14 },
        { header: "Diupdate Oleh", key: "diupdate_oleh", width: 18, format: (r) => r.diupdate_oleh || "-" },
        { header: "Keterangan", key: "keterangan", width: 25, format: (r) => r.keterangan || "-" },
      ],
      data,
    });

    toast({
      title: "Ekspor Berhasil",
      description: `Jadwal periode ${monthLabel} ${selectedYear} berhasil diunduh ke Excel`,
      variant: "success",
    });
  };

  const columns: ColumnDef<PeriodListItem>[] = [
    {
      key: "select",
      sortable: false,
      className: "px-1 sm:px-2 text-center",
      header: (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            aria-label="Pilih semua baris pada tabel"
            checked={data.length > 0 && data.every((row) => selectedPeriodIds.has(row.id))}
            onChange={handleToggleSelectAll}
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-[#003366]"
          />
        </div>
      ),
      width: 38,
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            aria-label={`Pilih periode ${row.tanggal}`}
            checked={selectedPeriodIds.has(row.id)}
            onChange={() => handleToggleSelectOne(row.id)}
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-[#003366]"
          />
        </div>
      ),
    },
    {
      key: "tanggal",
      header: "Tanggal",
      width: 95,
      sortValue: (row) => `${row.tanggal}_${String(row.shift_urutan).padStart(2, "0")}`,
      render: (row) => (
        <div className="min-w-0 pr-1">
          <span className="font-semibold text-text tabular-nums block text-xs">
            {formatDate(row.tanggal)}
          </span>
          <span className="text-[10px] text-text-muted sm:hidden block truncate">
            {row.shift_nama}
          </span>
        </div>
      ),
    },
    {
      key: "shift_nama",
      header: "Shift Kerja",
      className: "hidden sm:table-cell",
      sortValue: (row) => row.shift_urutan,
      render: (row) => (
        <div>
          <span className="font-medium text-text">{row.shift_nama}</span>
          <span className="text-[11px] text-text-muted ml-1.5 tabular-nums">
            ({formatTimeShort(row.shift_jam_mulai)} - {formatTimeShort(row.shift_jam_selesai)})
          </span>
        </div>
      ),
    },
    {
      key: "vendor_nama",
      header: "Vendor",
      sortValue: (row) => row.vendor_nama,
      render: (row) => (
        <div className="min-w-0 pr-1">
          <div className="font-medium text-text truncate">
            {row.vendor_nama}
            <span className="text-[10px] text-primary ml-1 font-semibold tabular-nums sm:hidden">
              ({row.vendor_kode})
            </span>
          </div>
          <div className="text-[10px] text-text-muted sm:hidden flex items-center gap-1 mt-0.5">
            <span className="font-bold text-text tabular-nums">
              {row.total_porsi > 0 ? `${row.total_porsi} porsi` : "-"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "vendor_kontak",
      header: "Kontak Vendor",
      className: "hidden md:table-cell",
      sortValue: (row) => row.vendor_kontak || "",
      render: (row) => {
        if (!row.vendor_kontak) return "-";
        const link = waLink(
          row.vendor_kontak,
          `Konfirmasi pesanan catering ${formatDate(row.tanggal)} (${row.shift_nama})`
        );
        return (
          <div className="flex items-center gap-1.5">
            <span className="tabular-nums">{row.vendor_kontak}</span>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-primary hover:bg-primary-soft rounded transition-colors inline-flex items-center"
              title="Hubungi WhatsApp"
              aria-label="Hubungi WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </a>
          </div>
        );
      },
    },
    {
      key: "total_porsi",
      header: "Total Porsi",
      className: "hidden sm:table-cell",
      align: "right",
      width: 85,
      sortValue: (row) => row.total_porsi,
      render: (row) => (
        <span className="font-semibold text-text tabular-nums">
          {row.total_porsi > 0 ? row.total_porsi : "-"}
        </span>
      ),
    },
    {
      key: "diupdate_oleh",
      header: "Diupdate Oleh",
      className: "hidden lg:table-cell",
      sortValue: (row) => row.diupdate_oleh || "",
      render: (row) => row.diupdate_oleh || "-",
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      width: 92,
      className: "px-1 sm:px-2 overflow-visible",
      sortValue: (row) => row.status,
      render: (row) => (
        <StatusBadge
          status={row.status}
          className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px]"
        />
      ),
    },
    {
      key: "progres_vendor",
      header: "Progres Vendor",
      className: "hidden md:table-cell",
      align: "center",
      width: 110,
      sortValue: (row) => row.progres_vendor,
      render: (row) => <StatusBadge status={row.progres_vendor} />,
    },
    {
      key: "actions",
      header: "Aksi",
      align: "right",
      width: 76,
      sortable: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleGantiVendor(row)}
            className="hidden sm:inline-flex p-1.5 text-text-muted hover:text-accent rounded-[6px] hover:bg-bg transition-colors cursor-pointer"
            title="Ganti Vendor Periode"
            aria-label="Ganti Vendor Periode"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleEditPeriod(row)}
            className="p-1.5 text-text-muted hover:text-primary rounded-[6px] hover:bg-bg transition-colors cursor-pointer"
            title="Ubah Jadwal"
            aria-label="Ubah Jadwal"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={row.status !== "belum_input"}
            onClick={() => handleDeletePeriodClick(row)}
            className="p-1.5 text-text-muted hover:text-danger rounded-[6px] hover:bg-danger-soft/60 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            title={row.status === "belum_input" ? "Hapus Periode" : "Tidak dapat dihapus"}
            aria-label="Hapus Periode"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Filters and Actions Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 py-2 sm:py-3 px-1 sm:px-0.5 select-none shrink-0">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 p-0.5">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="h-8.5 pl-2.5 pr-8 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
          >
            <option value={0}>Semua Bulan</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="h-8.5 pl-2.5 pr-8 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all tabular-nums cursor-pointer"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          {/* Shift Filter */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="h-8.5 pl-2.5 pr-8 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
          >
            <option value="all">Semua Shift</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </select>

          {/* Vendor Filter */}
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="h-8.5 pl-2.5 pr-8 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
          >
            <option value="all">Semua Vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.kode} - {v.nama}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="col-span-2 sm:col-span-1 h-8.5 pl-2.5 pr-8 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="belum_input">Belum Input</option>
            <option value="draft">Draft</option>
            <option value="diajukan">Diajukan</option>
            <option value="final">Final</option>
            <option value="revisi">Revisi</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportToExcel}
            className="h-8.5 px-3 rounded-[8px] border border-[#003366]/30 bg-[#003366]/5 hover:bg-[#003366]/10 text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Unduh jadwal periode catering ke Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Ekspor Excel</span>
            <span className="sm:hidden">Ekspor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedShiftToEdit(shifts[0] ?? null);
              setShiftDialogOpen(true);
            }}
            className="h-8.5 px-3 rounded-[8px] border border-border bg-surface hover:bg-bg text-text text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <Settings2 className="w-3.5 h-3.5 text-text-muted" />
            <span>Kelola Shift</span>
          </button>

          <button
            type="button"
            onClick={handleAddPeriod}
            className="h-8.5 px-3.5 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      </div>

      {/* Floating Selection Action Bar */}
      {selectedPeriodIds.size > 0 && (
        <div className="mb-2.5 px-4 py-2 rounded-[8px] bg-[#003366]/10 border border-[#003366]/20 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150 select-none">
          <div className="flex items-center gap-2 text-[#003366] dark:text-[#58A6FF] font-medium flex-wrap">
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>
              <strong className="font-semibold">{selectedPeriodIds.size}</strong> dari {data.length} jadwal terpilih
            </span>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-primary hover:underline text-[11px] font-semibold cursor-pointer ml-1"
            >
              {selectedPeriodIds.size === data.length ? "Batal Semua" : `Pilih Semua (${data.length})`}
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriodIds(new Set())}
              className="text-text-muted hover:text-text underline text-[11px] ml-1 cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Batal</span>
            </button>
          </div>
          <button
            type="button"
            disabled={isBulkDeleting}
            onClick={() => setDeleteSelectedConfirmOpen(true)}
            className="h-7 px-3 rounded-[6px] bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Terpilih ({selectedPeriodIds.size})</span>
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        defaultSortKey="tanggal"
        defaultSortOrder="asc"
        emptyTitle="Belum Ada Jadwal Periode"
        emptyDescription="Tidak ditemukan jadwal catering untuk kriteria filter dan bulan yang dipilih."
      />

      <PeriodDialog
        open={periodDialogOpen}
        onOpenChange={setPeriodDialogOpen}
        periodToEdit={selectedPeriod}
        shifts={shifts}
        vendors={vendors}
        onSuccess={loadData}
      />

      <GantiVendorDialog
        open={gantiVendorOpen}
        onOpenChange={setGantiVendorOpen}
        period={periodToGanti}
        vendors={vendors}
        onSuccess={loadData}
      />

      <ShiftDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        shiftToEdit={selectedShiftToEdit}
        onSuccess={loadOptions}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Hapus Jadwal Periode"
        description={`Apakah Anda yakin ingin menghapus jadwal periode tanggal ${periodToDelete ? formatDate(periodToDelete.tanggal) : ""} (${periodToDelete?.shift_nama}) beserta seluruh pesanan terkait?`}
        confirmLabel="Hapus"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={deleteSelectedConfirmOpen}
        onOpenChange={setDeleteSelectedConfirmOpen}
        title="Hapus Data Terpilih"
        description={`Apakah Anda yakin ingin menghapus ${selectedPeriodIds.size} jadwal periode yang dipilih? Seluruh pesanan, kuota porsi, dan riwayat revisi terkait akan dihapus secara permanen.`}
        confirmLabel={`Hapus ${selectedPeriodIds.size} Periode`}
        variant="danger"
        isProcessing={isBulkDeleting}
        onConfirm={handleConfirmDeleteSelected}
      />
    </div>
  );
}
