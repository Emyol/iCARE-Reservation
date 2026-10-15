"use client";

import { useState } from "react";
import { ROOMS } from "@/lib/rooms";
import { manilaNow, validateReservation } from "@/lib/reservationRules";
import ConflictOverride from "@/components/ConflictOverride";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";

const inputClass =
  "w-full h-12 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0f49bd]/50 focus:border-[#0f49bd] outline-none transition-all";

/**
 * Manual Booking Modal
 * Sends POST /api/reservations. Overlaps come back as 409; the admin can then
 * save anyway with a reason. On success, calls onBooked() to refresh data.
 */
export default function BookingModal({ onClose, onBooked, initial = {} }) {
  const dialogRef = useAccessibleDialog(onClose);
  const today = manilaNow().slice(0, 10);
  const [room, setRoom] = useState(initial.room || "");
  const [eventName, setEventName] = useState("");
  const [date, setDate] = useState(initial.date || today);
  const [start, setStart] = useState(initial.start || "");
  const [end, setEnd] = useState(initial.end || "");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [attendees, setAttendees] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [emailProblem, setEmailProblem] = useState(null);

  const capacity = ROOMS.find((r) => r.value === room)?.capacity;

  // A changed slot needs a fresh conflict check.
  function changeSlot(setter) {
    return (e) => {
      setter(e.target.value);
      setConflicts(null);
      setOverride(false);
    };
  }

  function validate() {
    if (!room) return "Please select a room";
    if (!eventName.trim()) return "Please enter an event/professor name";
    if (!fullName.trim()) return "Please enter the booker's full name";
    if (!date || !start || !end) return "Please choose a date, start time, and end time";
    const check = validateReservation({
      room,
      eventName,
      startTime: `${date}T${start}`,
      endTime: `${date}T${end}`,
      attendees,
    });
    if (!check.ok) return check.errors[0];
    if (conflicts && override && !reason.trim()) return "Enter a reason for booking over the overlap";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room,
          eventName: eventName.trim(),
          startTime: `${date}T${start}`,
          endTime: `${date}T${end}`,
          fullName: fullName.trim(),
          email: email.trim(),
          attendees: attendees.trim(),
          override: Boolean(conflicts && override),
          reason: reason.trim(),
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }

      if (res.status === 409 && data.needsOverride) {
        setConflicts(data.conflicts || []);
        setError("");
        return;
      }

      if (res.ok && data.success) {
        if (data.email && data.email.sent === false) {
          setEmailProblem(data.email.error || "The confirmation email couldn't be sent.");
        } else {
          onBooked();
        }
      } else {
        setError(data.error || "Failed to create booking");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div role="presentation"
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="booking-title" tabIndex={-1} className="bg-[#192233] w-full max-w-[520px] max-h-[92vh] rounded-xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col modal-content">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="booking-title" className="text-2xl font-bold text-slate-100">
                Manual Room Booking
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Fill in the details to schedule a room
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {emailProblem ? (
          <div className="p-6 flex flex-col gap-5 overflow-y-auto">
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span aria-hidden="true" className="material-symbols-outlined text-emerald-400 text-2xl shrink-0">
                check_circle
              </span>
              <p className="text-sm font-semibold text-emerald-400">
                Booking saved to the schedule.
              </p>
            </div>
            <div role="alert" className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm font-semibold text-amber-400">
                No confirmation email was sent
              </p>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {emailProblem} Use the mail button on this booking to send it
                once the problem is fixed.
              </p>
            </div>
            <button
              onClick={() => onBooked()}
              className="w-full h-11 bg-[#0f49bd] hover:bg-[#0f49bd]/90 rounded-lg font-semibold text-white transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
              {/* Room Selection */}
              <div className="flex flex-col gap-2">
                <label htmlFor="booking-room" className="text-sm font-medium text-slate-300">
                  Room Selection
                </label>
                <select
                  id="booking-room"
                  value={room}
                  onChange={changeSlot(setRoom)}
                  disabled={loading}
                  className={`custom-select ${inputClass}`}
                >
                  <option value="" disabled>
                    Select a room
                  </option>
                  {ROOMS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Professor / Event Name */}
              <div className="flex flex-col gap-2">
                <label htmlFor="booking-event" className="text-sm font-medium text-slate-300">
                  Professor / Event Name
                </label>
                <input
                  id="booking-event"
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  disabled={loading}
                  className={inputClass}
                  placeholder="e.g. Dr. Smith / Strategy Sync"
                />
              </div>

              {/* Full Name + Attendees row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="booking-name" className="text-sm font-medium text-slate-300">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="booking-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    className={inputClass}
                    placeholder="Last, First M.I."
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="booking-attendees" className="text-sm font-medium text-slate-300">
                    No. of Attendees
                  </label>
                  <input
                    id="booking-attendees"
                    type="number"
                    min="1"
                    max={capacity}
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    disabled={loading}
                    aria-describedby="booking-capacity"
                    className={inputClass}
                    placeholder="e.g. 20"
                  />
                  {capacity && (
                    <p id="booking-capacity" className="text-xs text-slate-400">
                      This room holds {capacity} people.
                    </p>
                  )}
                </div>
              </div>

              {/* FEU Email */}
              <div className="flex flex-col gap-2">
                <label htmlFor="booking-email" className="text-sm font-medium text-slate-300">
                  FEU Tech Email Address
                </label>
                <input
                  id="booking-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className={inputClass}
                  placeholder="e.g. jdelacruz@feutech.edu.ph"
                />
              </div>

              {/* Date + Time Pickers: one date, so bookings can't span midnight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="booking-date" className="text-sm font-medium text-slate-300">
                    Date
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    min={today}
                    value={date}
                    onChange={changeSlot(setDate)}
                    disabled={loading}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="booking-start" className="text-sm font-medium text-slate-300">
                    Start Time
                  </label>
                  <input
                    id="booking-start"
                    type="time"
                    step="900"
                    value={start}
                    onChange={changeSlot(setStart)}
                    disabled={loading}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="booking-end" className="text-sm font-medium text-slate-300">
                    End Time
                  </label>
                  <input
                    id="booking-end"
                    type="time"
                    step="900"
                    value={end}
                    onChange={changeSlot(setEnd)}
                    disabled={loading}
                    className={`${inputClass} [color-scheme:dark]`}
                  />
                </div>
              </div>

              {conflicts && (
                <ConflictOverride
                  conflicts={conflicts}
                  override={override}
                  onOverrideChange={setOverride}
                  reason={reason}
                  onReasonChange={setReason}
                  disabled={loading}
                  idPrefix="booking"
                />
              )}

              {/* Error Message */}
              {error && (
                <div role="alert" className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span aria-hidden="true" className="material-symbols-outlined text-red-400 text-lg">
                    error
                  </span>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="p-6 bg-slate-800/30 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 h-11 rounded-lg font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || Boolean(conflicts && !override)}
                className="px-8 h-11 bg-[#0f49bd] hover:bg-[#0f49bd]/90 rounded-lg font-semibold text-white shadow-lg shadow-[#0f49bd]/20 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
                    <span>Booking...</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true" className="material-symbols-outlined text-xl">
                      calendar_add_on
                    </span>
                    <span>{conflicts ? "Book Anyway" : "Book Room"}</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
