// Text-based stepper navigation without icons conforming to DESIGN.md
import React from "react";

export type ImportStep = "unggah" | "periksa" | "konfirmasi";

interface ImportStepperProps {
  currentStep: ImportStep;
  onStepClick?: (step: ImportStep) => void;
  canNavigateToPeriksa?: boolean;
  canNavigateToKonfirmasi?: boolean;
}

const STEPS: { id: ImportStep; label: string; number: string }[] = [
  { id: "unggah", label: "Unggah", number: "1" },
  { id: "periksa", label: "Periksa", number: "2" },
  { id: "konfirmasi", label: "Konfirmasi", number: "3" },
];

export const ImportStepper: React.FC<ImportStepperProps> = ({
  currentStep,
  onStepClick,
  canNavigateToPeriksa = false,
  canNavigateToKonfirmasi = false,
}) => {
  const getStepIndex = (step: ImportStep) => {
    return STEPS.findIndex((s) => s.id === step);
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <nav aria-label="Tahapan Impor Data" className="w-full mb-8">
      <ol className="flex items-center justify-between max-w-2xl mx-auto border-b border-neutral-200 dark:border-neutral-800 pb-4">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentIndex;
          const isClickable =
            (step.id === "unggah") ||
            (step.id === "periksa" && canNavigateToPeriksa) ||
            (step.id === "konfirmasi" && canNavigateToKonfirmasi);

          return (
            <li key={step.id} className="flex-1 flex items-center justify-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(step.id)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-semibold cursor-default"
                    : isCompleted
                    ? "text-neutral-900 dark:text-neutral-100 hover:text-blue-600 cursor-pointer"
                    : "text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-blue-600 text-white dark:bg-blue-500"
                      : isCompleted
                      ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  {step.number}
                </span>
                <span>{step.label}</span>
              </button>

              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    idx < currentIndex
                      ? "bg-neutral-800 dark:bg-neutral-300"
                      : "bg-neutral-200 dark:bg-neutral-800"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
