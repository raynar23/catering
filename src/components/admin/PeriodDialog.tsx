"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { PeriodListItem, savePeriodAction } from "@/lib/actions/periode";
import { VendorRecord } from "@/lib/actions/vendor";
import { Shift } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";

interface PeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodToEdit?: PeriodListItem | null;
  shifts: Shift[];
  vendors: VendorRecord[];
  onSuccess: () => void;
}

interface FormInnerProps {
  periodToEdit?: PeriodListItem | null;
  shifts: Shift[];
  vendors: VendorRecord[];
  onClose: () => void;
  onSuccess: () => void;
}

function PeriodFormInner({
  periodToEdit,
  shifts,
  vendors,
  onClose,
  onSuccess,
}: FormInnerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const defaultDate = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(periodToEdit?.tanggal ?? defaultDate);
  const [shiftId, setShiftId] = useState(periodToEdit?.shift_id ?? shifts[0]?.id ?? "");
  const [vendorId, setVendorId] = useState(periodToEdit?.vendor_id ?? vendors[0]?.id ?? "");
  const [keterangan, setKeterangan] = useState(periodToEdit?.keterangan ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const errs: Record<string, string> = {};
    if (!tanggal) errs.tanggal = "Tanggal wajib ditentukan";
    if (!shiftId) errs.shiftId = "Pilihan shift wajib dipilih";
    if (!vendorId) errs.vendorId = "Pilihan vendor wajib dipilih";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await savePeriodAction(
        {
          tanggal,
          shift_id: shiftId,
          vendor_id: vendorId,
          keterangan: keterangan || undefined,
        },
        periodToEdit?.id
      );

      if (res.success) {
        toast({
          title: "Berhasil",
          description: res.message ?? "Jadwal periode berhasil disimpan",
          variant: "success",
        });
        onClose();
        onSuccess();
      } else {
        toast({
          title: "Gagal Menyimpan",
          description: res.error ?? "Terjadi kesalahan",
          variant: "danger",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Tanggal Layanan" required error={errors.tanggal}>
        <input
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 tabular-nums"
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Pilihan Shift" required error={errors.shiftId}>
          <select
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama} ({s.jam_mulai.slice(0, 5)} - {s.jam_selesai.slice(0, 5)})
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Vendor Bertugas" required error={errors.vendorId}>
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.kode} - {v.nama}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Catatan Jadwal" hint="Opsional">
        <textarea
          rows={2}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Keterangan khusus jadwal hari ini..."
          className="p-2.5 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 resize-none"
        />
      </FormField>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="h-9 px-4 rounded-[8px] border border-border text-xs font-medium text-text hover:bg-bg disabled:opacity-50 transition-colors cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="h-9 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {loading ? "Menyimpan..." : "Simpan Jadwal"}
        </button>
      </div>
    </form>
  );
}

// Dialog modal wrapper for catering period scheduling
export function PeriodDialog({
  open,
  onOpenChange,
  periodToEdit,
  shifts,
  vendors,
  onSuccess,
}: PeriodDialogProps) {
  const isEdit = Boolean(periodToEdit);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Jadwal Periode" : "Tambah Jadwal Periode"}
      description="Penetapan tanggal, shift kerja, dan vendor catering yang bertugas."
      maxWidth="md"
    >
      <PeriodFormInner
        key={periodToEdit ? periodToEdit.id : "new-period"}
        periodToEdit={periodToEdit}
        shifts={shifts}
        vendors={vendors}
        onClose={() => onOpenChange(false)}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}
