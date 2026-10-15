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
    <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <form
        className="surface-panel flex flex-col gap-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(form);
        }}
      >
        <h2 className="text-base font-semibold text-white">Find a time</h2>
        <div>
          <label htmlFor="find-attendees" className="field-label">People attending</label>
          <input
            id="find-attendees"
            type="number"
            min="1"
            value={form.attendees}
            onChange={(e) => setForm({ ...form, attendees: e.target.value })}
            aria-describedby="find-attendees-hint"
            className="field-control"
          />
          <p id="find-attendees-hint" className="mt-1 text-xs text-slate-400">
            {ROOMS.map((r) => `${r.label} fits ${r.capacity}`).join(" · ")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="find-duration" className="field-label">How long</label>
            <select
              id="find-duration"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              className="field-control"
            >
              {DURATIONS.map((m) => (
                <option key={m} value={m}>{formatDuration(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="find-from" className="field-label">From</label>
            <input
              id="find-from"
              type="date"
              min={now.date}
              value={form.fromDate}
              onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
              className="field-control [color-scheme:dark]"
            />
          </div>
        </div>
        <button type="submit" className="primary-action">Show free times</button>
      </form>

      <section className="surface-panel flex flex-col gap-3 p-4" aria-live="polite">
        <h2 className="text-base font-semibold text-white">
          {tooMany
            ? "No room fits that many people"
            : `${options.length} option${options.length === 1 ? "" : "s"} for ${attendees || "any number of"} people, ${formatDuration(Number(query.duration))}`}
        </h2>
        {tooMany && (
          <p className="text-sm text-slate-300">
            The largest room holds {MAX_CAPACITY}. Split the group, or contact iCARE about other venues.
          </p>
        )}
        {!tooMany && options.length === 0 && (
          <p className="text-sm text-slate-300">Nothing free in the next 7 days. Try a shorter time or a later date.</p>
        )}
        <ul className="flex flex-col gap-2">
          {options.map((o) => (
            <li
              key={`${o.room.value}-${o.date}-${o.start}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-white">
                  {o.room.label} · {dayName(o.date)}
                </p>
                <p className="text-xs text-slate-300">
                  {formatRange(o.start, o.end)} · fits {o.room.capacity}
                </p>
              </div>
              <button
                type="button"
                disabled={!canAct}
                onClick={() => onPick(o)}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdmin ? "Book" : "Request"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
