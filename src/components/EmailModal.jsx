"use client";

import { useEffect, useRef, useState } from "react";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";

/**
 * Email Modal for sending confirmation/conflict emails to reservants.
 *
 * Props:
 * - reservation: the reservation object
 * - onClose: close the modal
 * - onSent: callback when email is sent successfully
 */
/**
 * `initialType` preselects the email; `keeping` is the booking that keeps the
 * room when this one is declined, so the email names the right overlap.
 */
export default function EmailModal({ reservation, onClose, onSent, initialType = "auto", keeping = null }) {
  const dialogRef = useAccessibleDialog(onClose);
  const [emailType, setEmailType] = useState(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const closeRef = useRef(null);

  // Sending swaps the Send button for the result, so move focus to Close
  // rather than letting it drop to the page behind the dialog.
  useEffect(() => {
    if (success) closeRef.current?.focus();
  }, [success]);

  const recipientEmail = reservation?.recipientEmail || reservation?.email || "";

  async function handleSend() {
    setError("");
    setSuccess(null);

    if (!recipientEmail) {
      setError("No email address available for this reservant.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation,
          emailType,
          conflictWithRow: emailType === "conflict" ? keeping?.rowIndex : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess({
          type: data.emailType,
          sentTo: data.sentTo,
        });
        if (onSent) onSent(data);
      } else {
        setError(data.error || "Failed to send email");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Format time from datetime string
  function fmtTime(dt) {
    const match = dt?.match(/T(\d{2}):(\d{2})/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      const period = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${period}`;
    }
    return dt;
  }

  function fmtDate(dt) {
    const match = dt?.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return dt;
  }

  return (
    <div role="presentation"
      className="lg-tokens lg-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="email-title" tabIndex={-1} className="lg-sheet lg-materialize flex w-full max-w-[480px] flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pb-2 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-[var(--lg-free-soft)]">
                <span aria-hidden="true" className="material-symbols-outlined text-[var(--lg-free)]">
                  mail
                </span>
              </div>
              <div>
                <h2 id="email-title" className="lg-title">
                  Send Email
                </h2>
                <p className="mt-0.5 text-[14px] lg-muted">
                  Notify the reservant about their booking
                </p>
              </div>
            </div>
            <button
              aria-label="Close"
              onClick={onClose}
              className="lg-btn lg-btn-secondary lg-btn-icon"
            >
              <span aria-hidden="true" className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-4">
          {/* Reservation Summary */}
          <div className="lg-pass space-y-1.5 p-4">
            <p className="font-semibold">
              {reservation?.eventName}
            </p>
            <p className="text-[13px] lg-muted lg-num">{reservation?.room}</p>
            <p className="text-[13px] lg-muted lg-num">
              {fmtDate(reservation?.startTime)} &middot;{" "}
              {fmtTime(reservation?.startTime)} -{" "}
              {fmtTime(reservation?.endTime)}
            </p>
            {reservation?.fullName && (
              <p className="text-[13px] lg-muted lg-num">
                Booked by: {reservation.fullName}
              </p>
            )}
          </div>

          {keeping && emailType === "conflict" && (
            <p className="rounded-[14px] border border-[var(--lg-line)] bg-[var(--lg-chrome-fill)] p-3 text-[14px]">
              <strong>{keeping.eventName}</strong> keeps the room. This request gets the room-not-available email and
              stops holding the time.
            </p>
          )}

          {/* Recipient */}
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold">
              Recipient Email
            </p>
            <div className="lg-input flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] lg-muted">
                email
              </span>
              <span
                className={`text-[15px] ${recipientEmail ? "" : "text-[var(--lg-danger)]"}`}
              >
                {recipientEmail || "No email address on file"}
              </span>
            </div>
          </div>

          {/* Email Type */}
          <div className="flex flex-col gap-2">
            <p id="email-type-label" className="text-[13px] font-semibold">
              Email Type
            </p>
            <div role="group" aria-labelledby="email-type-label" className="grid grid-cols-3 gap-2">
              {[
                {
                  value: "auto",
                  label: "Auto-detect",
                  icon: "smart_toy",
                  desc: "Checks for conflicts automatically",
                },
                {
                  value: "confirmation",
                  label: "Confirmed",
                  icon: "check_circle",
                  desc: "Reservation approved",
                },
                {
                  value: "conflict",
                  label: "Conflict",
                  icon: "warning",
                  desc: "Time slot overlap",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={emailType === opt.value}
                  onClick={() => setEmailType(opt.value)}
                  className={`rounded-[14px] border p-3 text-center ${
                    emailType === opt.value
                      ? "border-[var(--lg-action)] bg-[var(--lg-action)] text-[var(--lg-action-ink)]"
                      : "border-[var(--lg-line)] bg-[var(--lg-sheet-fill)] hover:bg-[var(--lg-solid)]"
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[20px] block mb-1">
                    {opt.icon}
                  </span>
                  <p className="text-[13px] font-semibold">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* CC Notice */}
          <div className="flex items-start gap-2 rounded-[14px] border border-[var(--lg-line)] bg-[var(--lg-chrome-fill)] p-3">
            <span aria-hidden="true" className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] lg-muted">
              info
            </span>
            <p className="text-[13px] lg-muted">
              This email will be sent from your admin Outlook account. Other
              administrators will be automatically CC&apos;d.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div role="status" className="flex items-center gap-2 rounded-[14px] border border-[var(--lg-free)] bg-[var(--lg-free-soft)] p-3">
              <span aria-hidden="true" className="material-symbols-outlined text-lg text-[var(--lg-free)]">
                check_circle
              </span>
              <div>
                <p className="font-semibold">
                  Email sent successfully!
                </p>
                <p className="mt-0.5 text-[13px]">
                  {success.type === "conflict" ? "Conflict notice" : "Confirmation"}{" "}
                  sent to {success.sentTo}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-[14px] border border-[var(--lg-danger)] bg-[var(--lg-danger-soft)] p-3">
              <span aria-hidden="true" className="material-symbols-outlined text-lg text-[var(--lg-danger)]">
                error
              </span>
              <p className="text-[14px] font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={loading}
            className="lg-btn lg-btn-secondary"
          >
            {success ? "Close" : "Cancel"}
          </button>
          {!success && (
            <button
              onClick={handleSend}
              disabled={loading || !recipientEmail}
              className="lg-btn lg-btn-primary"
            >
              {loading ? (
                <>
                  <svg
                    className="size-4 animate-spin motion-reduce:hidden"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    send
                  </span>
                  <span>Send Email</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
