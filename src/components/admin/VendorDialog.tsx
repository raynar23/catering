"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { VendorRecord, saveVendorAction, getNextVendorCode } from "@/lib/actions/vendor";
import { useToast } from "@/components/ui/Toast";

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorToEdit?: VendorRecord | null;
  onSuccess: () => void;
}

interface FormInnerProps {
  vendorToEdit?: VendorRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

function VendorFormInner({ vendorToEdit, onClose, onSuccess }: FormInnerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [kode, setKode] = useState(vendorToEdit?.kode ?? "");
  const [nama, setNama] = useState(vendorToEdit?.nama ?? "");
  const [namaKontak, setNamaKontak] = useState(vendorToEdit?.nama_kontak ?? "");
  const [noWa, setNoWa] = useState(vendorToEdit?.no_wa ?? "");
  const [noTelp, setNoTelp] = useState(vendorToEdit?.no_telp ?? "");
  const [alamat, setAlamat] = useState(vendorToEdit?.alamat ?? "");
  const [urutanRotasi, setUrutanRotasi] = useState(vendorToEdit?.urutan_rotasi ?? 0);
  const [aktif, setAktif] = useState(vendorToEdit?.aktif ?? true);

  useEffect(() => {
    if (!vendorToEdit) {
      getNextVendorCode().then((code) => setKode(code));
    }
  }, [vendorToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const errs: Record<string, string> = {};
    if (!kode.trim()) errs.kode = "Kode vendor wajib diisi";
    if (!nama.trim()) errs.nama = "Nama vendor wajib diisi";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await saveVendorAction(
        {
          kode,
          nama,
          nama_kontak: namaKontak || undefined,
          no_wa: noWa || undefined,
          no_telp: noTelp || undefined,
          alamat: alamat || undefined,
          urutan_rotasi: Number(urutanRotasi) || 0,
          aktif,
        },
        vendorToEdit?.id
      );

      if (res.success) {
        toast({
          title: "Berhasil",
          description: res.message ?? "Data vendor berhasil disimpan",
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Kode Vendor" required error={errors.kode} hint="Otomatis terisi">
          <input
            type="text"
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            placeholder="Contoh: V006"
            className="h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-placeholder shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all uppercase tabular-nums"
          />
        </FormField>

        <FormField label="Nama Vendor" required error={errors.nama}>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Aisya Catering"
            className="h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-placeholder shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Nama Kontak (PIC)">
          <input
            type="text"
            value={namaKontak}
            onChange={(e) => setNamaKontak(e.target.value)}
            placeholder="Nama penanggung jawab"
            className="h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-placeholder shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all"
          />
        </FormField>

        <FormField label="No. WhatsApp" hint="Awalan 08 atau 62">
          <input
            type="text"
            value={noWa}
            onChange={(e) => setNoWa(e.target.value)}
            placeholder="Contoh: 08123456789"
            className="h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-placeholder shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all tabular-nums"
          />
        </FormField>

        <FormField label="No. Telepon / Kantor">
          <input
            type="text"
            value={noTelp}
            onChange={(e) => setNoTelp(e.target.value)}
            placeholder="Contoh: 0313551234"
            className="h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-placeholder shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all tabular-nums"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Urutan Rotasi Harian">
          <input
            type="number"
            min={0}
            value={urutanRotasi}
            onChange={(e) => setUrutanRotasi(parseInt(e.target.value, 10) || 0)}
            className="h-8.5 px-3 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all tabular-nums"
          />
        </FormField>

        <div className="flex flex-col justify-end pb-1.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aktif}
              onChange={(e) => setAktif(e.target.checked)}
              className="w-4 h-4 rounded-[4px] text-primary border-[#D1D1D6] focus:ring-primary/20 cursor-pointer"
            />
            <span className="text-xs font-medium text-text">Vendor Aktif Beroperasi</span>
          </label>
        </div>
      </div>

      <FormField label="Alamat Operasional Dapur" hint="Opsional">
        <textarea
          rows={2}
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="Alamat lengkap vendor catering..."
          className="p-2.5 rounded-[8px] border border-[#D1D1D6] bg-white text-xs text-text placeholder:text-placeholder shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/15 transition-all resize-none"
        />
      </FormField>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5EA]">
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="h-8.5 px-4 rounded-[8px] bg-[#E5E5EA]/80 hover:bg-[#DCDCE2] active:bg-[#D1D1D6] text-xs font-semibold text-[#1D1D1F] disabled:opacity-50 transition-all cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="h-8.5 px-4 rounded-[8px] bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] text-white text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.08)] disabled:opacity-50 transition-all cursor-pointer focus:outline-none focus:ring-3 focus:ring-primary/20"
        >
          {loading ? "Menyimpan..." : "Simpan Vendor"}
        </button>
      </div>
    </form>
  );
}

// Dialog modal wrapper resetting state via key mapping
export function VendorDialog({
  open,
  onOpenChange,
  vendorToEdit,
  onSuccess,
}: VendorDialogProps) {
  const isEdit = Boolean(vendorToEdit);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Ubah Data Vendor" : "Tambah Vendor Baru"}
      description={
        isEdit
          ? "Perbarui informasi penyedia jasa catering."
          : "Tambahkan vendor catering rekanan baru ke sistem."
      }
      maxWidth="md"
    >
      <VendorFormInner
        key={vendorToEdit ? vendorToEdit.id : "new-vendor"}
        vendorToEdit={vendorToEdit}
        onClose={() => onOpenChange(false)}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}
