"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { MasterToolbar } from "@/components/ui/MasterToolbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { VendorDialog } from "./VendorDialog";
import {
  VendorRecord,
  getVendorList,
  deleteVendorAction,
  toggleVendorStatusAction,
} from "@/lib/actions/vendor";
import { waLink } from "@/lib/whatsapp";
import { useToast } from "@/components/ui/Toast";
import { Pencil, Trash2, MessageSquare } from "lucide-react";
import { exportToExcel } from "@/lib/export/client-excel";
import { exportTableToPdf } from "@/lib/export/client-pdf";
import { MasterExportDialog } from "@/components/ui/MasterExportDialog";

export function VendorTable() {
  const { toast } = useToast();
  const [data, setData] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorRecord | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<VendorRecord | null>(null);
  const [deactivatePromptOpen, setDeactivatePromptOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVendorList(search);
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

  const handleEdit = (row: VendorRecord) => {
    setSelectedVendor(row);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedVendor(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (row: VendorRecord) => {
    setVendorToDelete(row);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;
    const res = await deleteVendorAction(vendorToDelete.id);
    setDeleteConfirmOpen(false);

    if (res.success) {
      toast({
        title: "Berhasil",
        description: res.message ?? "Data vendor berhasil dihapus",
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
    if (!vendorToDelete) return;
    const res = await toggleVendorStatusAction(vendorToDelete.id, false);
    setDeactivatePromptOpen(false);
    if (res.success) {
      toast({
        title: "Status Diperbarui",
        description: "Vendor berhasil dinonaktifkan",
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

  const columns: ColumnDef<VendorRecord>[] = [
    {
      key: "kode",
      header: "Kode",
      width: 58,
      render: (row) => (
        <span className="font-semibold text-primary tabular-nums">
          {row.kode}
        </span>
      ),
    },
    {
      key: "nama",
      header: "Nama Vendor",
      width: 175,
      render: (row) => (
        <div className="min-w-0 pr-1">
          <span className="font-semibold text-text block truncate">{row.nama}</span>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-0.5 truncate">
            <span>Rotasi #{row.urutan_rotasi}</span>
            {row.no_wa && (
              <a
                href={waLink(
                  row.no_wa,
                  `Halo ${row.nama}, kami dari General Affairs PT Terminal Petikemas Surabaya.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline sm:hidden inline-flex items-center gap-0.5"
                title="WhatsApp Vendor"
              >
                • {row.no_wa}
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "nama_kontak",
      header: "Nama Kontak",
      className: "hidden md:table-cell",
      render: (row) => row.nama_kontak || "-",
    },
    {
      key: "no_wa",
      header: "No. WhatsApp",
      className: "hidden sm:table-cell",
      render: (row) => {
        if (!row.no_wa) return "-";
        const link = waLink(
          row.no_wa,
          `Halo ${row.nama}, kami dari General Affairs PT Terminal Petikemas Surabaya.`
        );
        return (
          <div className="flex items-center gap-1.5">
            <span className="tabular-nums">{row.no_wa}</span>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-primary hover:bg-primary-soft rounded transition-colors inline-flex items-center"
              title="Hubungi via WhatsApp"
              aria-label="Hubungi via WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </a>
          </div>
        );
      },
    },
    {
      key: "no_telp",
      header: "No. Telp",
      className: "hidden lg:table-cell",
      render: (row) => <span className="tabular-nums">{row.no_telp || "-"}</span>,
    },
    {
      key: "alamat",
      header: "Alamat",
      className: "hidden md:table-cell",
      render: (row) => (
        <span className="truncate max-w-xs block" title={row.alamat ?? ""}>
          {row.alamat || "-"}
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
            title="Ubah Vendor"
            aria-label="Ubah Vendor"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteClick(row)}
            className="p-1.5 text-text-muted hover:text-danger rounded-[6px] hover:bg-danger-soft/60 transition-colors cursor-pointer"
            title="Hapus Vendor"
            aria-label="Hapus Vendor"
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
        description: "Tidak ada data vendor yang tersedia untuk diekspor",
        variant: "default",
      });
      return;
    }
    setExportDialogOpen(true);
  };

  const handleExportConfirm = async (format: "excel" | "pdf", catatan?: string) => {
    const exportColumns = [
      { header: "Kode", key: "kode", width: 12 },
      { header: "Nama Vendor", key: "nama", width: 28 },
      { header: "Urutan Rotasi", key: "urutan_rotasi", width: 14, align: "center" as const },
      { header: "No. WhatsApp", key: "no_wa", width: 18, format: (r: VendorRecord) => r.no_wa || "-" },
      { header: "Status", key: "aktif", width: 14, align: "center" as const, format: (r: VendorRecord) => (r.aktif ? "Aktif" : "Nonaktif") },
    ];

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === "excel") {
      await exportToExcel({
        filename: `Data_Vendor_Catering_${dateStr}.xlsx`,
        title: "DATA MITRA REKANAN VENDOR CATERING",
        subtitle: `PT Terminal Petikemas Surabaya | Total: ${data.length} Rekanan`,
        columns: exportColumns,
        data,
      });

      toast({
        title: "Ekspor Berhasil",
        description: "Data rekanan vendor berhasil diunduh ke Excel (.xlsx)",
        variant: "success",
      });
    } else {
      await exportTableToPdf({
        filename: `Data_Vendor_Catering_${dateStr}.pdf`,
        title: "DATA MITRA REKANAN VENDOR CATERING",
        subtitle: `PT Terminal Petikemas Surabaya | Total: ${data.length} Rekanan`,
        columns: exportColumns,
        data,
        catatan,
        orientation: "landscape",
      });

      toast({
        title: "Ekspor Berhasil",
        description: "Data rekanan vendor berhasil diunduh ke PDF (.pdf)",
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
        addButtonLabel="Tambah Vendor"
        onAddClick={handleAdd}
        onExportClick={handleOpenExport}
        searchPlaceholder="Cari kode, nama, kontak..."
      />

      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        tableClassName="min-w-[360px] sm:min-w-full"
        emptyTitle="Belum Ada Data Vendor"
        emptyDescription="Silakan tambahkan data rekanan vendor catering untuk memulai."
      />

      <MasterExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        title="Ekspor Data Rekanan Vendor"
        subtitle={`PT Terminal Petikemas Surabaya • Total: ${data.length} Rekanan`}
        onExport={handleExportConfirm}
      />

      <VendorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vendorToEdit={selectedVendor}
        onSuccess={loadData}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Hapus Data Vendor"
        description={`Apakah Anda yakin ingin menghapus data vendor "${vendorToDelete?.nama}" (${vendorToDelete?.kode})? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={deactivatePromptOpen}
        onOpenChange={setDeactivatePromptOpen}
        title="Vendor Memiliki Riwayat Pesanan"
        description={`Data vendor "${vendorToDelete?.nama}" tidak dapat dihapus permanen karena telah tercatat dalam riwayat pesanan catering. Apakah Anda ingin menonaktifkannya agar tidak dijadwalkan pada rotasi mendatang?`}
        confirmLabel="Nonaktifkan Vendor"
        variant="warning"
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
