"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { PeriodListItem, gantiVendorAction } from "@/lib/actions/periode";
import { VendorRecord } from "@/lib/actions/vendor";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";

interface GantiVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: PeriodListItem | null;
  vendors: VendorRecord[];
  onSuccess: () => void;
}

// Dialog modal to replace assigned vendor for a period via atomic RPC
export function GantiVendorDialog({
  open,
  onOpenChange,
  period,
  vendors,
  onSuccess,
}: GantiVendorDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vendorBaruId, setVendorBaruId] = useState("");
  const [alasan, setAlasan] = useState("");
  const [error, setError] = useState("");

  const availableVendors = vendors.filter(
    (v) => v.aktif && v.id !== period?.vendor_id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!vendorBaruId) {
      setError("Pilih vendor pengganti");
      return;
    }
    if (!alasan.trim() || alasan.trim().length < 5) {
      setError("Alasan penggantian vendor minimal 5 karakter");
      return;
    }
    if (!period) return;

    setLoading(true);
    try {
      const res = await gantiVendorAction({
        period_id: period.id,
        vendor_baru_id: vendorBaruId,
        alasan: alasan.trim(),
      });

      if (res.success) {
        toast({
          title: "Vendor Berhasil Diganti",
          description: res.message ?? "Penggantian vendor telah dicatat dalam riwayat.",
          variant: "success",
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          title: "Gagal Mengganti Vendor",
          description: res.error ?? "Terjadi kesalahan",
          variant: "danger",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!period) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={loading ? () => {} : onOpenChange}
      title="Ganti Vendor Periode"
      description="Tindakan ini akan mengalihkan alokasi pesanan ke vendor lain dan dicatat secara permanen di riwayat audit."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-bg border border-border rounded-[8px] space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-text-muted">Jadwal:</span>
            <span className="font-semibold text-text tabular-nums">
              {formatDate(period.tanggal)} ({period.shift_nama})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Vendor Saat Ini:</span>
            <span className="font-semibold text-text">
              {period.vendor_kode} - {period.vendor_nama}
            </span>
          </div>
        </div>

        <FormField label="Pilih Vendor Pengganti" required error={error}>
          <select
            value={vendorBaruId}
            onChange={(e) => setVendorBaruId(e.target.value)}
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <option value="">-- Pilih Vendor Baru --</option>
            {availableVendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.kode} - {v.nama}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Alasan Penggantian Vendor" required hint="Wajib diisi untuk audit log">
          <textarea
            rows={3}
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Contoh: Dapur vendor utama mengalami kendala operasional mendadak..."
            className="p-2.5 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 resize-none"
          />
        </FormField>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-[8px] border border-border text-xs font-medium text-text hover:bg-bg disabled:opacity-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="h-9 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {loading ? "Memproses..." : "Konfirmasi Ganti Vendor"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
