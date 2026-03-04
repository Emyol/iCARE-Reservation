"use client";

import { useState } from "react";

const ROOM_OPTIONS = [
  {
    value: "Audio-Visual Room / Enhancement Area (Capacity: 40)",
    label: "Audio-Visual Room / Enhancement Area (Capacity: 40)",
  },
  {
    value: "Individual Training / Small Group Discussion Room (Capacity: 10)",
    label: "Individual Training / Small Group Discussion Room (Capacity: 10)",
  },
];

/**
 * Manual Booking Modal
 * Sends POST /api/reservations with room, eventName, startTime, endTime.
 * On success, calls onBooked() to refresh data.
 */
export default function BookingModal({ onClose, onBooked }) {
  const [room, setRoom] = useState("");
  const [eventName, setEventName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [attendees, setAttendees] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!room) return "Please select a room";
    if (!eventName.trim()) return "Please enter an event/professor name";
    if (!fullName.trim()) return "Please enter the booker's full name";
    if (!startTime) return "Please select a start time";
    if (!endTime) return "Please select an end time";

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) return "End time must be after start time";

    const durationHours = (end - start) / (1000 * 60 * 60);
    if (durationHours > 4) return "Duration cannot exceed 4 hours";

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
          startTime,
          endTime,
          fullName: fullName.trim(),
          email: email.trim(),
          attendees: attendees.trim(),
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }

      if (res.ok && data.success) {
        onBooked();
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
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#192233] w-full max-w-[520px] rounded-xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col modal-content">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">
                Manual Room Booking
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Fill in the details to schedule a room
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Room Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">
              Room Selection
            </label>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              disabled={loading}
              className="custom-select w-full h-12 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-slate-100 focus:ring-2 focus:ring-[#0f49bd]/50 focus:border-[#0f49bd] outline-none transition-all"
            >
              <option value="" disabled>
                Select a room
              </option>
              {ROOM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Professor / Event Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">
              Professor / Event Name
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              disabled={loading}
              className="w-full h-12 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-[#0f49bd]/50 focus:border-[#0f49bd] outline-none transition-all"
              placeholder="e.g. Dr. Smith / Strategy Sync"
            />
          </div>

          {/* Full Name + Attendees row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className="w-full h-12 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-[#0f49bd]/50 focus:border-[#0f49bd] outline-none transition-all"
                placeholder="Last, First M.I."
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                No. of Attendees
              </label>
              <input
                type="number"
                min="1"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                disabled={loading}
                className="w-full h-12 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-[#0f49bd]/50 focus:border-[#0f49bd] outline-none transition-all"
                placeholder="e.g. 20"
              />
            </div>
          </div>

          {/* FEU Email */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">
              FEU Tech Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full h-12 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-[#0f49bd]/50 focus:border-[#0f49bd] outline-none transition-all"
              placeholder="e.g. jdelacruz@feutech.edu.ph"
            />
          </div>

          {/* Time Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                Start Time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                  className="w-full h-12 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-slate-100 focus:ring-2 focus:ring-[#0f49bd]/50 focus:border-[#0f49bd] outline-none transition-all [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                End Time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading}
                  className="w-full h-12 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-slate-100 focus:ring-2 focus:ring-[#0f49bd]/50 focus:border-[#0f49bd] outline-none transition-all [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-2 p-4 bg-[#0f49bd]/10 border border-[#0f49bd]/20 rounded-lg flex gap-3 items-start">
            <span className="material-symbols-outlined text-[#0f49bd] shrink-0">
              info
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Booking this room will automatically update the schedule
              dashboard. Please ensure the duration does not exceed 4 hours.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="material-symbols-outlined text-red-400 text-lg">
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
            disabled={loading}
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
                <span className="material-symbols-outlined text-xl">
                  calendar_add_on
                </span>
                <span>Book Room</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
