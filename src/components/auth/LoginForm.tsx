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
      }
    } catch {
      setGeneralError("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full text-left space-y-4">
      {/* Stable error banner with fixed container to prevent layout jumps */}
      <div
        className="min-h-[44px] flex items-center"
        aria-live="polite"
        id="login-error-banner"
      >
        {generalError ? (
          <div className="w-full px-3.5 py-2.5 rounded-[8px] bg-danger-soft border border-danger/20 text-danger text-xs font-medium leading-relaxed">
            {generalError}
          </div>
        ) : null}
      </div>

      {/* Username field */}
      <div className="space-y-1.5">
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
          className={`w-full h-11 lg:h-10 px-3 text-base lg:text-sm rounded-[8px] border bg-surface text-text placeholder:text-[#8A8A90] outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            usernameError
              ? "border-danger focus-visible:border-danger"
              : "border-border hover:border-[#C5C5CA] focus-visible:border-primary"
          } ${isSubmitting ? "bg-bg text-text-muted cursor-not-allowed opacity-70" : ""}`}
        />
        {usernameError ? (
          <p id="username-error" className="text-[11px] text-danger font-medium">
            {usernameError}
          </p>
        ) : null}
      </div>

      {/* Password field */}
      <div className="space-y-1.5">
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
        {passwordError ? (
          <p id="password-error" className="text-[11px] text-danger font-medium">
            {passwordError}
          </p>
        ) : null}
      </div>

      {/* Submit button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 lg:h-10 px-4 rounded-[8px] bg-primary hover:bg-primary-600 active:bg-primary-dark text-white text-sm font-medium transition-colors duration-150 ease-out cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
        >
          {isSubmitting ? "Memproses..." : "Masuk"}
        </button>
      </div>
    </form>
  );
}
