"use client";

import { formatDuration, formatRange, freeGaps, inRoom, layoutLanes } from "@/lib/availability";

/** Phone layout of the day view: a time-ordered list per room, free time included. */
export default function DayAgenda({ rooms, bookings, hours, notBefore, canAct, isAdmin, onSelectGap, onSelectBooking }) {
  return (
    <div className="flex flex-col gap-4">
      {rooms.map((room) => {
        const { items } = layoutLanes(inRoom(bookings, room.value));
        const gaps = freeGaps(items, hours, { notBefore });
        const rows = [
          ...items.map((b) => ({ kind: "booking", start: b.start, b })),
          ...gaps.map((g) => ({ kind: "gap", start: g.start, g })),
        ].sort((a, b) => a.start - b.start);

        return (
          <section key={room.value} aria-label={room.label} className="lg-sheet flex flex-col gap-2 p-4">
            <h3 className="flex items-baseline gap-2 text-[17px] font-bold">
              {room.label}
              {room.capacity && <span className="text-[13px] font-normal lg-muted">{room.capacity} people</span>}
            </h3>
            {rows.length === 0 && <p className="text-[15px] lg-muted">No free time left today.</p>}
            {rows.map((row) =>
              row.kind === "gap" ? (
                <button
                  key={`gap-${row.g.start}`}
                  type="button"
                  disabled={!canAct}
                  onClick={() => onSelectGap(room, row.g)}
                  className="grid min-h-14 grid-cols-[108px_minmax(0,1fr)] items-center gap-3 rounded-[14px] border-2 border-dashed border-[var(--lg-free)] bg-[var(--lg-free-soft)] px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-[13px] lg-num">{formatRange(row.g.start, row.g.end)}</span>
                  <span className="text-[15px] font-bold text-[var(--lg-free)]">
                    Free, {formatDuration(row.g.end - row.g.start)}
                    {canAct && <span className="font-medium text-[var(--lg-ink)]">. {isAdmin ? "Book" : "Request"}</span>}
                  </span>
                </button>
              ) : (
                <button
                  key={`b-${row.b.rowIndex ?? row.b.startTime}-${row.b.lane}`}
                  type="button"
                  onClick={() => onSelectBooking(row.b)}
                  className={`grid min-h-14 grid-cols-[108px_minmax(0,1fr)] items-center gap-3 rounded-[14px] border px-3 py-2 text-left ${
                    row.b.conflict
                      ? "border-[var(--lg-danger)] bg-[var(--lg-danger-soft)]"
                      : "border-[var(--lg-line)] bg-[var(--lg-pass-fill)] shadow-[var(--lg-shadow-soft)]"
                  }`}
                >
                  <span className="text-[13px] lg-num">{formatRange(row.b.start, row.b.end)}</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="break-words text-[15px] font-bold">{row.b.eventName}</span>
                    {row.b.conflict && <span className="lg-pill lg-pill-conflict">Conflict</span>}
                  </span>
                </button>
              ),
            )}
          </section>
        );
      })}
    </div>
  );
}
