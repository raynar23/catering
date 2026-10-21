"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth/sign-in";
import { PasswordField } from "./PasswordField";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usernameError =
    usernameTouched && !username.trim() ? "Username wajib diisi" : null;
  const passwordError =
    passwordTouched && !password ? "Password wajib diisi" : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUsernameTouched(true);
    setPasswordTouched(true);

    if (!username.trim() || !password) {
      return;
    }

    setGeneralError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn({ username, password });
      if (!result.ok) {
        setGeneralError(result.message);
        setIsSubmitting(false);
      } else {
        window.location.href = result.redirectTo;
      }
    } catch {
      setGeneralError("Terjadi kesalahan sistem. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full text-left space-y-2.5">
      {/* General error banner when present */}
      {generalError ? (
        <div
          className="w-full px-3.5 py-2 rounded-[8px] bg-danger-soft border border-danger/20 text-danger text-xs font-medium leading-relaxed"
          aria-live="polite"
          id="login-error-banner"
        >
          {generalError}
        </div>
      ) : null}

      {/* Username field */}
      <div className="space-y-1">
        <label
          htmlFor="username"
          className="block text-xs font-medium text-text select-none"
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (generalError) setGeneralError(null);
          }}
          onBlur={() => setUsernameTouched(true)}
          placeholder="Masukkan username"
          disabled={isSubmitting}
          autoComplete="username"
          aria-invalid={usernameError ? "true" : undefined}
          aria-describedby={usernameError ? "username-error" : undefined}
          className={`w-full h-11 lg:h-10 px-3 text-base lg:text-sm rounded-[8px] border bg-surface text-text placeholder:text-[#8A8A90] shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            usernameError
              ? "border-danger focus-visible:border-danger"
              : "border-border hover:border-[#C5C5CA] focus-visible:border-primary"
          } ${isSubmitting ? "bg-bg text-text-muted cursor-not-allowed opacity-70" : ""}`}
        />
        {/* Fixed height slot to ensure form height never shifts */}
        <div className="h-[18px] flex items-center">
          {usernameError ? (
            <p id="username-error" className="text-[11px] text-danger font-medium leading-none">
              {usernameError}
            </p>
          ) : null}
        </div>
      </div>

      {/* Password field */}
      <div className="space-y-1">
        <label
          htmlFor="password"
          className="block text-xs font-medium text-text select-none"
        >
          Password
        </label>
        <PasswordField
          id="password"
          name="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (generalError) setGeneralError(null);
          }}
          onBlur={() => setPasswordTouched(true)}
          placeholder="Masukkan password"
          disabled={isSubmitting}
          hasError={Boolean(passwordError)}
          aria-describedby={passwordError ? "password-error" : undefined}
        />
        {/* Fixed height slot to ensure form height never shifts */}
        <div className="h-[18px] flex items-center">
          {passwordError ? (
            <p id="password-error" className="text-[11px] text-danger font-medium leading-none">
              {passwordError}
            </p>
          ) : null}
        </div>
      </div>

      {/* Submit button */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 lg:h-10 px-4 rounded-[8px] bg-primary hover:bg-primary-600 active:bg-primary-dark text-white text-sm font-medium shadow-[0_2px_6px_rgba(17,117,187,0.28)] hover:shadow-[0_4px_10px_rgba(17,117,187,0.32)] transition-all duration-150 ease-out cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
        >
          {isSubmitting ? "Memproses..." : "Masuk"}
        </button>
      </div>
    </form>
  );
}
