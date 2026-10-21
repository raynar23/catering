"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { Shift } from "@/lib/types";
import { saveShiftAction } from "@/lib/actions/shift";
import { useToast } from "@/components/ui/Toast";

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftToEdit?: Shift | null;
  onSuccess: () => void;
}

interface FormInnerProps {
  shiftToEdit?: Shift | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ShiftFormInner({ shiftToEdit, onClose, onSuccess }: FormInnerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [nama, setNama] = useState(shiftToEdit?.nama ?? "");
  const [label, setLabel] = useState(shiftToEdit?.label ?? "");
  const [alias, setAlias] = useState(shiftToEdit?.alias ?? "");
  const [jamMulai, setJamMulai] = useState(shiftToEdit?.jam_mulai?.slice(0, 5) ?? "08:00");
  const [jamSelesai, setJamSelesai] = useState(shiftToEdit?.jam_selesai?.slice(0, 5) ?? "16:00");
  const [batasTiba, setBatasTiba] = useState(shiftToEdit?.batas_tiba?.slice(0, 5) ?? "10:00");
  const [urutan, setUrutan] = useState(shiftToEdit?.urutan ?? 0);
  const [urutanLaporan, setUrutanLaporan] = useState(shiftToEdit?.urutan_laporan ?? 1);
  const [keterangan, setKeterangan] = useState(shiftToEdit?.keterangan ?? "");
  const [aktif, setAktif] = useState(shiftToEdit?.aktif ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const errs: Record<string, string> = {};
    if (!nama.trim()) errs.nama = "Nama shift wajib diisi";
    if (!label.trim()) errs.label = "Label shift wajib diisi";
    if (!alias.trim()) errs.alias = "Alias shift wajib diisi";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await saveShiftAction(
        {
          nama,
          label,
          alias,
          jam_mulai: jamMulai,
          jam_selesai: jamSelesai,
          batas_tiba: batasTiba,
          urutan: Number(urutan) || 0,
          urutan_laporan: Number(urutanLaporan) || 1,
          keterangan: keterangan || undefined,
          aktif,
        },
        shiftToEdit?.id
      );

      if (res.success) {
        toast({
          title: "Berhasil",
          description: res.message ?? "Shift berhasil disimpan",
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Nama Shift" required error={errors.nama}>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Shift 1"
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
        </FormField>

        <FormField label="Label Jam" required error={errors.label}>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Contoh: Siang / Pagi"
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
        </FormField>

        <FormField label="Alias Singkat" required error={errors.alias}>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Contoh: Siang"
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Jam Mulai" hint="HH:mm">
          <input
            type="text"
            value={jamMulai}
            onChange={(e) => setJamMulai(e.target.value)}
            placeholder="08:00"
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 tabular-nums"
          />
        </FormField>

        <FormField label="Jam Selesai" hint="24:00 diizinkan">
          <input
            type="text"
            value={jamSelesai}
            onChange={(e) => setJamSelesai(e.target.value)}
            placeholder="16:00"
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 tabular-nums"
          />
        </FormField>

        <FormField label="Batas Tiba Makanan" hint="HH:mm">
          <input
            type="text"
            value={batasTiba}
            onChange={(e) => setBatasTiba(e.target.value)}
            placeholder="10:00"
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 tabular-nums"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Urutan Rotasi" hint="0 = Shift 3, 1 = Shift 1, 2 = Shift 2">
          <input
            type="number"
            min={0}
            value={urutan}
            onChange={(e) => setUrutan(parseInt(e.target.value, 10) || 0)}
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 tabular-nums"
          />
        </FormField>

        <FormField label="Urutan Laporan" hint="1, 2, 3">
          <input
            type="number"
            min={1}
            value={urutanLaporan}
            onChange={(e) => setUrutanLaporan(parseInt(e.target.value, 10) || 1)}
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 tabular-nums"
          />
        </FormField>

        <div className="flex flex-col justify-end pb-1.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aktif}
              onChange={(e) => setAktif(e.target.checked)}
              className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
            />
            <span className="text-xs font-medium text-text">Shift Aktif</span>
          </label>
        </div>
      </div>

      <FormField label="Keterangan Operasional" hint="Opsional">
        <textarea
          rows={2}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Keterangan shift kerja..."
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
          {loading ? "Menyimpan..." : "Simpan Shift"}
        </button>
      </div>
    </form>
  );
}

// Dialog modal wrapper for Shift management
export function ShiftDialog({
  open,
  onOpenChange,
  shiftToEdit,
  onSuccess,
}: ShiftDialogProps) {
  const isEdit = Boolean(shiftToEdit);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Data Shift" : "Tambah Shift Baru"}
      description="Pengaturan parameter shift kerja operasional dan batas waktu kedatangan catering."
      maxWidth="lg"
    >
      <ShiftFormInner
        key={shiftToEdit ? shiftToEdit.id : "new-shift"}
        shiftToEdit={shiftToEdit}
        onClose={() => onOpenChange(false)}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}
