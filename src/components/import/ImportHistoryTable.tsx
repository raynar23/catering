"use client";

import React, { useState, useEffect } from "react";
import { Download, Trash2, RefreshCw, FileSpreadsheet, Search, CheckCircle2, Clock } from "lucide-react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { getImportBatchesAction, deleteImportBatchAction, ImportBatchRecord } from "@/lib/actions/impor";
import { exportToExcel } from "@/lib/export/client-excel";
import { formatDate } from "@/lib/format";

export function ImportHistoryTable() {
  const { toast } = useToast();
  const [data, setData] = useState<ImportBatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [batchToDelete, setBatchToDelete] = useState<ImportBatchRecord | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [purgePeriods, setPurgePeriods] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getImportBatchesAction();
      if (res.success) {
        setData(res.data);
      } else {
        toast({
          title: "Gagal Memuat Riwayat",
          description: res.error ?? "Terjadi kesalahan saat mengambil riwayat berkas impor",
          variant: "danger",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = data.filter((item) => {
    const matchSearch =
      !search ||
      item.nama_file.toLowerCase().includes(search.toLowerCase()) ||
      item.nomor_batch.toLowerCase().includes(search.toLowerCase()) ||
      item.diimpor_oleh_nama.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleExportHistoryToExcel = () => {
    if (filteredData.length === 0) {
      toast({
        title: "Data Kosong",
        description: "Tidak ada riwayat impor yang tersedia untuk diekspor",
        variant: "default",
      });
      return;
    }

    exportToExcel({
      filename: `Riwayat_Impor_Dokumen_${new Date().toISOString().slice(0, 10)}.xlsx`,
      title: "RIWAYAT PENGUNGGAHAN DAN IMPOR DOKUMEN",
      subtitle: "PT Terminal Petikemas Surabaya - Sistem Pengelolaan Catering",
      columns: [
        { header: "Nomor Batch", key: "nomor_batch", width: 22 },
        {
          header: "Tanggal & Waktu",
          key: "created_at",
          width: 20,
          format: (row) =>
            new Date(row.created_at).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            }),
        },
        { header: "Nama Berkas", key: "nama_file", width: 28 },
        { header: "Tipe Berkas", key: "tipe_file", width: 12 },
        {
          header: "Ukuran",
          key: "ukuran_bytes",
          width: 14,
          format: (row) => `${Math.round(row.ukuran_bytes / 1024)} KB`,
        },
        { header: "Jenis Dokumen", key: "jenis_dokumen", width: 16 },
        { header: "Mesin Analisis", key: "mesin", width: 14 },
        { header: "Total Baris", key: "total_baris", width: 12, align: "right" },
        { header: "Status", key: "status", width: 14 },
        { header: "Petugas Impor", key: "diimpor_oleh_nama", width: 20 },
      ],
      data: filteredData,
    });

    toast({
      title: "Ekspor Berhasil",
      description: "Data riwayat impor berkas telah berhasil diunduh ke Excel",
      variant: "success",
    });
  };

  const handleExportSingleBatchRows = (batch: ImportBatchRecord) => {
    if (!batch.data_parsed || batch.data_parsed.length === 0) {
      toast({
        title: "Data Baris Kosong",
        description: "Tidak ada rincian data baris tersimpan untuk batch ini",
        variant: "default",
      });
      return;
    }

    const rows = batch.data_parsed as any[];
    const isJadwal = batch.jenis_dokumen === "jadwal" || ("tanggal" in (rows[0] || {}));

    if (isJadwal) {
      exportToExcel({
        filename: `Data_Impor_${batch.nomor_batch}_${new Date().toISOString().slice(0, 10)}.xlsx`,
        title: `RINCIAN DATA IMPOR BATCH ${batch.nomor_batch}`,
        subtitle: `Nama Berkas: ${batch.nama_file} | Total: ${rows.length} Baris`,
        columns: [
          { header: "Tanggal", key: "tanggal", width: 14, format: (r) => r.tanggal ? formatDate(r.tanggal) : "-" },
          { header: "Shift", key: "shift_nama", width: 16, format: (r) => r.shift_nama || r.shift || "-" },
          { header: "Vendor", key: "vendor_nama", width: 24, format: (r) => r.vendor_nama || r.vendor || "-" },
          { header: "Status Baris", key: "status", width: 14, format: (r) => r.status || "sesuai" },
          { header: "Keterangan", key: "keterangan", width: 25, format: (r) => r.keterangan || "-" },
        ],
        data: rows,
      });
    } else {
      exportToExcel({
        filename: `Data_Impor_${batch.nomor_batch}.xlsx`,
        title: `RINCIAN DATA IMPOR BATCH ${batch.nomor_batch}`,
        subtitle: `Nama Berkas: ${batch.nama_file}`,
        columns: [
          { header: "Kode", key: "kode", width: 12 },
          { header: "Nama", key: "nama", width: 24 },
          { header: "Status", key: "status", width: 14 },
        ],
        data: rows,
      });
    }

    toast({
      title: "Ekspor Berhasil",
      description: `Rincian baris batch ${batch.nomor_batch} berhasil diunduh ke Excel`,
      variant: "success",
    });
  };

  const handleConfirmDelete = async () => {
    if (!batchToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteImportBatchAction(batchToDelete.id, purgePeriods);
      setDeleteModalOpen(false);

      if (res.success) {
        toast({
          title: "Riwayat Terhapus",
          description: res.message || "Riwayat impor berhasil dihapus",
          variant: "success",
        });
        loadData();
      } else {
        toast({
          title: "Gagal Menghapus",
          description: res.error || "Terjadi kesalahan saat menghapus batch",
          variant: "danger",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<ImportBatchRecord>[] = [
    {
      key: "nomor_batch",
      header: "Nomor Batch",
      width: 140,
      render: (row) => (
        <div className="font-mono text-xs font-semibold text-primary truncate">
          {row.nomor_batch}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Waktu Unggah",
      width: 140,
      render: (row) => (
        <div>
          <span className="font-medium text-text block text-xs">
            {formatDate(row.created_at)}
          </span>
          <span className="text-[10px] text-text-muted tabular-nums">
            {new Date(row.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
          </span>
        </div>
      ),
    },
    {
      key: "nama_file",
      header: "Nama Berkas",
      render: (row) => (
        <div className="min-w-0 pr-2">
          <span className="font-medium text-text block truncate text-xs" title={row.nama_file}>
            {row.nama_file}
          </span>
          <span className="text-[10px] text-text-muted">
            {Math.round(row.ukuran_bytes / 1024)} KB · {row.tipe_file.toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      key: "jenis_dokumen",
      header: "Jenis Dokumen",
      className: "hidden md:table-cell",
      width: 120,
      render: (row) => (
        <span className="capitalize text-xs font-medium text-text">
          {row.jenis_dokumen === "jadwal"
            ? "Jadwal Catering"
            : row.jenis_dokumen === "rekap"
            ? "Rekap Harian"
            : "Data Vendor"}
        </span>
      ),
    },
    {
      key: "total_baris",
      header: "Total Data",
      align: "right",
      width: 90,
      render: (row) => (
        <span className="font-semibold text-text tabular-nums">
          {row.total_baris} baris
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      width: 100,
      render: (row) => {
        const isSelesai = row.status === "selesai" || row.status === "dikonfirmasi";
        return (
          <StatusBadge
            status={isSelesai ? "final" : "draft"}
            label={isSelesai ? "Selesai" : row.status}
          />
        );
      },
    },
    {
      key: "diimpor_oleh_nama",
      header: "Petugas",
      className: "hidden lg:table-cell",
      width: 130,
      render: (row) => (
        <span className="text-xs text-text-muted truncate block">
          {row.diimpor_oleh_nama}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      align: "right",
      width: 80,
      sortable: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleExportSingleBatchRows(row)}
            className="p-1.5 text-text-muted hover:text-primary rounded-[6px] hover:bg-bg transition-colors cursor-pointer"
            title="Unduh Data Baris Excel"
            aria-label="Unduh Data Baris Excel"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setBatchToDelete(row);
              setPurgePeriods(true);
              setDeleteModalOpen(true);
            }}
            className="p-1.5 text-text-muted hover:text-danger rounded-[6px] hover:bg-danger-soft/60 transition-colors cursor-pointer"
            title="Hapus Riwayat Batch"
            aria-label="Hapus Riwayat Batch"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Toolbar Filters & Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 py-2 select-none shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berkas, nomor batch..."
              className="h-8.5 pl-8 pr-3 w-full rounded-[8px] border border-[#D1D1D6] bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8.5 pl-2.5 pr-8 rounded-[8px] border border-[#D1D1D6] bg-surface text-xs text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer flex-1 sm:flex-none whitespace-nowrap"
            >
              <option value="all">Semua Status</option>
              <option value="selesai">Selesai</option>
              <option value="draft">Draft</option>
            </select>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white hover:bg-[#F2F2F7] active:bg-[#E5E5EA] text-[#1C1C1E] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              title="Segarkan data riwayat"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-text-muted ${loading ? "animate-spin" : ""}`} />
              <span className="whitespace-nowrap">Segarkan</span>
            </button>

            <button
              type="button"
              onClick={handleExportHistoryToExcel}
              className="sm:hidden h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white hover:bg-[#F2F2F7] active:bg-[#E5E5EA] text-[#1C1C1E] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              title="Ekspor ke Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#48484A]" />
              <span className="whitespace-nowrap">Ekspor</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportHistoryToExcel}
          className="hidden sm:inline-flex h-8.5 px-3.5 rounded-[8px] border border-[#D1D1D6] bg-white hover:bg-[#F2F2F7] active:bg-[#E5E5EA] text-[#1C1C1E] text-xs font-medium items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#48484A]" />
          <span className="whitespace-nowrap">Ekspor Riwayat Excel</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        defaultSortKey="created_at"
        defaultSortOrder="desc"
        minRows={10}
        emptyTitle="Belum Ada Riwayat Impor"
        emptyDescription="Seluruh berkas dokumen yang diunggah dan dikonfirmasi akan tercatat otomatis di sini."
      />

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Hapus Riwayat Berkas Impor"
        description={`Apakah Anda yakin ingin menghapus data riwayat impor "${batchToDelete?.nama_file}" (${batchToDelete?.nomor_batch})?`}
        confirmLabel={isDeleting ? "Menghapus..." : "Hapus Berkas Batch"}
        variant="danger"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
      >
        <div className="mt-3 p-3 rounded-[8px] bg-red-500/10 border border-red-500/20 text-xs">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={purgePeriods}
              onChange={(e) => setPurgePeriods(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border text-danger focus:ring-danger cursor-pointer accent-[#D70015]"
            />
            <div className="text-text">
              <span className="font-semibold block text-danger">Hapus juga jadwal periode yang diimpor dari batch ini</span>
              <span className="text-[11px] text-text-muted block mt-0.5 leading-relaxed">
                Jika dicentang, seluruh jadwal periode catering yang berasal dari nomor batch ini akan otomatis dihapus secara permanen (Rollback).
              </span>
            </div>
          </label>
        </div>
      </ConfirmDialog>
    </div>
  );
}
