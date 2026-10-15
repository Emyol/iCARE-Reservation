"use client";

import { useMemo, useState } from "react";
import { ROOMS } from "@/lib/rooms";
import { requestFormUrl } from "@/lib/requestForm";

export const ROOM_OPTIONS = ROOMS;

function localDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** dataStatus: "loading" | "ready" | "error". Only "ready" data can show a room as free. */
export default function AvailabilityChecker({ reservations = [], dataStatus = "ready", onContinue, compact = false }) {
  const dataAvailable = dataStatus === "ready";
  const [room, setRoom] = useState(ROOM_OPTIONS[0].value);
  const [date, setDate] = useState(localDate);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [checked, setChecked] = useState(false);
  const [validationError, setValidationError] = useState("");

  const range = useMemo(() => {
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    return { start, end, valid: end > start };
  }, [date, startTime, endTime]);

  const conflicts = useMemo(() => {
    if (!checked || !range.valid) return [];
    return reservations.filter((reservation) => {
      if (reservation.room !== room) return false;
      const start = new Date(reservation.startTime);
      const end = new Date(reservation.endTime);
      return range.start < end && range.end > start;
    });
  }, [checked, range, reservations, room]);

  const available = checked && dataAvailable && range.valid && conflicts.length === 0;
  const selectedRoom = ROOM_OPTIONS.find((option) => option.value === room);
  const requestUrl = requestFormUrl({ room, date, start: startTime, end: endTime });

  function resetCheck() {
    setChecked(false);
    setValidationError("");
  }

  function handleCheck() {
    if (!dataAvailable) {
      setValidationError("Availability cannot be verified while reservation data is unavailable.");
      return;
    }
    if (!range.valid) {
      setValidationError("End time must be later than start time.");
      setChecked(false);
      return;
    }
    setValidationError("");
    setChecked(true);
  }

  function handleContinue() {
    onContinue?.({ room, startTime: `${date}T${startTime}`, endTime: `${date}T${endTime}`, capacity: selectedRoom?.capacity });
  }

  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <section className={compact ? "space-y-5" : "surface-panel overflow-hidden"}>
      {!compact && (
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-300" aria-hidden="true">event_available</span>
          <h2 className="text-base font-semibold text-slate-100">Check room availability</h2>
        </div>
      )}

      <div className={compact ? "space-y-5" : "p-4 space-y-4"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="availability-room" className="field-label">Room</label>
            <select id="availability-room" value={room} onChange={(event) => { setRoom(event.target.value); resetCheck(); }} className="field-control">
              {ROOM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.capacity} people</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="availability-date" className="field-label">Date</label>
            <input id="availability-date" type="date" min={localDate()} value={date} onChange={(event) => { setDate(event.target.value); resetCheck(); }} className="field-control [color-scheme:dark]" />
          </div>
          <div>
            <label htmlFor="availability-start" className="field-label">Start time</label>
            <input id="availability-start" type="time" value={startTime} onChange={(event) => { setStartTime(event.target.value); resetCheck(); }} className="field-control [color-scheme:dark]" />
          </div>
          <div>
            <label htmlFor="availability-end" className="field-label">End time</label>
            <input id="availability-end" type="time" value={endTime} onChange={(event) => { setEndTime(event.target.value); resetCheck(); }} className="field-control [color-scheme:dark]" />
          </div>
        </div>

        <button type="button" onClick={handleCheck} disabled={dataStatus === "loading"} className="primary-action w-full">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          {dataStatus === "loading" ? "Loading the schedule…" : "Check this time"}
        </button>

        {dataStatus === "error" && (
          <div className="status-message status-message-warning" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">cloud_off</span>
            <div><p className="font-semibold">Live schedule unavailable</p><p>Booking is paused until conflicts can be checked safely.</p></div>
          </div>
        )}

        {validationError && <p className="status-message status-message-error" role="alert">{validationError}</p>}

        {checked && dataAvailable && (
          <div className={`status-message ${available ? "status-message-success" : "status-message-error"}`} role="status" aria-live="polite">
            <span className="material-symbols-outlined" aria-hidden="true">{available ? "check_circle" : "event_busy"}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{available ? "Available — no overlap found" : `${conflicts.length} conflicting reservation${conflicts.length === 1 ? "" : "s"}`}</p>
              {available ? <p>{selectedRoom?.label} can be requested for this time.</p> : (
                <ul className="mt-2 space-y-2">
                  {conflicts.map((conflict, index) => (
                    <li key={`${conflict.rowIndex || conflict.eventName}-${index}`} className="text-sm">
                      <span className="font-medium break-words">{conflict.eventName}</span>{` · ${formatTime(conflict.startTime)}–${formatTime(conflict.endTime)}`}{index === 0 && conflict.timestamp ? " · submitted first" : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {available && !onContinue && requestUrl && (
          <a href={requestUrl} target="_blank" rel="noopener noreferrer" className="primary-action w-full">
            Request this slot
            <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>
          </a>
        )}

        {available && onContinue && (
          <button type="button" onClick={handleContinue} className="primary-action w-full">Continue with this room<span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></button>
        )}
      </div>
    </section>
  );
}
