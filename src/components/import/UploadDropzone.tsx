// Upload dropzone with document type selector, OCR progress, and engine badge
import React, { useState, useRef } from "react";
import { DocumentType, ImportEngine } from "@/lib/import/types";
import { runBrowserOcr } from "@/lib/import/extract/ocr";

interface UploadDropzoneProps {
  onAnalyze: (file: File, forceType: DocumentType, ocrText?: string) => Promise<void>;
  isAnalyzing: boolean;
  analyzingText?: string;
  error?: string | null;
  onAiFallbackRequested?: () => void;
  showAiFallbackOption?: boolean;
}

const DOCUMENT_TYPES: { id: DocumentType; label: string }[] = [
  { id: "otomatis", label: "Otomatis Deteksi" },
  { id: "jadwal", label: "Jadwal Catering" },
  { id: "vendor", label: "Daftar Vendor" },
  { id: "bagian", label: "Data Bagian" },
  { id: "rekap_harian", label: "Jumlah Catering Harian" },
];

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onAnalyze,
  isAnalyzing,
  analyzingText = "Mengekstrak dan menganalisis berkas...",
  error,
  onAiFallbackRequested,
  showAiFallbackOption = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [forceType, setForceType] = useState<DocumentType>("otomatis");
  const [isDragging, setIsDragging] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageFile = (file: File) => {
    return file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;

    // If file is an image, run browser OCR with Web Worker progress
    if (isImageFile(selectedFile)) {
      try {
        setOcrProgress(5);
        setOcrStatus("Memulai worker OCR bahasa Indonesia...");
        const text = await runBrowserOcr(selectedFile, (prog, msg) => {
          setOcrProgress(prog);
          setOcrStatus(`Memindai teks: ${prog}% (${msg})`);
        });
        setOcrProgress(100);
        setOcrStatus("Pemindaian OCR selesai, mengirim hasil...");
        await onAnalyze(selectedFile, forceType, text);
      } catch (err: any) {
        setOcrProgress(null);
        setOcrStatus("");
      }
    } else {
      await onAnalyze(selectedFile, forceType);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getEngineBadge = (): ImportEngine => {
    if (selectedFile && isImageFile(selectedFile)) return "ocr";
    return "aturan";
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* File Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
            : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv,.docx,.pdf,.png,.jpg,.jpeg,.webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
            <span className="text-xl font-bold">↑</span>
          </div>

          <div>
            <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
              {selectedFile ? selectedFile.name : "Tarik dan lepas berkas ke sini, atau klik untuk memilih"}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Mendukung XLSX, CSV, DOCX, PDF, dan Gambar Pindaian (Maksimal 10 MB)
            </p>
          </div>

          {selectedFile && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md text-xs font-medium text-neutral-700 dark:text-neutral-300">
              <span>{formatFileSize(selectedFile.size)}</span>
              <span>•</span>
              <span>Mesin: {getEngineBadge() === "ocr" ? "OCR Browser" : "Aturan"}</span>
            </div>
          )}
        </div>
      </div>

      {/* OCR Progress Display */}
      {ocrProgress !== null && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg space-y-2">
          <div className="flex justify-between text-xs font-medium text-blue-900 dark:text-blue-300">
            <span>{ocrStatus}</span>
            <span>{ocrProgress}%</span>
          </div>
          <div className="w-full h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-200"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Options Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
            Jenis Dokumen
          </label>
          <select
            value={forceType}
            onChange={(e) => setForceType(e.target.value as DocumentType)}
            disabled={isAnalyzing}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5 opacity-0 sm:opacity-100">
            Aksi
          </label>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={!selectedFile || isAnalyzing}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{analyzingText}</span>
              </>
            ) : (
              <span>Analisis Berkas</span>
            )}
          </button>
        </div>
      </div>

      {/* AI Fallback Action if available */}
      {showAiFallbackOption && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg flex items-center justify-between">
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Keyakinan parser aturan rendah pada berkas ini.</p>
            <p>Anda dapat mencoba analisis dengan AI Fallback (Gemini).</p>
          </div>
          <button
            type="button"
            onClick={onAiFallbackRequested}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md transition-colors"
          >
            Coba dengan AI
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
};
