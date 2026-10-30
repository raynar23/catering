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
    <div className="grid grid-cols-3 gap-1.5 sm:gap-3 mb-2 sm:mb-4 select-none">
      <div className="bg-surface border border-border rounded-[10px] p-2 sm:p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <p className="text-[10px] sm:text-xs font-medium text-text-muted truncate">
          <span className="sm:hidden">Total</span>
          <span className="hidden sm:inline">Total Pengguna</span>
        </p>
        <p className="text-base sm:text-2xl font-bold text-text mt-0.5 sm:mt-1 tabular-nums">
          {loading ? "..." : totalUsers}
        </p>
      </div>

      <div className="bg-surface border border-border rounded-[10px] p-2 sm:p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <p className="text-[10px] sm:text-xs font-medium text-text-muted truncate">
          <span className="sm:hidden">Admin GA</span>
          <span className="hidden sm:inline">Admin GA (Aktif)</span>
        </p>
        <p className="text-base sm:text-2xl font-bold text-primary mt-0.5 sm:mt-1 tabular-nums">
          {loading ? "..." : adminCount}
        </p>
      </div>

      <div className="bg-surface border border-border rounded-[10px] p-2 sm:p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <p className="text-[10px] sm:text-xs font-medium text-text-muted truncate">
          <span className="sm:hidden">Vendor</span>
          <span className="hidden sm:inline">Vendor (Aktif)</span>
        </p>
        <p className="text-base sm:text-2xl font-bold text-[#0E7490] mt-0.5 sm:mt-1 tabular-nums">
          {loading ? "..." : vendorCount}
        </p>
      </div>
    </div>
  );
}
