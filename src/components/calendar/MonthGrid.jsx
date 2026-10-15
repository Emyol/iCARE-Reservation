"use client";

import { motion } from "framer-motion";
import { ROOMS } from "@/lib/rooms";
import { addDays, bookingsOn, formatCompactRange, inRoom, layoutLanes, startOfWeek } from "@/lib/availability";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Rooms differ by shape as well as colour, so the legend works without colour.
export const ROOM_MARK = {
  [ROOMS[0].value]: { short: "AVR", mark: "rounded-full bg-[var(--lg-booked)]" },
  [ROOMS[1].value]: { short: "Training", mark: "rounded-[3px] bg-[var(--lg-attention)]" },
};
const markFor = (room) => ROOM_MARK[(room || "").trim()] || { short: room, mark: "rounded-full bg-[var(--lg-ink-muted)]" };

const longDay = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

/** The day's bookings in time order, each flagged if it overlaps another in its room. */
export function dayBookings(reservations, date) {
  const all = bookingsOn(reservations, date);
  const rooms = [...new Set(all.map((b) => (b.room || "").trim()))];
  return rooms
    .flatMap((room) => layoutLanes(inRoom(all, room)).items)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Month view on Sheet glass, Monday first like the week view. Every cell is a
 * button that selects its day; on wide screens the first two bookings show as
 * chips you can open directly.
 */
export default function MonthGrid({ reservations, month, today, selected, showNames, onSelect, onOpenBooking }) {
  const first = `${month}-01`;
  const days = [];
  for (let d = startOfWeek(first); days.length < 42; d = addDays(d, 1)) {
    if (days.length % 7 === 0 && days.length >= 28 && d.slice(0, 7) !== month) break;
    days.push(d);
  }

  return (
    <div className="lg-sheet overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[var(--lg-line)]" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w} className="lg-label py-3 text-center">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const items = dayBookings(reservations, d);
          const inMonth = d.slice(0, 7) === month;
          const isSelected = d === selected;
          const isToday = d === today;
          const conflict = items.some((b) => b.conflict);
          return (
            <div
              key={d}
              className={`relative flex min-h-16 flex-col gap-1 p-1.5 lg:min-h-28 lg:p-2 ${i % 7 ? "border-l" : ""} ${
                i >= 7 ? "border-t" : ""
              } border-[var(--lg-line)] ${inMonth ? "" : "bg-[var(--lg-line)]/40"}`}
            >
              {/* The whole cell selects the day; chips sit above it. */}
              <button
                type="button"
                onClick={() => onSelect(d)}
                aria-pressed={isSelected}
                aria-label={`${longDay(d)}${isToday ? ", today" : ""}: ${
                  items.length ? `${items.length} booking${items.length === 1 ? "" : "s"}${conflict ? ", has a conflict" : ""}` : "no bookings"
                }`}
                className="lg-press absolute inset-0 rounded-none hover:bg-[var(--lg-sheet-fill)]"
              />
              <span className="pointer-events-none relative flex items-center justify-between">
                <span
                  className={`relative isolate flex size-8 items-center justify-center rounded-full text-[14px] font-semibold lg-num ${
                    isSelected ? "text-[var(--lg-action-ink)]" : isToday ? "text-[var(--lg-action)]" : inMonth ? "" : "lg-muted"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="calendar-selected-day"
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-full bg-[var(--lg-action)]"
                      transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                    />
                  )}
                  {Number(d.slice(8))}
                </span>
                {isToday && <span className="hidden text-[12px] font-bold text-[var(--lg-action)] lg:inline">Today</span>}
              </span>

              {/* Phones: one mark per booking. */}
              <span className="pointer-events-none relative flex flex-wrap gap-1 px-1 lg:hidden" aria-hidden="true">
                {items.slice(0, 6).map((b, j) => (
                  <span key={j} className={`size-2 ${markFor(b.room).mark} ${b.conflict ? "ring-2 ring-[var(--lg-danger)]" : ""}`} />
                ))}
              </span>

              {/* Wide screens: the first two bookings as chips. Only the chips take
                  clicks; the space around them still selects the day. */}
              <span className="pointer-events-none relative hidden flex-col gap-1 lg:flex">
                {items.slice(0, 2).map((b, j) => (
                  <button
                    key={`${b.rowIndex ?? b.startTime}-${j}`}
                    type="button"
                    onClick={() => onOpenBooking(b)}
                    aria-label={`${b.eventName}, ${markFor(b.room).short}, ${formatCompactRange(b.start, b.end)}${b.conflict ? ", overlaps another booking" : ""}`}
                    className={`lg-press pointer-events-auto flex w-full items-center gap-1.5 rounded-[10px] border px-1.5 py-1 text-left text-[12px] leading-tight ${
                      b.conflict
                        ? "border-[var(--lg-danger)] bg-[var(--lg-danger-soft)]"
                        : "border-[var(--lg-rim)] bg-[var(--lg-pass-fill)] hover:bg-[var(--lg-sheet-fill)]"
                    }`}
                  >
                    <span aria-hidden="true" className={`size-2 shrink-0 ${markFor(b.room).mark}`} />
                    <span className="min-w-0 truncate">
                      <span className="font-semibold lg-num">{formatCompactRange(b.start, b.end)}</span>
                      {/* The public only ever sees "Reserved", so the time is the useful part. */}
                      {showNames && ` ${b.eventName}`}
                    </span>
                  </button>
                ))}
                {items.length > 2 && (
                  <span className="px-1.5 text-[12px] font-semibold lg-muted">+{items.length - 2} more</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
