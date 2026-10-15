"use client";

import { ROOMS } from "@/lib/rooms";
import { addDays, daySummary, formatDuration } from "@/lib/availability";

const dayName = (date, opts) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

/** Seven days × rooms. Each cell opens that day. */
export default function WeekGrid({ reservations, weekStart, now, onOpenDay }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="surface-panel overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-collapse text-left">
        <caption className="sr-only">Bookings and free time per room for the week</caption>
        <thead>
          <tr>
            <th scope="col" className="w-36 border-b border-white/10 p-3 text-xs font-semibold text-slate-400">
              Room
            </th>
            {days.map((d) => (
              <th
                key={d}
                scope="col"
                className={`border-b border-l border-white/10 p-3 text-xs font-semibold ${d === now.date ? "text-teal-300" : "text-slate-300"}`}
              >
                {dayName(d, { weekday: "short", day: "numeric", month: "short" })}
                {d === now.date && <span className="block font-normal">Today</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROOMS.map((room) => (
            <tr key={room.value}>
              <th scope="row" className="border-b border-white/10 p-3 align-top">
                <span className="block text-sm font-semibold text-white">{room.label}</span>
                <span className="text-xs font-normal text-slate-400">{room.capacity} people</span>
              </th>
              {days.map((d) => {
                const s = daySummary(reservations, d, room.value, now);
                const past = d < now.date;
                return (
                  <td key={d} className="border-b border-l border-white/10 p-1 align-top">
                    <button
                      type="button"
                      onClick={() => onOpenDay(d)}
                      aria-label={`${room.label}, ${dayName(d, { weekday: "long", day: "numeric", month: "long" })}: ${s.count} booked${past ? "" : `, longest free ${formatDuration(s.longestFree)}`}${s.conflict ? ", has a conflict" : ""}`}
                      className={`flex min-h-16 w-full flex-col items-start gap-1 rounded-md p-2 text-left hover:bg-white/5 ${past ? "opacity-60" : ""}`}
                    >
                      <span className="text-sm font-semibold text-white">{s.count} booked</span>
                      {!past && (
                        <span className="text-xs text-emerald-300">
                          {s.longestFree ? `Free up to ${formatDuration(s.longestFree)}` : "Fully booked"}
                        </span>
                      )}
                      {s.conflict && (
                        <span className="rounded bg-red-600 px-1 text-xs font-bold uppercase tracking-wide text-white">
                          Conflict
                        </span>
                      )}
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
