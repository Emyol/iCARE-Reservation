"use client";

import { useState } from "react";
import { ROOMS } from "@/lib/rooms";
import { findOptions, formatDuration, formatRange } from "@/lib/availability";

const DURATIONS = [30, 60, 90, 120, 180, 240];
const MAX_CAPACITY = Math.max(...ROOMS.map((r) => r.capacity));

const dayName = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });

/** "Find a time": rooms that fit the group, earliest free times first. */
export default function FindTime({ reservations, now, canAct, isAdmin, onPick }) {
  const [form, setForm] = useState({ attendees: "10", duration: 60, fromDate: now.date });
  const [query, setQuery] = useState(form);

  const attendees = Number(query.attendees) || 0;
  const tooMany = attendees > MAX_CAPACITY;
  const options = tooMany
    ? []
    : findOptions(reservations, {
        attendees,
        duration: Number(query.duration),
        fromDate: query.fromDate < now.date ? now.date : query.fromDate,
        now,
      });

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <form
        className="lg-sheet flex flex-col gap-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(form);
        }}
      >
        <h2 className="lg-title">Find a time</h2>
        <div className="lg-field">
          <label htmlFor="find-attendees">People attending</label>
          <input
            id="find-attendees"
            type="number"
            min="1"
            value={form.attendees}
            onChange={(e) => setForm({ ...form, attendees: e.target.value })}
            aria-describedby="find-attendees-hint"
            className="lg-input"
          />
          <p id="find-attendees-hint" className="mt-1.5 text-[13px] lg-muted">
            {ROOMS.map((r) => `${r.label} fits ${r.capacity}`).join(". ")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="lg-field">
            <label htmlFor="find-duration">How long</label>
            <select
              id="find-duration"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              className="lg-input"
            >
              {DURATIONS.map((m) => (
                <option key={m} value={m}>{formatDuration(m)}</option>
              ))}
            </select>
          </div>
          <div className="lg-field">
            <label htmlFor="find-from">From</label>
            <input
              id="find-from"
              type="date"
              min={now.date}
              value={form.fromDate}
              onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
              className="lg-input"
            />
          </div>
        </div>
        <button type="submit" className="lg-btn lg-btn-primary">Show free times</button>
      </form>

      <section className="lg-sheet flex flex-col gap-3 p-6" aria-live="polite">
        <h2 className="lg-title">
          {tooMany
            ? "No room fits that many people"
            : `${options.length} option${options.length === 1 ? "" : "s"} for ${attendees || "any number of"} people, ${formatDuration(Number(query.duration))}`}
        </h2>
        {tooMany && (
          <p className="lg-muted">
            The largest room holds {MAX_CAPACITY}. Split the group, or contact iCARE about other venues.
          </p>
        )}
        {!tooMany && options.length === 0 && (
          <p className="lg-muted">Nothing free in the next 7 days. Try a shorter time or a later date.</p>
        )}
        <ul className="flex flex-col gap-2">
          {options.map((o) => (
            <li
              key={`${o.room.value}-${o.date}-${o.start}`}
              className="lg-pass flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-[15px] font-bold">
                  {o.room.label}, {dayName(o.date)}
                </p>
                <p className="text-[13px] lg-muted lg-num">
                  {formatRange(o.start, o.end)}. Fits {o.room.capacity}.
                </p>
              </div>
              <button type="button" disabled={!canAct} onClick={() => onPick(o)} className="lg-btn lg-btn-primary min-h-10">
                {isAdmin ? "Book" : "Request"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
