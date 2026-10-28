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
  analyzingText = "Mengekstrak berkas...",
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
      } catch {
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
    <div className="w-full space-y-5">
      {/* File Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-[10px] p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-primary bg-primary-50"
            : "border-border hover:border-primary/50 bg-surface"
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
          {/* Upload icon container using primary color */}
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-primary">
            <span className="text-xl font-bold">↑</span>
          </div>

          <div>
            <p className="text-sm font-semibold text-text">
              {selectedFile ? selectedFile.name : "Tarik dan lepas berkas ke sini, atau klik untuk memilih"}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {selectedFile
                ? `${formatFileSize(selectedFile.size)} (Mesin ${getEngineBadge() === "ocr" ? "OCR Browser" : "Aturan"})`
                : "Mendukung XLSX, CSV, DOCX, PDF, dan Gambar Pindaian (Maksimal 10 MB)"}
            </p>
            {selectedFile && (
              <p className="text-[11px] text-primary mt-1 font-medium">
                Klik untuk mengganti berkas
              </p>
            )}
          </div>
        </div>
      </div>

      {/* OCR Progress Display */}
      {ocrProgress !== null && (
        <div className="p-4 bg-primary-50 border border-primary/20 rounded-[8px] space-y-2">
          <div className="flex justify-between text-xs font-medium text-primary">
            <span>{ocrStatus}</span>
            <span>{ocrProgress}%</span>
          </div>
          <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${ocrProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Options Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
            Jenis Dokumen
          </label>
          <select
            value={forceType}
            onChange={(e) => setForceType(e.target.value as DocumentType)}
            disabled={isAnalyzing}
            className="w-full pl-3.5 pr-10 py-2 text-sm bg-surface border border-border rounded-[8px] text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
          >
            {DOCUMENT_TYPES.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
            Aksi
          </label>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={!selectedFile || isAnalyzing}
            className="w-full h-10 px-4 bg-primary hover:bg-[#0E63A1] active:bg-[#0B5A94] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-[8px] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs select-none"
          >
            {isAnalyzing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="whitespace-nowrap truncate">{analyzingText}</span>
              </>
            ) : (
              <span className="whitespace-nowrap">Analisis Berkas</span>
            )}
          </button>
        </div>
      </div>

      {/* AI Fallback Action if available */}
      {showAiFallbackOption && (
        <div className="p-4 bg-primary-50 border border-primary/20 rounded-[8px] flex items-center justify-between gap-4">
          <div className="text-xs text-text">
            <p className="font-semibold text-text">Keyakinan parser aturan rendah pada berkas ini.</p>
            <p className="text-text-muted">Anda dapat mencoba analisis dengan AI Fallback (Gemini).</p>
          </div>
          <button
            type="button"
            onClick={onAiFallbackRequested}
            className="px-3 py-1.5 bg-primary hover:bg-[#0E63A1] text-white text-xs font-semibold rounded-[6px] transition-colors shrink-0"
          >
            Coba dengan AI
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-danger-soft border border-danger/20 text-danger rounded-[8px] text-sm">
          {error}
        </div>
      )}
    </div>
  );
};
