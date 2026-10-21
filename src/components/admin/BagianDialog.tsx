"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { BagianRecord, saveBagianAction } from "@/lib/actions/bagian";
import { useToast } from "@/components/ui/Toast";

interface BagianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bagianToEdit?: BagianRecord | null;
  onSuccess: () => void;
}

interface FormInnerProps {
  bagianToEdit?: BagianRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

function BagianFormInner({ bagianToEdit, onClose, onSuccess }: FormInnerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [nama, setNama] = useState(bagianToEdit?.nama ?? "");
  const [kode, setKode] = useState(bagianToEdit?.kode ?? "");
  const [kelompok, setKelompok] = useState(bagianToEdit?.kelompok ?? "");
  const [lokasiAntar, setLokasiAntar] = useState(bagianToEdit?.lokasi_antar ?? "");
  const [catatanAntar, setCatatanAntar] = useState(bagianToEdit?.catatan_antar ?? "");
  const [keterangan, setKeterangan] = useState(bagianToEdit?.keterangan ?? "");
  const [alias, setAlias] = useState<string>(() => {
    if (!bagianToEdit?.alias) return "";
    return Array.isArray(bagianToEdit.alias) ? bagianToEdit.alias.join(", ") : String(bagianToEdit.alias);
  });
  const [urutan, setUrutan] = useState(bagianToEdit?.urutan ?? 0);
  const [aktif, setAktif] = useState(bagianToEdit?.aktif ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!nama.trim()) {
      setErrors({ nama: "Nama bagian wajib diisi" });
      return;
    }

    const aliasList = alias.split(",").map((s) => s.trim()).filter(Boolean);

    setLoading(true);
    try {
      const res = await saveBagianAction(
        {
          nama,
          kode: kode || undefined,
          kelompok: kelompok || undefined,
          lokasi_antar: lokasiAntar || undefined,
          catatan_antar: catatanAntar || undefined,
          keterangan: keterangan || undefined,
          alias: aliasList.length > 0 ? aliasList : undefined,
          urutan: Number(urutan) || 0,
          aktif,
        },
        bagianToEdit?.id
      );

      if (res.success) {
        toast({
          title: "Berhasil",
          description: res.message ?? "Data bagian berhasil disimpan",
          variant: "success",
        });
        onClose();
        onSuccess();
      } else {
        toast({
          title: "Gagal Menyimpan",
          description: res.error ?? "Terjadi kesalahan saat menyimpan",
          variant: "danger",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Nama Bagian" required error={errors.nama}>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: CC Operator"
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
        </FormField>

        <FormField label="Kode Bagian" hint="Opsional">
          <input
            type="text"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            placeholder="Contoh: CC_OP"
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 uppercase"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Kelompok" hint="Opsional">
          <input
            type="text"
            value={kelompok}
            onChange={(e) => setKelompok(e.target.value)}
            placeholder="Contoh: Operasional / Teknik"
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
        </FormField>

        <FormField label="Lokasi Pengantaran" hint="Opsional">
          <input
            type="text"
            value={lokasiAntar}
            onChange={(e) => setLokasiAntar(e.target.value)}
            placeholder="Contoh: Dermaga Petikemas"
            className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
        </FormField>
      </div>

      <FormField label="Catatan Khusus Pengantaran" hint="Opsional">
        <input
          type="text"
          value={catatanAntar}
          onChange={(e) => setCatatanAntar(e.target.value)}
          placeholder="Contoh: Antar sebelum apel pergantian shift"
          className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        />
      </FormField>

      <FormField label="Daftar Alias / Singkatan" hint="Pisahkan dengan tanda koma (opsional)">
        <input
          type="text"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Contoh: CC, Container Crane"
          className="h-9 px-3 rounded-[8px] border border-border bg-surface text-xs text-text placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Urutan Tampilan">
          <input
            type="number"
            min={0}
            value={urutan}
            onChange={(e) => setUrutan(parseInt(e.target.value, 10) || 0)}
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
            <span className="text-xs font-medium text-text">Status Bagian Aktif</span>
          </label>
        </div>
      </div>

      <FormField label="Keterangan Tambahan" hint="Opsional">
        <textarea
          rows={2}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Keterangan pendukung..."
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
          {loading ? "Menyimpan..." : "Simpan Data"}
        </button>
      </div>
    </form>
  );
}

// Dialog modal wrapper resetting state via key mapping
export function BagianDialog({
  open,
  onOpenChange,
  bagianToEdit,
  onSuccess,
}: BagianDialogProps) {
  const isEdit = Boolean(bagianToEdit);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Data Bagian" : "Tambah Bagian Baru"}
      description={
        isEdit
          ? "Perbarui informasi bagian kerja operasional."
          : "Tambahkan bagian kerja operasional baru ke dalam sistem."
      }
      maxWidth="md"
    >
      <BagianFormInner
        key={bagianToEdit ? bagianToEdit.id : "new-bagian"}
        bagianToEdit={bagianToEdit}
        onClose={() => onOpenChange(false)}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}
