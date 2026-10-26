"use client";

import React from "react";
import { VendorResponseItem } from "@/lib/actions/revisi";
import { formatDateIndonesian } from "@/lib/date";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { waLink, buildVendorFollowUpWaMessage } from "@/lib/whatsapp";
import { MessageCircle, ArrowRightLeft, History } from "lucide-react";
import Link from "next/link";

interface ResponsVendorTableProps {
  items: VendorResponseItem[];
}

// Table displaying orders where vendor responded 'tidak_sanggup' requiring follow-up or reassignment
export function ResponsVendorTable({ items }: ResponsVendorTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted select-none">
        <p className="text-sm font-semibold text-text">Tidak Ada Kendala Vendor</p>
        <p className="text-xs text-muted mt-1">
          Seluruh pesanan saat ini telah disanggupi atau belum ada penolakan dari mitra vendor.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs min-w-[390px] sm:min-w-0 sm:table-fixed">
        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
          <tr>
            <th className="px-2.5 sm:px-3 py-2.5 w-[140px] sm:w-auto">
              <span className="sm:hidden">Pesanan & Vendor</span>
              <span className="hidden sm:inline">Tanggal & Shift</span>
            </th>
            <th className="px-3 py-2.5 hidden sm:table-cell sm:w-[150px]">Vendor</th>
            <th className="px-3 py-2.5 text-right hidden sm:table-cell w-[90px]">Total Porsi</th>
            <th className="px-2 sm:px-3 py-2.5 text-center w-[120px] sm:w-[130px]">Respons</th>
            <th className="px-3 py-2.5 min-w-[160px] hidden md:table-cell">Alasan Vendor</th>
            <th className="px-3 py-2.5 hidden lg:table-cell sm:w-[130px]">Waktu Respons</th>
            <th className="px-2 sm:px-3 py-2.5 text-center w-[110px] sm:w-[170px]">Tindak Lanjut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 text-xs">
          {items.map((row) => {
            const waMsg = buildVendorFollowUpWaMessage({
              vendorNama: row.vendorNama,
              tanggal: row.tanggal,
              shiftNama: row.shiftNama,
              catatan: row.catatanVendor || "Vendor menolak pesanan",
            });
            const waUrl = row.vendorTelp ? waLink(row.vendorTelp, waMsg) : "";

            return (
              <tr
                key={row.orderId}
                className="hover:bg-slate-50/70 transition-colors group"
              >
                {/* Tanggal & Shift (includes Vendor and Portions on mobile) */}
                <td className="px-2.5 sm:px-3 py-2 align-middle">
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-text text-xs">
                      {formatDateIndonesian(row.tanggal, false)}
                    </span>
                    <span className="text-[11px] text-muted truncate">
                      {row.shiftNama} ({row.shiftJam})
                    </span>
                    <span className="text-[10px] text-primary font-semibold truncate sm:hidden mt-0.5">
                      {row.vendorNama} • {row.totalPorsi} Porsi
                    </span>
                  </div>
                </td>

                {/* Vendor (Desktop only) */}
                <td className="px-3 py-2.5 align-middle hidden sm:table-cell">
                  <div className="flex flex-col">
                    <span className="font-semibold text-text truncate max-w-[160px]" title={row.vendorNama}>
                      {row.vendorNama}
                    </span>
                    <span className="text-[11px] text-muted">
                      {row.vendorKode} {row.vendorKontak ? `(${row.vendorKontak})` : ""}
                    </span>
                  </div>
                </td>

                {/* Total Porsi (Desktop only) */}
                <td className="px-3 py-2.5 align-middle text-right font-mono font-bold text-text hidden sm:table-cell">
                  {row.totalPorsi}
                </td>

                {/* Respons Vendor */}
                <td className="px-2.5 sm:px-3 py-2 align-middle text-center whitespace-nowrap">
                  <StatusBadge status={row.responVendor} />
                  {row.catatanVendor && (
                    <p className="text-[10px] text-rose-800 italic truncate sm:hidden mt-1" title={row.catatanVendor}>
                      &quot;{row.catatanVendor}&quot;
                    </p>
                  )}
                </td>

                {/* Catatan / Alasan Vendor (Desktop only) */}
                <td className="px-3 py-2.5 align-middle max-w-[220px] hidden md:table-cell">
                  <p className="text-xs text-rose-900 font-medium italic truncate" title={row.catatanVendor || "Tidak ada catatan"}>
                    &quot;{row.catatanVendor || "Tidak menyanggupi pemenuhan pesanan"}&quot;
                  </p>
                </td>

                {/* Waktu Respons (Desktop only) */}
                <td className="px-3 py-2.5 align-middle text-muted text-[11px] hidden lg:table-cell">
                  {row.responVendorAt ? new Date(row.responVendorAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-"}
                </td>

                {/* Tindak Lanjut: Hubungi Vendor, Ganti Vendor, Riwayat */}
                <td className="px-2.5 sm:px-3 py-2 align-middle text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center p-1 sm:px-2.5 sm:py-1 text-xs font-semibold rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs select-none"
                        title="Hubungi vendor via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline ml-1">WA</span>
                      </a>
                    )}

                    <Link
                      href="/admin/periode"
                      className="inline-flex items-center justify-center p-1 sm:px-2.5 sm:py-1 text-xs font-semibold rounded-[6px] border border-border bg-white text-text hover:bg-slate-50 shadow-xs select-none"
                      title="Ganti vendor pada menu Periode Catering"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                      <span className="hidden sm:inline ml-1">Ganti</span>
                    </Link>

                    {row.periodId && (
                      <Link
                        href={`/admin/verifikasi/${row.periodId}/riwayat`}
                        className="p-1 sm:p-1.5 rounded-[6px] border border-border bg-white text-muted hover:text-text hover:bg-slate-50 transition-colors shadow-xs hidden sm:inline-flex"
                        title="Lihat riwayat kronologi pesanan"
                        aria-label="Riwayat kronologi"
                      >
                        <History className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
