"use client";

import { ROOMS } from "@/lib/rooms";
import { addDays, daySummary, formatDuration } from "@/lib/availability";

const dayName = (date, opts) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

/** Seven days × rooms on Sheet glass. Each cell opens that day. */
export default function WeekGrid({ reservations, weekStart, now, onOpenDay }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="lg-sheet overflow-x-auto p-2">
      <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
        <caption className="sr-only">Bookings and free time per room for the week</caption>
        <thead>
          <tr>
            <th scope="col" className="w-40 p-3 lg-label">Room</th>
            {days.map((d) => (
              <th key={d} scope="col" className="p-3 text-[14px] font-semibold">
                <span className={d === now.date ? "text-[var(--lg-action)]" : ""}>
                  {dayName(d, { weekday: "short", day: "numeric", month: "short" })}
                </span>
                {d === now.date && <span className="block text-[12px] font-bold text-[var(--lg-action)]">Today</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROOMS.map((room) => (
            <tr key={room.value} className="border-t border-[var(--lg-line)]">
              <th scope="row" className="p-3 align-top">
                <span className="block text-[15px] font-bold">{room.label}</span>
                <span className="text-[13px] font-normal lg-muted">{room.capacity} people</span>
              </th>
              {days.map((d) => {
                const s = daySummary(reservations, d, room.value, now);
                const past = d < now.date;
                return (
                  <td key={d} className="p-1.5 align-top">
                    <button
                      type="button"
                      onClick={() => onOpenDay(d)}
                      aria-label={`${room.label}, ${dayName(d, { weekday: "long", day: "numeric", month: "long" })}: ${s.count} booked${past ? "" : `, longest free ${formatDuration(s.longestFree)}`}${s.conflict ? ", has a conflict" : ""}`}
                      className={`flex min-h-20 w-full flex-col items-start gap-1 rounded-[14px] border border-[var(--lg-rim)] bg-[var(--lg-pass-fill)] p-2.5 text-left hover:bg-[var(--lg-sheet-fill)] ${past ? "opacity-55" : ""}`}
                    >
                      <span className="text-[15px] font-bold lg-num">{s.count} booked</span>
                      {!past && (
                        <span className="text-[13px] font-semibold text-[var(--lg-free)]">
                          {s.longestFree ? `Free up to ${formatDuration(s.longestFree)}` : "Fully booked"}
                        </span>
                      )}
                      {s.conflict && <span className="lg-pill lg-pill-conflict">Conflict</span>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
