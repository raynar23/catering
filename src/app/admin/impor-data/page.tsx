"use client";

// Admin smart document ingestion page with 3-step wizard workflow
import React, { useState } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { ImportStep, ImportStepper } from "@/components/import/ImportStepper";
import { UploadDropzone } from "@/components/import/UploadDropzone";
import { EditablePreviewTable } from "@/components/import/EditablePreviewTable";
import { ConfirmationPanel } from "@/components/import/ConfirmationPanel";
import { AiConsentDialog } from "@/components/import/AiConsentDialog";
import { AnalysisResult, DocumentType, KonfirmasiOpsi, ParsedRow } from "@/lib/import/types";
import { cn } from "@/lib/utils";

export default function AdminImporDataPage() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("unggah");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingText, setAnalyzingText] = useState("Mengekstrak dan menganalisis berkas...");
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [editableRows, setEditableRows] = useState<ParsedRow[]>([]);
  const [options, setOptions] = useState<KonfirmasiOpsi>({
    buat_vendor_baru: false,
    timpa_periode: false,
  });

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // AI Fallback state
  const [showAiModal, setShowAiModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Handle analysis
  const handleAnalyze = async (file: File, forceType: DocumentType, ocrText?: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalyzingText(ocrText ? "Menganalisis hasil pindaian OCR..." : "Mengekstrak berkas dan memetakan jadwal...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("forceType", forceType);
      if (ocrText) {
        formData.append("ocrText", ocrText);
        formData.append("engine", "ocr");
      }

      const res = await fetch("/api/impor/analisis", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        // If file needs OCR
        if (json.needsOcr) {
          setAnalysisError("Dokumen PDF berupa pindaian tanpa lapisan teks. Silakan gunakan berkas gambar atau ekstrak OCR.");
          return;
        }
        throw new Error(json.error || "Gagal menganalisis berkas dokumen.");
      }

      const data: AnalysisResult = json.data;
      setAnalysisResult(data);
      setEditableRows(data.rows);
      setPendingFile(file);
      setCurrentStep("periksa");
    } catch (err: any) {
      setAnalysisError(err.message || "Terjadi kesalahan saat menganalisis berkas.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle confirmation
  const handleConfirm = async () => {
    if (!analysisResult?.batchId) return;

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const res = await fetch("/api/impor/konfirmasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: analysisResult.batchId,
          rows: editableRows,
          options,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengonfirmasi impor data.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setConfirmError(err.message || "Gagal menyimpan data ke sistem.");
    } finally {
      setIsConfirming(false);
    }
  };

  // Reset to initial step
  const handleReset = () => {
    setCurrentStep("unggah");
    setAnalysisResult(null);
    setEditableRows([]);
    setOptions({ buat_vendor_baru: false, timpa_periode: false });
    setIsSuccess(false);
    setAnalysisError(null);
    setConfirmError(null);
    setPendingFile(null);
  };

  return (
    <PageContainer className="px-3.5 sm:px-5 lg:px-0">
      <PageHeader
        title="Impor Data Cerdas"
        subtitle="Ekstraksi jadwal catering, daftar vendor, dan rekap porsi dari berkas Excel, CSV, Word, PDF, atau pindaian OCR"
      />

      <div className="mt-6 flex-1 min-h-0 flex flex-col">
        {/* Responsive layout wrapper for stepper and content panels */}
        <div
          className={cn(
            "w-full transition-all duration-200",
            currentStep === "periksa" ? "w-full" : "max-w-2xl mx-auto"
          )}
        >
          <ImportStepper
            currentStep={currentStep}
            onStepClick={(step) => setCurrentStep(step)}
            canNavigateToPeriksa={!!analysisResult}
            canNavigateToKonfirmasi={
              !!analysisResult && editableRows.every((r) => r.status !== "error")
            }
          />

          {/* Step 1: Upload */}
          {currentStep === "unggah" && (
            <UploadDropzone
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              analyzingText={analyzingText}
              error={analysisError}
              showAiFallbackOption={
                !!analysisResult && analysisResult.keyakinan < 0.6
              }
              onAiFallbackRequested={() => setShowAiModal(true)}
            />
          )}

          {/* Step 3: Confirmation */}
          {currentStep === "konfirmasi" && analysisResult && (
            <ConfirmationPanel
              analysis={analysisResult}
              rows={editableRows}
              options={options}
              onBackToPeriksa={() => setCurrentStep("periksa")}
              onConfirm={handleConfirm}
              isConfirming={isConfirming}
              isSuccess={isSuccess}
              error={confirmError}
              onReset={handleReset}
            />
          )}
        </div>

        {/* Step 2: Review */}
        {currentStep === "periksa" && analysisResult && (
          <EditablePreviewTable
            rows={editableRows}
            onRowsChange={setEditableRows}
            documentType={analysisResult.jenisDokumen}
            options={options}
            onOptionsChange={setOptions}
            onProceedToConfirmation={() => setCurrentStep("konfirmasi")}
            onReset={handleReset}
          />
        )}
      </div>

      {/* AI Fallback Consent Dialog */}
      <AiConsentDialog
        isOpen={showAiModal}
        filename={pendingFile?.name || "dokumen"}
        onCancel={() => setShowAiModal(false)}
        onConfirm={async () => {
          setShowAiModal(false);
          if (pendingFile) {
            await handleAnalyze(pendingFile, "jadwal");
          }
        }}
      />
    </PageContainer>
  );
}
