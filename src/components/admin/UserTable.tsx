"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { SegmentedControl, SegmentedOption } from "@/components/ui/SegmentedControl";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserMetricStrip } from "./UserMetricStrip";
import { UserDialog } from "./UserDialog";
import { UserResetPasswordDialog } from "./UserResetPasswordDialog";
import { UserDeactivateDialog } from "./UserDeactivateDialog";
import { UserRecord, fetchUsersApi } from "@/lib/api/users";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Plus, Pencil, KeyRound, Power, FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "@/lib/export/client-excel";

interface UserTableProps {
  currentUserId: string;
}

// User management table component with metric strip, multi-criteria filtering, and actions
export function UserTable({ currentUserId }: UserTableProps) {
  const { toast } = useToast();
  const [data, setData] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<UserRecord | null>(null);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserRecord | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUsersApi();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        toast({
          title: "Gagal Memuat Data",
          description: res.error ?? "Terjadi kesalahan saat memuat daftar pengguna",
          variant: "danger",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter dataset based on search, role, and active status
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search filter
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesNama = item.nama.toLowerCase().includes(q);
        const matchesUsername = item.username.toLowerCase().includes(q);
        const matchesVendor = item.vendors?.nama.toLowerCase().includes(q);
        if (!matchesNama && !matchesUsername && !matchesVendor) return false;
      }

      // Role filter
      if (roleFilter !== "all" && item.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "active" && !item.aktif) return false;
      if (statusFilter === "inactive" && item.aktif) return false;

      return true;
    });
  }, [data, search, roleFilter, statusFilter]);

  const handleAdd = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user: UserRecord) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleResetPassword = (user: UserRecord) => {
    setUserToReset(user);
    setResetPasswordOpen(true);
  };

  const handleToggleDeactivate = (user: UserRecord) => {
    setUserToDeactivate(user);
    setDeactivateOpen(true);
  };

  const columns: ColumnDef<UserRecord>[] = [
    {
      key: "nama",
      header: "Nama Pengguna",
      width: 240,
      render: (row: UserRecord) => {
        const initials = row.nama
          .split(" ")
          .slice(0, 2)
          .map((w: string) => w[0]?.toUpperCase())
          .join("");
        const isSelf = row.id === currentUserId;

        return (
          <div className="flex items-center gap-2.5 min-w-0 py-0.5">
            <div className="w-7 h-7 rounded-full bg-[#E5E5EA] text-[#1D1D1F] font-semibold text-[11px] flex items-center justify-center shrink-0 border border-black/[0.06] shadow-xs">
              {initials || "US"}
            </div>
            <div className="min-w-0 pr-1 flex-1">
              <div className="font-medium text-text truncate flex items-center gap-1.5" title={row.nama}>
                <span>{row.nama}</span>
                {isSelf && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-black/[0.05] text-[#1D1D1F] font-medium leading-none">
                    Anda
                  </span>
                )}
              </div>
              <div className="text-[11px] text-text-muted truncate font-mono">
                @{row.username}
              </div>
              {row.role === "vendor" && row.vendors && (
                <div className="text-[10px] text-primary font-medium truncate sm:hidden">
                  {row.vendors.nama} ({row.vendors.kode})
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      width: 90,
      align: "center",
      render: (row: UserRecord) => <StatusBadge status={row.role} />,
    },
    {
      key: "vendor",
      header: "Vendor Mitra",
      className: "hidden sm:table-cell",
      render: (row: UserRecord) => {
        if (row.role === "vendor" && row.vendors) {
          return (
            <span className="text-xs text-text">
              {row.vendors.nama}{" "}
              <span className="text-[11px] text-text-muted font-mono">
                ({row.vendors.kode})
              </span>
            </span>
          );
        }
        return <span className="text-xs text-text-muted">-</span>;
      },
    },
    {
      key: "no_hp",
      header: "No. HP / WA",
      className: "hidden sm:table-cell",
      render: (row: UserRecord) => (
        <span className="text-xs text-text-muted">
          {row.no_hp ? row.no_hp : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: 90,
      align: "center",
      render: (row: UserRecord) => (
        <StatusBadge status={row.aktif ? "aktif" : "nonaktif"} />
      ),
    },
    {
      key: "created_at",
      header: "Dibuat",
      className: "hidden md:table-cell",
      render: (row: UserRecord) => (
        <span className="text-xs text-text-muted">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "aksi",
      header: "Aksi",
      width: 95,
      sortable: false,
      align: "right",
      render: (row: UserRecord) => {
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => handleEdit(row)}
              className="p-1.5 text-text-muted hover:text-text hover:bg-bg rounded-[6px] transition-colors cursor-pointer"
              title="Ubah data pengguna"
              aria-label={`Ubah pengguna ${row.username}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleResetPassword(row)}
              className="p-1.5 text-text-muted hover:text-primary hover:bg-bg rounded-[6px] transition-colors cursor-pointer"
              title="Reset password"
              aria-label={`Reset password ${row.username}`}
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleToggleDeactivate(row)}
              className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                row.aktif
                  ? "text-text-muted hover:text-danger hover:bg-danger-soft/60"
                  : "text-text-muted hover:text-success hover:bg-success-soft/60"
              }`}
              title={row.aktif ? "Nonaktifkan akun" : "Aktifkan akun"}
              aria-label={`${row.aktif ? "Nonaktifkan" : "Aktifkan"} ${row.username}`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  const roleOptions: SegmentedOption[] = [
    {
      value: "all",
      label: (
        <>
          <span className="hidden sm:inline">Semua Role</span>
          <span className="sm:hidden">Semua</span>
        </>
      ),
    },
    {
      value: "admin_ga",
      label: (
        <>
          <span className="hidden sm:inline">Admin GA</span>
          <span className="sm:hidden">Admin</span>
        </>
      ),
    },
    { value: "vendor", label: "Vendor" },
  ];

  const statusOptions: SegmentedOption[] = [
    {
      value: "all",
      label: (
        <>
          <span className="hidden sm:inline">Semua Status</span>
          <span className="sm:hidden">Semua</span>
        </>
      ),
    },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
  ];

  const handleExportToExcel = () => {
    if (filteredData.length === 0) {
      toast({
        title: "Data Kosong",
        description: "Tidak ada data pengguna yang tersedia untuk diekspor",
        variant: "default",
      });
      return;
    }

    exportToExcel({
      filename: `Data_Pengguna_Sistem_${new Date().toISOString().slice(0, 10)}.xlsx`,
      title: "DATA PENGGUNA SISTEM PENGELOLAAN CATERING",
      subtitle: `PT Terminal Petikemas Surabaya | Total: ${filteredData.length} Akun`,
      columns: [
        { header: "Nama Lengkap", key: "nama", width: 25 },
        { header: "Username", key: "username", width: 18 },
        { header: "Peran / Role", key: "role", width: 14, format: (r) => (r.role === "admin_ga" ? "Admin GA" : "Vendor") },
        { header: "Vendor Mitra", key: "vendor", width: 24, format: (r) => (r.vendors ? `${r.vendors.nama} (${r.vendors.kode})` : "-") },
        { header: "No. HP / WA", key: "no_hp", width: 16, format: (r) => r.no_hp || "-" },
        { header: "Status", key: "aktif", width: 12, format: (r) => (r.aktif ? "Aktif" : "Nonaktif") },
        { header: "Tanggal Dibuat", key: "created_at", width: 16, format: (r) => formatDate(r.created_at) },
      ],
      data: filteredData,
    });

    toast({
      title: "Ekspor Berhasil",
      description: "Data pengguna berhasil diunduh ke Excel",
      variant: "success",
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Metric Strip */}
      <UserMetricStrip users={data} loading={loading} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 py-1.5 sm:py-2.5 select-none">
        <div className="flex flex-1 flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, username, vendor..."
            className="h-8.5 px-3 w-full sm:w-64 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap w-full sm:w-auto overflow-x-auto shrink-0">
            <SegmentedControl
              options={roleOptions}
              value={roleFilter}
              onChange={setRoleFilter}
              className="flex-1 sm:flex-none justify-center"
            />

            <SegmentedControl
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              className="flex-1 sm:flex-none justify-center"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportToExcel}
            className="h-8.5 px-2.5 sm:px-3 rounded-[8px] border border-[#D1D1D6] bg-white hover:bg-[#F2F2F7] active:bg-[#E5E5EA] text-[#1C1C1E] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)] whitespace-nowrap shrink-0"
            title="Unduh data pengguna ke Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#48484A]" />
            <span className="hidden sm:inline whitespace-nowrap">Ekspor Excel</span>
            <span className="sm:hidden whitespace-nowrap">Ekspor</span>
          </button>

          <button
            type="button"
            onClick={handleAdd}
            className="h-8.5 px-3 sm:px-3.5 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-[0_1px_2px_rgba(0,0,0,0.08)] whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline whitespace-nowrap">Tambah Pengguna</span>
            <span className="sm:hidden whitespace-nowrap">Pengguna</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable<UserRecord>
        columns={columns}
        data={filteredData}
        keyExtractor={(row) => row.id}
        isLoading={loading}
        tableClassName="min-w-[515px] sm:min-w-full"
        emptyTitle="Tidak Ada Pengguna"
        emptyDescription={
          search || roleFilter !== "all" || statusFilter !== "all"
            ? "Tidak ada pengguna yang cocok dengan kriteria pencarian"
            : "Belum ada akun pengguna terdaftar"
        }
      />

      {/* Dialog Tambah / Ubah */}
      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userToEdit={selectedUser}
        currentUserId={currentUserId}
        allUsers={data}
        onSuccess={loadData}
      />

      {/* Dialog Reset Password */}
      <UserResetPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        targetUser={userToReset}
        onSuccess={loadData}
      />

      {/* Dialog Nonaktifkan / Aktifkan */}
      <UserDeactivateDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        targetUser={userToDeactivate}
        currentUserId={currentUserId}
        allUsers={data}
        onSuccess={loadData}
      />
    </div>
  );
}
