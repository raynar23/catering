"use client";

import React from "react";
import { RekapRingkasanData } from "@/lib/actions/rekap";
import { formatNumber } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

interface RekapRingkasanPanelProps {
  data: RekapRingkasanData | null;
  isLoading?: boolean;
}

// Multi-dimensional summary panel with metric cards and 4 categorical breakdown tables
export function RekapRingkasanPanel({
  data,
  isLoading = false,
}: RekapRingkasanPanelProps) {
  if (isLoading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto select-none p-1 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-[10px] p-3.5 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-[10px] p-4 h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.metrics.total_porsi === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-surface border border-border rounded-[10px] p-8 text-center select-none">
        <p className="text-sm font-semibold text-text">Tidak Ada Data Ringkasan</p>
        <p className="text-xs text-text-muted mt-1 max-w-sm">
          Belum ada akumulasi data katering yang berstatus final pada rentang waktu yang dipilih.
        </p>
      </div>
    );
  }

  const { metrics, per_bagian, per_shift, per_vendor, per_bulan } = data;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto select-none scrollbar-thin pb-2">
      {/* 4 Metric Cards Strip (strictly without icons) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white border border-black/[0.08] rounded-[12px] p-3.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
          <span className="text-[11px] font-semibold text-[#86868B] tracking-tight uppercase">Total Porsi</span>
          <span className="text-xl lg:text-2xl font-bold text-text tabular-nums tracking-tight mt-0.5">
            {formatNumber(metrics.total_porsi)}
          </span>
          <span className="text-[10px] text-[#86868B] mt-0.5">Seluruh pesanan berlaku</span>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-[12px] p-3.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
          <span className="text-[11px] font-semibold text-[#86868B] tracking-tight uppercase">Rata-rata/Hari</span>
          <span className="text-xl lg:text-2xl font-bold text-primary tabular-nums tracking-tight mt-0.5">
            {formatNumber(metrics.rata_rata_porsi_per_hari)}
          </span>
          <span className="text-[10px] text-[#86868B] mt-0.5">Porsi per hari kalender</span>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-[12px] p-3.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
          <span className="text-[11px] font-semibold text-[#86868B] tracking-tight uppercase">Hari Operasional</span>
          <span className="text-xl lg:text-2xl font-bold text-text tabular-nums tracking-tight mt-0.5">
            {formatNumber(metrics.total_hari_operasional)}
          </span>
          <span className="text-[10px] text-[#86868B] mt-0.5">Tanggal terisi katering</span>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-[12px] p-3.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
          <span className="text-[11px] font-semibold text-[#86868B] tracking-tight uppercase">Transaksi Final</span>
          <span className="text-xl lg:text-2xl font-bold text-text tabular-nums tracking-tight mt-0.5">
            {formatNumber(metrics.total_periode)}
          </span>
          <span className="text-[10px] text-[#86868B] mt-0.5">Total jadwal 3-shift</span>
        </div>
      </div>

      {/* 4 Categorical Breakdown Panels (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        {/* 1. Ringkasan per Bagian */}
        <div className="bg-white border border-black/[0.08] rounded-[12px] p-4 flex flex-col min-h-[160px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h3 className="text-xs font-bold text-text tracking-tight mb-0.5">Rincian per Bagian</h3>
          <p className="text-[11px] text-[#86868B] mb-2.5">
            Proporsi konsumsi menurut unit kerja dan kelompok
          </p>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/[0.06]">
                <tr>
                  <th className="py-1.5 font-semibold">Bagian</th>
                  <th className="py-1.5 font-semibold">Kelompok</th>
                  <th className="py-1.5 text-right font-semibold">Porsi</th>
                  <th className="py-1.5 text-right font-semibold">Porsi (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {per_bagian.map((b) => (
                  <tr key={b.bagian_id} className="hover:bg-primary-50/40 transition-colors">
                    <td className="py-1.5 font-medium text-text">{b.bagian_nama}</td>
                    <td className="py-1.5 text-[#86868B] text-[11px]">{b.bagian_kelompok}</td>
                    <td className="py-1.5 text-right tabular-nums font-semibold text-text">
                      {formatNumber(b.total_porsi)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-[#86868B]">
                      {b.persentase}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Ringkasan per Shift */}
        <div className="bg-white border border-black/[0.08] rounded-[12px] p-4 flex flex-col min-h-[160px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h3 className="text-xs font-bold text-text tracking-tight mb-0.5">Rincian per Shift</h3>
          <p className="text-[11px] text-[#86868B] mb-2.5">
            Distribusi porsi menurut jadwal operasional 3 shift
          </p>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/[0.06]">
                <tr>
                  <th className="py-1.5 font-semibold">Shift Kerja</th>
                  <th className="py-1.5 font-semibold">Kategori</th>
                  <th className="py-1.5 text-right font-semibold">Porsi</th>
                  <th className="py-1.5 text-right font-semibold">Porsi (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {per_shift.map((s) => (
                  <tr key={s.shift_id} className="hover:bg-primary-50/40 transition-colors">
                    <td className="py-1.5 font-medium text-text">{s.shift_nama}</td>
                    <td className="py-1.5 text-[#86868B] text-[11px]">{s.shift_label}</td>
                    <td className="py-1.5 text-right tabular-nums font-semibold text-text">
                      {formatNumber(s.total_porsi)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-[#86868B]">
                      {s.persentase}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Ringkasan per Vendor */}
        <div className="bg-white border border-black/[0.08] rounded-[12px] p-4 flex flex-col min-h-[160px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h3 className="text-xs font-bold text-text tracking-tight mb-0.5">Rincian per Vendor</h3>
          <p className="text-[11px] text-[#86868B] mb-2.5">
            Akumulasi pemenuhan pesanan oleh mitra katering
          </p>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/[0.06]">
                <tr>
                  <th className="py-1.5 font-semibold">Kode</th>
                  <th className="py-1.5 font-semibold">Nama Vendor</th>
                  <th className="py-1.5 text-right font-semibold">Porsi</th>
                  <th className="py-1.5 text-right font-semibold">Porsi (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {per_vendor.map((v) => (
                  <tr key={v.vendor_id} className="hover:bg-primary-50/40 transition-colors">
                    <td className="py-1.5 font-mono text-[11px] text-[#86868B]">{v.vendor_kode}</td>
                    <td className="py-1.5 font-medium text-text">{v.vendor_nama}</td>
                    <td className="py-1.5 text-right tabular-nums font-semibold text-text">
                      {formatNumber(v.total_porsi)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-[#86868B]">
                      {v.persentase}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Ringkasan per Bulan */}
        <div className="bg-white border border-black/[0.08] rounded-[12px] p-4 flex flex-col min-h-[160px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h3 className="text-xs font-bold text-text tracking-tight mb-0.5">Rincian per Bulan</h3>
          <p className="text-[11px] text-[#86868B] mb-2.5">
            Akumulasi konsumsi bulanan dan hari aktif
          </p>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/[0.06]">
                <tr>
                  <th className="py-1.5 font-semibold">Bulan</th>
                  <th className="py-1.5 text-right font-semibold">Hari Terisi</th>
                  <th className="py-1.5 text-right font-semibold">Porsi</th>
                  <th className="py-1.5 text-right font-semibold">Porsi (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {per_bulan.map((m) => (
                  <tr key={m.bulan_key} className="hover:bg-primary-50/40 transition-colors">
                    <td className="py-1.5 font-medium text-text">{m.bulan_key}</td>
                    <td className="py-1.5 text-right tabular-nums text-[#86868B]">
                      {m.hari_count} hari
                    </td>
                    <td className="py-1.5 text-right tabular-nums font-semibold text-text">
                      {formatNumber(m.total_porsi)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-[#86868B]">
                      {m.persentase}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
