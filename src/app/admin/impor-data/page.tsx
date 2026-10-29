"use client";

// Admin smart document ingestion page with 3-step wizard workflow
import React, { useState, useMemo } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { ImportStep, ImportStepper } from "@/components/import/ImportStepper";
import { UploadDropzone } from "@/components/import/UploadDropzone";
import { EditablePreviewTable } from "@/components/import/EditablePreviewTable";
import { ConfirmationPanel, ProvisionedVendorAccount } from "@/components/import/ConfirmationPanel";
import { ImportHistoryTable } from "@/components/import/ImportHistoryTable";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { AiConsentDialog } from "@/components/import/AiConsentDialog";
import { VendorSecurityConfirmDialog } from "@/components/import/VendorSecurityConfirmDialog";
import { AnalysisResult, DocumentType, KonfirmasiOpsi, ParsedRow } from "@/lib/import/types";
import { cn } from "@/lib/utils";

export default function AdminImporDataPage() {
  const [mainTab, setMainTab] = useState<"unggah" | "riwayat">("unggah");
  const [currentStep, setCurrentStep] = useState<ImportStep>("unggah");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingText, setAnalyzingText] = useState("Mengekstrak berkas...");
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
  const [provisionedUsers, setProvisionedUsers] = useState<ProvisionedVendorAccount[]>([]);

  // Vendor Security Confirmation modal state
  const [showVendorSecurityModal, setShowVendorSecurityModal] = useState(false);

  // AI Fallback state
  const [showAiModal, setShowAiModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Handle analysis
  const handleAnalyze = async (file: File, forceType: DocumentType, ocrText?: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalyzingText(ocrText ? "Memindai OCR..." : "Mengekstrak berkas...");

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

  // Detect unique unmapped vendor names across current rows
  const newVendors = useMemo(() => {
    const names = new Set<string>();
    editableRows.forEach((r) => {
      if (r.status === "baru") {
        const vName = (r as any).vendor_nama || (r as any).nama;
        if (typeof vName === "string" && vName.trim()) {
          names.add(vName.trim());
        }
      } else if ("vendor_nama" in r && (r as any).vendor_nama && !(r as any).vendor_id) {
        names.add((r as any).vendor_nama.trim());
      }
    });
    return Array.from(names);
  }, [editableRows]);

  // Proceed from step 2 to 3 with vendor security check
  const handleProceedToConfirmation = () => {
    if (newVendors.length > 0 && !options.buat_vendor_baru) {
      setShowVendorSecurityModal(true);
      return;
    }
    setCurrentStep("konfirmasi");
  };

  const handleConfirmAutoRegister = () => {
    setOptions((prev) => ({ ...prev, buat_vendor_baru: true }));
    setShowVendorSecurityModal(false);
    setCurrentStep("konfirmasi");
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

      if (json.data?.provisionedUsers) {
        setProvisionedUsers(json.data.provisionedUsers);
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
    setProvisionedUsers([]);
    setAnalysisError(null);
    setConfirmError(null);
    setPendingFile(null);
  };

  return (
    <PageContainer scrollable className="px-3.5 sm:px-5 lg:px-0 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Impor Data Cerdas"
          subtitle="Ekstraksi jadwal catering, daftar vendor, dan rekap porsi dari berkas Excel, CSV, Word, PDF, atau pindaian OCR"
        />
        <div className="shrink-0 pb-2 sm:pb-0">
          <SegmentedControl
            options={[
              { value: "unggah", label: "Unggah Berkas Baru" },
              { value: "riwayat", label: "Riwayat Impor" },
            ]}
            value={mainTab}
            onChange={(val) => setMainTab(val as "unggah" | "riwayat")}
          />
        </div>
      </div>

      {mainTab === "riwayat" ? (
        <div className="mt-4 flex-1 min-h-0 flex flex-col">
          <ImportHistoryTable />
        </div>
      ) : (
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
              provisionedUsers={provisionedUsers}
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
            onProceedToConfirmation={handleProceedToConfirmation}
            onReset={handleReset}
          />
        )}
      </div>
      )}

      {/* Vendor Security & Multi-tenant Isolation Confirmation Dialog */}
      <VendorSecurityConfirmDialog
        isOpen={showVendorSecurityModal}
        onClose={() => setShowVendorSecurityModal(false)}
        newVendors={newVendors}
        onConfirmAutoRegister={handleConfirmAutoRegister}
      />

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
