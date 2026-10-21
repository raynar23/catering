"use client";

import React from "react";
import { UserRecord } from "@/lib/api/users";

interface UserMetricStripProps {
  users: UserRecord[];
  loading?: boolean;
}

// Metric summary strip displaying total users, active Admin GA, and vendor count
export function UserMetricStrip({ users, loading }: UserMetricStripProps) {
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin_ga" && u.aktif).length;
  const vendorCount = users.filter((u) => u.role === "vendor" && u.aktif).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 select-none">
      <div className="bg-surface border border-border rounded-[10px] p-3 sm:p-4">
        <p className="text-xs font-medium text-text-muted">Total Pengguna</p>
        <p className="text-2xl font-bold text-text mt-1">
          {loading ? "..." : totalUsers}
        </p>
      </div>

      <div className="bg-surface border border-border rounded-[10px] p-3 sm:p-4">
        <p className="text-xs font-medium text-text-muted">Admin GA (Aktif)</p>
        <p className="text-2xl font-bold text-primary mt-1">
          {loading ? "..." : adminCount}
        </p>
      </div>

      <div className="bg-surface border border-border rounded-[10px] p-3 sm:p-4">
        <p className="text-xs font-medium text-text-muted">Vendor (Aktif)</p>
        <p className="text-2xl font-bold text-[#0E7490] mt-1">
          {loading ? "..." : vendorCount}
        </p>
      </div>
    </div>
  );
}
