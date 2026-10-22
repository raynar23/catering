// Text-based stepper navigation with equal-width connectors conforming to DESIGN.md
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
    <nav aria-label="Tahapan Impor Data" className="w-full mb-6">
      {/* Proportional stepper: each step cell is equal-width, connectors fill the gap between badges */}
      <ol className="flex items-center w-full border-b border-border pb-4">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentIndex;
          const isClickable =
            step.id === "unggah" ||
            (step.id === "periksa" && canNavigateToPeriksa) ||
            (step.id === "konfirmasi" && canNavigateToKonfirmasi);

          return (
            <li key={step.id} className="flex-1 flex items-center">
              {/* Step badge + label */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(step.id)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors shrink-0 ${
                  isActive
                    ? "text-primary font-semibold cursor-default"
                    : isCompleted
                    ? "text-text hover:text-primary cursor-pointer"
                    : "text-text-muted cursor-not-allowed"
                }`}
              >
                {/* Badge circle */}
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0 ${
                    isActive
                      ? "bg-primary text-white"
                      : isCompleted
                      ? "bg-primary/80 text-white"
                      : "bg-border text-text-muted border border-border"
                  }`}
                >
                  {step.number}
                </span>
                <span>{step.label}</span>
              </button>

              {/* Connector line — flex-1 so it fills remaining space equally between steps */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    idx < currentIndex
                      ? "bg-primary/50"
                      : "bg-border"
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
