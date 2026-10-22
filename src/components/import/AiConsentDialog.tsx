// Modal dialog requesting user consent before sending document data to external AI API
import React from "react";

interface AiConsentDialogProps {
  isOpen: boolean;
  filename: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AiConsentDialog: React.FC<AiConsentDialogProps> = ({
  isOpen,
  filename,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
          Persetujuan Pengiriman Data ke Layanan AI
        </h3>

        <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
          <p>
            Anda akan menganalisis berkas <strong>{filename}</strong> menggunakan layanan eksternal Google Gemini AI.
          </p>
          <p>
            Potongan teks dokumen ini akan dikirimkan ke Google Cloud AI untuk diekstraksi. Antarmuka sistem tidak akan menyimpan atau menggunakan data Anda untuk pelatihan model publik.
          </p>
          <p className="font-medium text-amber-700 dark:text-amber-400">
            Pastikan berkas tidak memuat informasi pribadi yang melanggar kebijakan privasi internal perusahaan.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Saya Setuju & Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
};
