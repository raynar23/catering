// Pure helper functions and step transitions for vendor delivery progress

export type VendorProgress =
  | "menunggu"
  | "dipersiapkan"
  | "dikirim"
  | "sampai"
  | "selesai";

export interface ProgressStepInfo {
  current: VendorProgress;
  next: VendorProgress | null;
  nextLabel: string | null;
  actionTitle: string | null;
  isComplete: boolean;
  stepIndex: number;
  totalSteps: number;
}

export const PROGRESS_STEPS: VendorProgress[] = [
  "menunggu",
  "dipersiapkan",
  "dikirim",
  "sampai",
  "selesai",
];

export const PROGRESS_LABELS: Record<VendorProgress, string> = {
  menunggu: "Menunggu Diproses",
  dipersiapkan: "Sedang Dipersiapkan",
  dikirim: "Dalam Pengantaran",
  sampai: "Tiba di Lokasi",
  selesai: "Selesai",
};

// Pure function to determine the next progress step and action button labels
export function getNextProgressStep(current: string): ProgressStepInfo {
  const normCurrent = (current || "menunggu").toLowerCase() as VendorProgress;
  const currentIndex = PROGRESS_STEPS.indexOf(normCurrent);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const totalSteps = PROGRESS_STEPS.length;

  if (safeIndex >= totalSteps - 1 || normCurrent === "selesai") {
    return {
      current: "selesai",
      next: null,
      nextLabel: null,
      actionTitle: null,
      isComplete: true,
      stepIndex: totalSteps,
      totalSteps,
    };
  }

  const nextStep = PROGRESS_STEPS[safeIndex + 1];

  let nextLabel = "";
  let actionTitle = "";

  switch (nextStep) {
    case "dipersiapkan":
      nextLabel = "Mulai Proses";
      actionTitle = "Mulai Mempersiapkan Makanan";
      break;
    case "dikirim":
      nextLabel = "Tandai Dikirim";
      actionTitle = "Kirim Makanan ke Lokasi";
      break;
    case "sampai":
      nextLabel = "Tandai Sampai";
      actionTitle = "Konfirmasi Sampai di Lokasi";
      break;
    case "selesai":
      nextLabel = "Tandai Selesai";
      actionTitle = "Selesaikan Serah Terima";
      break;
    default:
      nextLabel = "Lanjut";
      actionTitle = "Langkah Berikutnya";
  }

  return {
    current: PROGRESS_STEPS[safeIndex],
    next: nextStep,
    nextLabel,
    actionTitle,
    isComplete: false,
    stepIndex: safeIndex + 1,
    totalSteps,
  };
}

// Check whether transitioning from current progress to target progress is allowed (forward only)
export function isProgressAdvanceAllowed(from: string, to: string): boolean {
  const fromIdx = PROGRESS_STEPS.indexOf(from as VendorProgress);
  const toIdx = PROGRESS_STEPS.indexOf(to as VendorProgress);

  if (fromIdx < 0 || toIdx < 0) return false;
  return toIdx > fromIdx;
}
