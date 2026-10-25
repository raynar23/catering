// Text-based stepper navigation with proportional connectors and responsive edge alignment
import React from "react";
import { cn } from "@/lib/utils";

export type ImportStep = "unggah" | "periksa" | "konfirmasi";

interface ImportStepperProps {
  currentStep: ImportStep;
  onStepClick?: (step: ImportStep) => void;
  canNavigateToPeriksa?: boolean;
  canNavigateToKonfirmasi?: boolean;
  className?: string;
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
  className,
}) => {
  const getStepIndex = (step: ImportStep) => {
    return STEPS.findIndex((s) => s.id === step);
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <nav aria-label="Tahapan Impor Data" className={cn("w-full mb-6", className)}>
      {/* Stepper aligned flush with underlying cards: Step 1 flush left, Step 2 centered, Step 3 flush right */}
      <ol className="flex items-center w-full justify-between border-b border-border pb-4">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isCompleted = idx < currentIndex;
          const isClickable =
            step.id === "unggah" ||
            (step.id === "periksa" && canNavigateToPeriksa) ||
            (step.id === "konfirmasi" && canNavigateToKonfirmasi);

          return (
            <React.Fragment key={step.id}>
              {/* Step badge + label */}
              <li className="flex items-center shrink-0">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors select-none ${
                    isActive
                      ? "text-primary font-semibold cursor-default"
                      : isCompleted
                      ? "text-text hover:text-primary cursor-pointer"
                      : "text-text-muted cursor-not-allowed"
                  }`}
                >
                  {/* Badge circle */}
                  <span
                    className={`flex items-center justify-center w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full text-[11px] sm:text-xs font-semibold shrink-0 transition-colors ${
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : isCompleted
                        ? "bg-primary/80 text-white"
                        : "bg-border text-text-muted border border-border"
                    }`}
                  >
                    {step.number}
                  </span>
                  <span>{step.label}</span>
                </button>
              </li>

              {/* Connector line — flex-1 fills remaining space equally between steps */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-3 md:mx-4 transition-colors ${
                    idx < currentIndex ? "bg-primary" : "bg-border"
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
