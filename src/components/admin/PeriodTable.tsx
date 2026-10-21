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
  deletePeriodAction,
} from "@/lib/actions/periode";
import { getShiftList } from "@/lib/actions/shift";
import { getVendorList, VendorRecord } from "@/lib/actions/vendor";
import { Shift } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { formatTimeShort, MONTH_OPTIONS } from "@/lib/date";
import { waLink } from "@/lib/whatsapp";
import { useToast } from "@/components/ui/Toast";
import { Plus, Settings2, Pencil, Trash2, ArrowLeftRight, MessageSquare } from "lucide-react";

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
        month: selectedMonth,
        shift_id: selectedShift === "all" ? undefined : selectedShift,
        vendor_id: selectedVendor === "all" ? undefined : selectedVendor,
        status: selectedStatus === "all" ? undefined : selectedStatus,
      });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedShift, selectedVendor, selectedStatus]);

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

  const handleDeletePeriodClick = (row: PeriodListItem) => {
    if (row.status !== "belum_input") {
      toast({
        title: "Penghapusan Ditolak",
        description: "Hanya periode berstatus Belum Input yang dapat dihapus dari jadwal.",
        variant: "danger",
      });
      return;
    }
    setPeriodToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!periodToDelete) return;
    const res = await deletePeriodAction(periodToDelete.id);
    setDeleteConfirmOpen(false);

    if (res.success) {
      toast({
        title: "Berhasil",
        description: res.message ?? "Jadwal periode berhasil dihapus",
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

  const columns: ColumnDef<PeriodListItem>[] = [
    {
      key: "tanggal",
      header: "Tanggal",
      width: 100,
      render: (row) => (
        <span className="font-semibold text-text tabular-nums">
          {formatDate(row.tanggal)}
        </span>
      ),
    },
    {
      key: "shift_nama",
      header: "Shift Kerja",
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
      render: (row) => (
        <div>
          <span className="font-medium text-text">{row.vendor_nama}</span>
          <span className="text-[11px] text-primary ml-1.5 font-semibold tabular-nums">
            {row.vendor_kode}
          </span>
        </div>
      ),
    },
    {
      key: "vendor_kontak",
      header: "Kontak Vendor",
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
      align: "right",
      width: 90,
      render: (row) => (
        <span className="font-semibold text-text tabular-nums">
          {row.total_porsi > 0 ? row.total_porsi : "-"}
        </span>
      ),
    },
    {
      key: "diupdate_oleh",
      header: "Diupdate Oleh",
      render: (row) => row.diupdate_oleh || "-",
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      width: 110,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "progres_vendor",
      header: "Progres Vendor",
      align: "center",
      width: 120,
      render: (row) => <StatusBadge status={row.progres_vendor} />,
    },
    {
      key: "actions",
      header: "Aksi",
      align: "right",
      width: 110,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleGantiVendor(row)}
            className="p-1.5 text-text-muted hover:text-accent rounded-[6px] hover:bg-bg transition-colors cursor-pointer"
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
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Filters and Actions Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 py-3 select-none">
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="h-9 px-2.5 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
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
            className="h-9 px-2.5 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 tabular-nums"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          {/* Shift Filter */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="h-9 px-2.5 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
            className="h-9 px-2.5 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
            className="h-9 px-2.5 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
            onClick={() => {
              setSelectedShiftToEdit(shifts[0] ?? null);
              setShiftDialogOpen(true);
            }}
            className="h-9 px-3 rounded-[8px] border border-border bg-surface hover:bg-bg text-text text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-text-muted" />
            <span>Kelola Shift</span>
          </button>

          <button
            type="button"
            onClick={handleAddPeriod}
            className="h-9 px-3.5 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.id}
        isLoading={loading}
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
        description={`Apakah Anda yakin ingin menghapus jadwal periode tanggal ${periodToDelete ? formatDate(periodToDelete.tanggal) : ""} (${periodToDelete?.shift_nama})?`}
        confirmLabel="Hapus"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
