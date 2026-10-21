"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserMetricStrip } from "./UserMetricStrip";
import { UserDialog } from "./UserDialog";
import { UserResetPasswordDialog } from "./UserResetPasswordDialog";
import { UserDeactivateDialog } from "./UserDeactivateDialog";
import { UserRecord, fetchUsersApi } from "@/lib/api/users";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { Plus, Pencil, KeyRound, Power } from "lucide-react";

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
      render: (row: UserRecord) => {
        const initials = row.nama
          .split(" ")
          .slice(0, 2)
          .map((w: string) => w[0]?.toUpperCase())
          .join("");
        const isSelf = row.id === currentUserId;

        return (
          <div className="flex items-center gap-2.5 min-w-0 py-0.5">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-[11px] flex items-center justify-center shrink-0 border border-primary/20">
              {initials || "US"}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-text truncate flex items-center gap-1.5">
                <span>{row.nama}</span>
                {isSelf && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-semibold">
                    Anda
                  </span>
                )}
              </div>
              <div className="text-[11px] text-text-muted truncate font-mono">
                @{row.username}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      render: (row: UserRecord) => <StatusBadge status={row.role} />,
    },
    {
      key: "vendor",
      header: "Vendor Mitra",
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
      render: (row: UserRecord) => (
        <span className="text-xs text-text-muted">
          {row.no_hp ? row.no_hp : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: UserRecord) => (
        <StatusBadge status={row.aktif ? "aktif" : "nonaktif"} />
      ),
    },
    {
      key: "created_at",
      header: "Dibuat",
      render: (row: UserRecord) => (
        <span className="text-xs text-text-muted">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "w-28 text-right",
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

  const roleOptions = [
    { value: "all", label: "Semua Role" },
    { value: "admin_ga", label: "Admin GA" },
    { value: "vendor", label: "Vendor" },
  ];

  const statusOptions = [
    { value: "all", label: "Semua Status" },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Metric Strip */}
      <UserMetricStrip users={data} loading={loading} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-3 select-none">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, username, vendor..."
            className="h-9 px-3 w-full sm:w-64 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <SegmentedControl
            options={roleOptions}
            value={roleFilter}
            onChange={setRoleFilter}
          />

          <SegmentedControl
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="h-9 px-3.5 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Data Table */}
      <div className="flex-1 min-h-0 bg-surface border border-border rounded-[10px] overflow-hidden flex flex-col">
        <DataTable<UserRecord>
          columns={columns}
          data={filteredData}
          keyExtractor={(row) => row.id}
          isLoading={loading}
          emptyTitle="Tidak Ada Pengguna"
          emptyDescription={
            search || roleFilter !== "all" || statusFilter !== "all"
              ? "Tidak ada pengguna yang cocok dengan kriteria pencarian"
              : "Belum ada akun pengguna terdaftar"
          }
        />
      </div>

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
