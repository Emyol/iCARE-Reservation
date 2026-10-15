"use client";

import {
  formatClock,
  formatRange,
  freeGaps,
  inRoom,
  layoutLanes,
} from "@/lib/availability";

const LANE_HEIGHT = 56;

const pct = (minutes, hours) => ((minutes - hours.start) / (hours.end - hours.start)) * 100;
const span = (start, end, hours) => ({
  left: `calc(${pct(start, hours)}% + 2px)`,
  width: `calc(${pct(end, hours) - pct(start, hours)}% - 4px)`,
});

/**
 * One row per room across the day's hours. Overlapping bookings stack in
 * lanes so both stay visible; free stretches are buttons that start a
 * request (public) or a booking (admin).
 */
export default function DayGrid({ rooms, bookings, hours, now, notBefore, canAct, isAdmin, onSelectGap, onSelectBooking }) {
  const ticks = [];
  for (let m = hours.start; m < hours.end; m += 60) ticks.push(m);
  const showNow = now !== null && now >= hours.start && now <= hours.end;
  const gapVerb = isAdmin ? "Book" : "Request";

  return (
    <div className="surface-panel overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Hour ruler */}
        <div className="grid grid-cols-[150px_minmax(0,1fr)] border-b border-white/10" aria-hidden="true">
          <div className="border-r border-white/10" />
          <div className="relative h-8">
            {ticks.map((m) => (
              <span
                key={m}
                className="absolute top-0 bottom-0 border-l border-white/10 pl-1 pt-2 text-xs text-slate-400 whitespace-nowrap"
                style={{ left: `${pct(m, hours)}%` }}
              >
                {formatClock(m).replace(":00", "")}
              </span>
            ))}
            {showNow && (
              <span
                className="absolute top-1 -translate-x-1/2 rounded bg-teal-400 px-1.5 text-xs font-bold text-slate-950"
                style={{ left: `${pct(now, hours)}%` }}
              >
                {formatClock(now)}
              </span>
            )}
          </div>
        </div>

        {rooms.map((room) => {
          const { items, laneCount } = layoutLanes(inRoom(bookings, room.value));
          const gaps = freeGaps(items, hours, { notBefore });
          const height = laneCount * LANE_HEIGHT + 16;
          return (
            <div
              key={room.value}
              role="group"
              aria-label={room.label}
              className="grid grid-cols-[150px_minmax(0,1fr)] border-b border-white/10 last:border-b-0"
            >
              <div className="flex flex-col justify-center gap-0.5 border-r border-white/10 px-3 py-2">
                <span className="text-sm font-semibold text-white">{room.label}</span>
                {room.capacity && <span className="text-xs text-slate-400">{room.capacity} people</span>}
              </div>
              <div
                className="relative"
                style={{
                  height,
                  backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px)",
                  backgroundSize: `calc(100% / ${(hours.end - hours.start) / 60}) 100%`,
                }}
              >
                {gaps.map((gap) => (
                  <button
                    key={`gap-${gap.start}`}
                    type="button"
                    disabled={!canAct}
                    onClick={() => onSelectGap(room, gap)}
                    aria-label={`${room.label}, free ${formatRange(gap.start, gap.end)}${canAct ? `. ${gapVerb} this time` : ""}`}
                    className="absolute top-2 flex items-center justify-center overflow-hidden whitespace-nowrap rounded-md border border-dashed border-emerald-400/70 px-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ ...span(gap.start, gap.end, hours), height: height - 16 }}
                  >
                    Free {formatRange(gap.start, gap.end)}
                  </button>
                ))}
                {items.map((b, i) => (
                  <button
                    key={`${b.rowIndex ?? b.startTime}-${i}`}
                    type="button"
                    onClick={() => onSelectBooking(b)}
                    aria-label={`${b.eventName}, ${room.label}, ${formatRange(b.start, b.end)}${b.conflict ? ", overlaps another booking" : ""}`}
                    className={`absolute z-10 flex flex-col items-start gap-0.5 overflow-hidden rounded-md border border-l-4 px-2 py-1.5 text-left ${
                      b.conflict
                        ? "border-red-400 bg-red-500/15 hover:bg-red-500/25"
                        : "border-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/30"
                    }`}
                    style={{ ...span(b.start, b.end, hours), top: 8 + b.lane * LANE_HEIGHT, height: LANE_HEIGHT - 8 }}
                  >
                    <span className="block w-full truncate text-xs font-semibold text-white">{b.eventName}</span>
                    <span className="block w-full truncate text-xs text-slate-200">{formatRange(b.start, b.end)}</span>
                    {b.conflict && (
                      <span className="rounded bg-red-600 px-1 text-xs font-bold uppercase tracking-wide text-white">
                        Conflict
                      </span>
                    )}
                  </button>
                ))}
                {showNow && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 bg-black/30"
                      style={{ width: `${pct(now, hours)}%` }}
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-teal-400"
                      style={{ left: `${pct(now, hours)}%` }}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
