"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { MasterToolbar } from "@/components/ui/MasterToolbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BagianDialog } from "./BagianDialog";
import {
  BagianRecord,
  getBagianList,
  deleteBagianAction,
  toggleBagianStatusAction,
} from "@/lib/actions/bagian";
import { useToast } from "@/components/ui/Toast";
import { Pencil, Trash2 } from "lucide-react";
import { exportToExcel } from "@/lib/export/client-excel";
import { exportTableToPdf } from "@/lib/export/client-pdf";
import { MasterExportDialog } from "@/components/ui/MasterExportDialog";

export function BagianTable() {
  const { toast } = useToast();
  const [data, setData] = useState<BagianRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBagian, setSelectedBagian] = useState<BagianRecord | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bagianToDelete, setBagianToDelete] = useState<BagianRecord | null>(null);
  const [deactivatePromptOpen, setDeactivatePromptOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBagianList(search);
      let filtered = res.data;
      if (statusFilter === "active") {
        filtered = filtered.filter((item) => item.aktif);
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((item) => !item.aktif);
      }
      setData(filtered);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleEdit = (row: BagianRecord) => {
    setSelectedBagian(row);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedBagian(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (row: BagianRecord) => {
    setBagianToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!bagianToDelete) return;
    const res = await deleteBagianAction(bagianToDelete.id);
    setDeleteConfirmOpen(false);

    if (res.success) {
      toast({
        title: "Berhasil",
        description: res.message ?? "Data bagian berhasil dihapus",
        variant: "success",
      });
      loadData();
    } else {
      if (res.canDeactivate) {
        setDeactivatePromptOpen(true);
      } else {
        toast({
          title: "Gagal Menghapus",
          description: res.error ?? "Terjadi kesalahan",
          variant: "danger",
        });
      }
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!bagianToDelete) return;
    const res = await toggleBagianStatusAction(bagianToDelete.id, false);
    setDeactivatePromptOpen(false);
    if (res.success) {
      toast({
        title: "Status Diperbarui",
        description: "Bagian berhasil dinonaktifkan",
        variant: "success",
      });
      loadData();
    } else {
      toast({
        title: "Gagal Menonaktifkan",
        description: res.error ?? "Terjadi kesalahan",
        variant: "danger",
      });
    }
  };

  const columns: ColumnDef<BagianRecord>[] = [
    {
      key: "nama",
      header: "Nama Bagian",
      render: (row) => (
        <div className="min-w-0 pr-1">
          <div className="font-semibold text-text truncate">
            {row.nama}
            {row.kode && (
              <span className="ml-1 text-[11px] text-text-muted font-normal">
                ({row.kode})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-0.5 sm:hidden truncate">
            <span>{row.kelompok || "-"}</span>
            {row.lokasi_antar && <span>• {row.lokasi_antar}</span>}
          </div>
          {row.alias && (
            <div className="text-[11px] text-text-muted truncate max-w-xs mt-0.5 hidden sm:block">
              Alias: {row.alias}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "kelompok",
      header: "Kelompok",
      className: "hidden sm:table-cell",
      render: (row) => row.kelompok || "-",
    },
    {
      key: "lokasi_antar",
      header: "Lokasi Antar",
      className: "hidden sm:table-cell",
      render: (row) => row.lokasi_antar || "-",
    },
    {
      key: "keterangan",
      header: "Keterangan",
      className: "hidden md:table-cell",
      render: (row) => (
        <span className="truncate max-w-xs block" title={row.keterangan ?? ""}>
          {row.keterangan || "-"}
        </span>
      ),
    },
    {
      key: "aktif",
      header: "Status",
      align: "center",
      width: 76,
      render: (row) => (
        <StatusBadge
          status={row.aktif ? "aktif" : "nonaktif"}
          label={row.aktif ? "Aktif" : "Nonaktif"}
        />
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      align: "right",
      width: 68,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleEdit(row)}
            className="p-1.5 text-text-muted hover:text-primary rounded-[6px] hover:bg-bg transition-colors cursor-pointer"
            title="Ubah Bagian"
            aria-label="Ubah Bagian"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteClick(row)}
            className="p-1.5 text-text-muted hover:text-danger rounded-[6px] hover:bg-danger-soft/60 transition-colors cursor-pointer"
            title="Hapus Bagian"
            aria-label="Hapus Bagian"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const handleOpenExport = () => {
    if (data.length === 0) {
      toast({
        title: "Data Kosong",
        description: "Tidak ada data bagian yang tersedia untuk diekspor",
        variant: "default",
      });
      return;
    }
    setExportDialogOpen(true);
  };

  const handleExportConfirm = async (format: "excel" | "pdf", catatan?: string) => {
    const exportColumns = [
      { header: "Kode", key: "kode", width: 12 },
      { header: "Nama Bagian", key: "nama", width: 28 },
      { header: "Kelompok", key: "kelompok", width: 18, format: (r: BagianRecord) => r.kelompok || "-" },
      { header: "Lokasi Pengantaran", key: "lokasi_antar", width: 22, format: (r: BagianRecord) => r.lokasi_antar || "-" },
      { header: "Catatan Antar", key: "catatan_antar", width: 25, format: (r: BagianRecord) => r.catatan_antar || "-" },
      { header: "Urutan", key: "urutan", width: 10, align: "center" as const },
      { header: "Status", key: "aktif", width: 14, align: "center" as const, format: (r: BagianRecord) => (r.aktif ? "Aktif" : "Nonaktif") },
    ];

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === "excel") {
      await exportToExcel({
        filename: `Data_Bagian_TPS_${dateStr}.xlsx`,
        title: "DATA BAGIAN & UNIT KERJA OPERASIONAL",
        subtitle: `PT Terminal Petikemas Surabaya | Total: ${data.length} Bagian`,
        columns: exportColumns,
        data,
      });

      toast({
        title: "Ekspor Berhasil",
        description: "Data bagian operasional berhasil diunduh ke Excel (.xlsx)",
        variant: "success",
      });
    } else {
      await exportTableToPdf({
        filename: `Data_Bagian_TPS_${dateStr}.pdf`,
        title: "DATA BAGIAN & UNIT KERJA OPERASIONAL",
        subtitle: `PT Terminal Petikemas Surabaya | Total: ${data.length} Bagian`,
        columns: exportColumns,
        data,
        catatan,
        orientation: "landscape",
      });

      toast({
        title: "Ekspor Berhasil",
        description: "Data bagian operasional berhasil diunduh ke PDF (.pdf)",
        variant: "success",
      });
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <MasterToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        addButtonLabel="Tambah Bagian"
        onAddClick={handleAdd}
        onExportClick={handleOpenExport}
        searchPlaceholder="Cari nama, kode, kelompok..."
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyTitle="Belum Ada Data Bagian"
        emptyDescription="Silakan tambahkan data bagian operasional baru untuk memulai."
      />

      <MasterExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        title="Ekspor Data Bagian Operasional"
        subtitle={`PT Terminal Petikemas Surabaya • Total: ${data.length} Bagian`}
        onExport={handleExportConfirm}
      />

      <BagianDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bagianToEdit={selectedBagian}
        onSuccess={loadData}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Hapus Data Bagian"
        description={`Apakah Anda yakin ingin menghapus data bagian "${bagianToDelete?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={deactivatePromptOpen}
        onOpenChange={setDeactivatePromptOpen}
        title="Bagian Memiliki Riwayat Pesanan"
        description={`Data bagian "${bagianToDelete?.nama}" tidak dapat dihapus permanen karena telah tercatat dalam riwayat catering. Apakah Anda ingin menonaktifkannya agar tidak muncul pada input pesanan baru?`}
        confirmLabel="Nonaktifkan Bagian"
        variant="warning"
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
