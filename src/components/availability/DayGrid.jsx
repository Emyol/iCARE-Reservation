"use client";

import {
  formatClock,
  formatCompactRange,
  formatRange,
  freeGaps,
  inRoom,
  layoutLanes,
} from "@/lib/availability";

const LANE_HEIGHT = 64;

const pct = (minutes, hours) => ((minutes - hours.start) / (hours.end - hours.start)) * 100;
const span = (start, end, hours) => ({
  left: `calc(${pct(start, hours)}% + 3px)`,
  width: `calc(${pct(end, hours) - pct(start, hours)}% - 6px)`,
});

function blockTone(b) {
  if (b.conflict) return "bg-[var(--lg-danger-soft)] border-[var(--lg-danger)]";
  if (b.status === "pending") {
    return "border-[var(--lg-attention)] bg-[repeating-linear-gradient(135deg,var(--lg-attention-soft)_0_6px,transparent_6px_12px)]";
  }
  return "bg-[var(--lg-pass-fill)] border-[var(--lg-rim)] shadow-[var(--lg-shadow-soft)]";
}

/**
 * One row per room across the day's hours, on Sheet glass. Overlapping
 * bookings stack in lanes so both stay visible; free stretches are dashed
 * buttons that start a request (public) or a booking (staff).
 */
export default function DayGrid({ rooms, bookings, hours, now, notBefore, canAct, isAdmin, onSelectGap, onSelectBooking }) {
  const ticks = [];
  for (let m = hours.start; m <= hours.end; m += 60) ticks.push(m);
  const showNow = now !== null && now >= hours.start && now <= hours.end;
  const gapVerb = isAdmin ? "Book" : "Request";

  return (
    <div className="lg-sheet overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Hour ruler */}
        <div className="grid grid-cols-[180px_minmax(0,1fr)] border-b border-[var(--lg-line)]" aria-hidden="true">
          <div />
          <div className="relative mr-6 h-14">
            {ticks.map((m) => (
              <span
                key={m}
                className="absolute bottom-3 -translate-x-1/2 whitespace-nowrap text-[13px] font-medium lg-muted"
                style={{ left: `${pct(m, hours)}%` }}
              >
                {formatClock(m).replace(":00", "")}
              </span>
            ))}
            {showNow && (
              <span
                className="absolute top-1.5 -translate-x-1/2 text-[13px] font-bold text-[var(--lg-action)] lg-num"
                style={{ left: `${pct(now, hours)}%` }}
              >
                {formatClock(now).replace(/ (AM|PM)$/, "")}
              </span>
            )}
          </div>
        </div>

        {rooms.map((room) => {
          const { items, laneCount } = layoutLanes(inRoom(bookings, room.value));
          const gaps = freeGaps(items, hours, { notBefore });
          const height = laneCount * LANE_HEIGHT + 24;
          return (
            <div
              key={room.value}
              role="group"
              aria-label={room.label}
              className="grid grid-cols-[180px_minmax(0,1fr)] border-b border-[var(--lg-line)] last:border-b-0"
            >
              <div className="flex flex-col justify-center gap-0.5 px-6 py-3">
                <span className="text-[17px] font-bold leading-snug">{room.label}</span>
                {room.capacity && <span className="text-[13px] lg-muted">{room.capacity} people</span>}
              </div>
              <div
                className="relative mr-6"
                style={{
                  height,
                  backgroundImage: "linear-gradient(to right, var(--lg-line) 1px, transparent 1px)",
                  backgroundSize: `calc(100% / ${(hours.end - hours.start) / 60}) 100%`,
                }}
              >
                {showNow && (
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 bg-[var(--lg-line)] opacity-60"
                    style={{ width: `${pct(now, hours)}%` }}
                  />
                )}
                {gaps.map((gap) => (
                  <button
                    key={`gap-${gap.start}`}
                    type="button"
                    disabled={!canAct}
                    onClick={() => onSelectGap(room, gap)}
                    aria-label={`${room.label}, free ${formatRange(gap.start, gap.end)}${canAct ? `. ${gapVerb} this time` : ""}`}
                    className="absolute top-3 flex flex-col items-start justify-center overflow-hidden rounded-[14px] border-2 border-dashed border-[var(--lg-free)] bg-[var(--lg-free-soft)] px-3 text-left text-[var(--lg-ink)] hover:bg-[var(--lg-sheet-fill)] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ ...span(gap.start, gap.end, hours), height: LANE_HEIGHT - 12 }}
                  >
                    <span className="text-[14px] font-bold text-[var(--lg-free)]">Free</span>
                    <span className="whitespace-nowrap text-[13px] lg-num">
                      {gap.end - gap.start <= 90 ? formatCompactRange(gap.start, gap.end) : formatRange(gap.start, gap.end)}
                    </span>
                  </button>
                ))}
                {items.map((b, i) => (
                  <button
                    key={`${b.rowIndex ?? b.startTime}-${i}`}
                    type="button"
                    onClick={() => onSelectBooking(b)}
                    aria-label={`${b.eventName}, ${room.label}, ${formatRange(b.start, b.end)}${b.status === "pending" ? ", pending" : ""}${b.conflict ? ", overlaps another booking" : ""}`}
                    className={`absolute z-10 flex flex-col items-start justify-center gap-0.5 overflow-hidden rounded-[14px] border px-3 text-left ${blockTone(b)}`}
                    style={{ ...span(b.start, b.end, hours), top: 12 + b.lane * LANE_HEIGHT, height: LANE_HEIGHT - 12 }}
                  >
                    <span className="flex w-full items-center gap-2">
                      {/* A short overlapping block has no room for both; the word wins, the name stays in the label. */}
                      {!(b.conflict && b.end - b.start <= 90) && (
                        <span className="truncate text-[14px] font-bold">{b.eventName}</span>
                      )}
                      {b.conflict && <span className="lg-pill lg-pill-conflict shrink-0">Conflict</span>}
                    </span>
                    <span className="w-full truncate text-[13px] lg-num">
                      {b.end - b.start <= 90 ? formatCompactRange(b.start, b.end) : formatRange(b.start, b.end)}
                    </span>
                  </button>
                ))}
                {showNow && (
                  <div
                    className="pointer-events-none absolute inset-y-0 z-20 border-l-2 border-[var(--lg-action)]"
                    style={{ left: `${pct(now, hours)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
