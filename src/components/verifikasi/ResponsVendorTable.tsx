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
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full text-left border-collapse min-w-[980px]">
        <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2.5">Tanggal & Shift</th>
            <th className="px-3 py-2.5">Vendor</th>
            <th className="px-3 py-2.5 text-right">Total Porsi</th>
            <th className="px-3 py-2.5 text-center">Respons Vendor</th>
            <th className="px-3 py-2.5 min-w-[180px]">Alasan Vendor</th>
            <th className="px-3 py-2.5">Waktu Respons</th>
            <th className="px-3 py-2.5 text-center w-[180px]">Tindak Lanjut</th>
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
                {/* Tanggal & Shift */}
                <td className="px-3 py-2.5 align-middle">
                  <div className="flex flex-col">
                    <span className="font-semibold text-text">
                      {formatDateIndonesian(row.tanggal, false)}
                    </span>
                    <span className="text-[11px] text-muted">
                      {row.shiftNama} ({row.shiftJam})
                    </span>
                  </div>
                </td>

                {/* Vendor */}
                <td className="px-3 py-2.5 align-middle">
                  <div className="flex flex-col">
                    <span className="font-semibold text-text truncate max-w-[160px]" title={row.vendorNama}>
                      {row.vendorNama}
                    </span>
                    <span className="text-[11px] text-muted">
                      {row.vendorKode} {row.vendorKontak ? `(${row.vendorKontak})` : ""}
                    </span>
                  </div>
                </td>

                {/* Total Porsi */}
                <td className="px-3 py-2.5 align-middle text-right font-mono font-bold text-text">
                  {row.totalPorsi}
                </td>

                {/* Respons Vendor */}
                <td className="px-3 py-2.5 align-middle text-center">
                  <StatusBadge status={row.responVendor} />
                </td>

                {/* Catatan / Alasan Vendor */}
                <td className="px-3 py-2.5 align-middle max-w-[220px]">
                  <p className="text-xs text-rose-900 font-medium italic truncate" title={row.catatanVendor || "Tidak ada catatan"}>
                    &quot;{row.catatanVendor || "Tidak menyanggupi pemenuhan pesanan"}&quot;
                  </p>
                </td>

                {/* Waktu Respons */}
                <td className="px-3 py-2.5 align-middle text-muted text-[11px]">
                  {row.responVendorAt ? new Date(row.responVendorAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-"}
                </td>

                {/* Tindak Lanjut: Hubungi Vendor, Ganti Vendor, Riwayat */}
                <td className="px-3 py-2.5 align-middle text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[6px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs select-none"
                        title="Hubungi vendor via WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    <Link
                      href="/admin/periode"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-[6px] border border-border bg-white text-text hover:bg-slate-50 shadow-xs select-none"
                      title="Ganti vendor pada menu Periode Catering"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                      <span>Ganti Vendor</span>
                    </Link>

                    {row.periodId && (
                      <Link
                        href={`/admin/verifikasi/${row.periodId}/riwayat`}
                        className="p-1.5 rounded-[6px] border border-border bg-white text-muted hover:text-text hover:bg-slate-50 transition-colors shadow-xs"
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
