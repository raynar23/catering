"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  "aria-describedby"?: string;
}

export function PasswordField({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder = "Masukkan password",
  disabled = false,
  hasError = false,
  "aria-describedby": ariaDescribedBy,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex items-center">
      <input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="current-password"
        aria-invalid={hasError ? "true" : undefined}
        aria-describedby={ariaDescribedBy}
        className={`w-full h-11 lg:h-10 pl-3 pr-11 text-base lg:text-sm rounded-[8px] border bg-surface text-text placeholder:text-[#8A8A90] shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          hasError
            ? "border-danger focus-visible:border-danger"
            : "border-border hover:border-[#C5C5CA] focus-visible:border-primary"
        } ${disabled ? "bg-bg text-text-muted cursor-not-allowed opacity-70" : ""}`}
      />
      <button
        type="button"
        tabIndex={0}
        disabled={disabled}
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute right-0 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-text rounded-r-[8px] focus-visible:outline-none focus-visible:text-primary transition-colors duration-150 ease-out cursor-pointer"
      >
        {showPassword ? (
          <EyeOff className="w-[18px] h-[18px] stroke-[1.75]" aria-hidden="true" />
        ) : (
          <Eye className="w-[18px] h-[18px] stroke-[1.75]" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
