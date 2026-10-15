"use client";

import { useState } from "react";
import { ROOMS } from "@/lib/rooms";
import { manilaNow, validateReservation } from "@/lib/reservationRules";
import ConflictOverride from "@/components/ConflictOverride";
import { X } from "lucide-react";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";

const inputClass = "lg-input min-h-12";

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
      className="lg-tokens lg-scrim fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="booking-title" tabIndex={-1} className="lg-sheet lg-materialize flex max-h-[92vh] w-full max-w-[540px] flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pb-2 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="booking-title" className="lg-title">
                Manual Room Booking
              </h2>
              <p className="mt-1 text-[15px] lg-muted">
                Fill in the details to schedule a room
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="lg-btn lg-btn-secondary lg-btn-icon"
            >
              <X aria-hidden="true" className="size-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {emailProblem ? (
          <div className="p-6 flex flex-col gap-5 overflow-y-auto">
            <div className="flex items-center gap-3 rounded-[14px] border border-[var(--lg-free)] bg-[var(--lg-free-soft)] p-4">
              <p className="font-semibold">
                Booking saved to the schedule.
              </p>
            </div>
            <div role="alert" className="rounded-[14px] border border-[var(--lg-attention)] bg-[var(--lg-attention-soft)] p-4">
              <p className="font-semibold">
                No confirmation email was sent
              </p>
              <p className="mt-1 text-[14px]">
                {emailProblem} Use the mail button on this booking to send it
                once the problem is fixed.
              </p>
            </div>
            <button
              onClick={() => onBooked()}
              className="lg-btn lg-btn-primary w-full"
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
                <label htmlFor="booking-room" className="text-[13px] font-semibold">
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
                <label htmlFor="booking-event" className="text-[13px] font-semibold">
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
                  <label htmlFor="booking-name" className="text-[13px] font-semibold">
                    Full Name <span className="text-[var(--lg-danger)]">*</span>
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
                  <label htmlFor="booking-attendees" className="text-[13px] font-semibold">
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
                    <p id="booking-capacity" className="text-[13px] lg-muted">
                      This room holds {capacity} people.
                    </p>
                  )}
                </div>
              </div>

              {/* FEU Email */}
              <div className="flex flex-col gap-2">
                <label htmlFor="booking-email" className="text-[13px] font-semibold">
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
                  <label htmlFor="booking-date" className="text-[13px] font-semibold">
                    Date
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    min={today}
                    value={date}
                    onChange={changeSlot(setDate)}
                    disabled={loading}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="booking-start" className="text-[13px] font-semibold">
                    Start Time
                  </label>
                  <input
                    id="booking-start"
                    type="time"
                    step="900"
                    value={start}
                    onChange={changeSlot(setStart)}
                    disabled={loading}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="booking-end" className="text-[13px] font-semibold">
                    End Time
                  </label>
                  <input
                    id="booking-end"
                    type="time"
                    step="900"
                    value={end}
                    onChange={changeSlot(setEnd)}
                    disabled={loading}
                    className={inputClass}
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
                <p role="alert" className="rounded-[14px] border border-[var(--lg-danger)] bg-[var(--lg-danger-soft)] px-4 py-3 text-[14px] font-medium">
                  {error}
                </p>
              )}
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="lg-btn lg-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || Boolean(conflicts && !override)}
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
                    <span>Booking...</span>
                  </>
                ) : (
                  <>
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
