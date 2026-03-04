"use client";

import { useState } from "react";

/**
 * Email Modal for sending confirmation/conflict emails to reservants.
 *
 * Props:
 * - reservation: the reservation object
 * - onClose: close the modal
 * - onSent: callback when email is sent successfully
 */
export default function EmailModal({ reservation, onClose, onSent }) {
  const [emailType, setEmailType] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

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
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#192233] w-full max-w-[480px] rounded-xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col modal-content">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-400">
                  mail
                </span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">
                  Send Email
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Notify the reservant about their booking
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Reservation Summary */}
          <div className="bg-slate-800/40 rounded-lg border border-slate-700/50 p-4 space-y-2">
            <p className="text-sm font-semibold text-white">
              {reservation?.eventName}
            </p>
            <p className="text-xs text-slate-400">{reservation?.room}</p>
            <p className="text-xs text-slate-500">
              {fmtDate(reservation?.startTime)} &middot;{" "}
              {fmtTime(reservation?.startTime)} &ndash;{" "}
              {fmtTime(reservation?.endTime)}
            </p>
            {reservation?.fullName && (
              <p className="text-xs text-slate-500">
                Booked by: {reservation.fullName}
              </p>
            )}
          </div>

          {/* Recipient */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">
              Recipient Email
            </label>
            <div className="flex items-center gap-2 h-10 px-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <span className="material-symbols-outlined text-slate-500 text-[18px]">
                email
              </span>
              <span
                className={`text-sm ${recipientEmail ? "text-slate-200" : "text-red-400"}`}
              >
                {recipientEmail || "No email address on file"}
              </span>
            </div>
          </div>

          {/* Email Type */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">
              Email Type
            </label>
            <div className="grid grid-cols-3 gap-2">
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
                  onClick={() => setEmailType(opt.value)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    emailType === opt.value
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                      : "border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] block mb-1">
                    {opt.icon}
                  </span>
                  <p className="text-xs font-semibold">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* CC Notice */}
          <div className="p-3 bg-[#0f49bd]/10 border border-[#0f49bd]/20 rounded-lg flex gap-2 items-start">
            <span className="material-symbols-outlined text-[#0f49bd] text-[18px] shrink-0 mt-0.5">
              info
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              This email will be sent from your admin Outlook account. Other
              administrators will be automatically CC&apos;d.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="material-symbols-outlined text-emerald-400 text-lg">
                check_circle
              </span>
              <div>
                <p className="text-sm text-emerald-400 font-medium">
                  Email sent successfully!
                </p>
                <p className="text-xs text-emerald-400/70 mt-0.5">
                  {success.type === "conflict" ? "Conflict notice" : "Confirmation"}{" "}
                  sent to {success.sentTo}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="material-symbols-outlined text-red-400 text-lg">
                error
              </span>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-800/30 flex items-center justify-end gap-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 h-10 rounded-lg font-semibold text-slate-300 hover:bg-slate-700 transition-colors text-sm"
          >
            {success ? "Close" : "Cancel"}
          </button>
          {!success && (
            <button
              onClick={handleSend}
              disabled={loading || !recipientEmail}
              className="px-6 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
                  <span className="material-symbols-outlined text-[18px]">
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
