import React from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

// Accessible form field wrapper with clean label and inline validation message
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-xs font-medium text-text flex items-center gap-1 select-none"
        >
          {label}
          {required && <span className="text-[#D70015]">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <p className="text-[11px] text-[#D70015] leading-none" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-text-muted leading-none">{hint}</p>
      ) : null}
    </div>
  );
}
