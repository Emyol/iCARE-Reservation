"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, X } from "lucide-react";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";

/**
 * Admin Login Modal
 * Sends POST /api/auth with username + password.
 * On success, calls onLogin(adminInfo) to update parent state.
 */
export default function AdminLoginModal({ onClose, onLogin }) {
  const dialogRef = useAccessibleDialog(onClose);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your username");
      return;
    }

    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onLogin(data.adminInfo || null);
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="presentation"
      className="lg-tokens lg-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        tabIndex={-1}
        className="lg-sheet lg-materialize relative w-full max-w-[420px] p-7"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/brand/glass-pass-stack-login.webp" alt="" width={120} height={120} className="rounded-3xl" priority />
          <h2 id="login-title" className="lg-title">Staff sign in</h2>
          <p className="lg-muted">For iCARE staff managing reservations.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="lg-field">
            <label htmlFor="login-username">Username</label>
            <input
              type="text"
              id="login-username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="lg-input"
              disabled={loading}
            />
          </div>

          <div className="lg-field">
            <label htmlFor="login-password">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="lg-input pr-12"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="lg-btn lg-btn-quiet absolute right-0 top-0 h-11 w-11 p-0"
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="size-5" strokeWidth={1.75} />
                ) : (
                  <Eye aria-hidden="true" className="size-5" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-[14px] border border-[var(--lg-danger)] bg-[var(--lg-danger-soft)] px-4 py-3 text-[14px] font-medium">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="lg-btn lg-btn-primary mt-1 w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] lg-muted">
          Authorized iCARE staff only.
        </p>

        {/* Last in the DOM so the dialog's first focus lands on Username. */}
        <button type="button" onClick={onClose} aria-label="Close" className="lg-btn lg-btn-secondary lg-btn-icon absolute right-4 top-4">
          <X aria-hidden="true" className="size-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
