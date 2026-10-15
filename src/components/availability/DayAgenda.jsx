"use client";

import { formatDuration, formatRange, freeGaps, inRoom, layoutLanes } from "@/lib/availability";

/** Phone layout of the day view: a time-ordered list per room, free time included. */
export default function DayAgenda({ rooms, bookings, hours, notBefore, canAct, isAdmin, onSelectGap, onSelectBooking }) {
  return (
    <div className="flex flex-col gap-6">
      {rooms.map((room) => {
        const { items } = layoutLanes(inRoom(bookings, room.value));
        const gaps = freeGaps(items, hours, { notBefore });
        const rows = [
          ...items.map((b) => ({ kind: "booking", start: b.start, b })),
          ...gaps.map((g) => ({ kind: "gap", start: g.start, g })),
        ].sort((a, b) => a.start - b.start);

        return (
          <section key={room.value} aria-label={room.label} className="flex flex-col gap-2">
            <h3 className="flex items-baseline gap-2 text-base font-semibold text-white">
              {room.label}
              {room.capacity && <span className="text-xs font-normal text-slate-400">{room.capacity} people</span>}
            </h3>
            {rows.length === 0 && <p className="text-sm text-slate-400">No free time left today.</p>}
            {rows.map((row) =>
              row.kind === "gap" ? (
                <button
                  key={`gap-${row.g.start}`}
                  type="button"
                  disabled={!canAct}
                  onClick={() => onSelectGap(room, row.g)}
                  className="grid min-h-12 grid-cols-[104px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-dashed border-emerald-400/70 px-3 py-2 text-left text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-xs">{formatRange(row.g.start, row.g.end)}</span>
                  <span className="text-sm font-semibold">
                    Free · {formatDuration(row.g.end - row.g.start)}
                    {canAct && <span className="font-normal"> · {isAdmin ? "Book" : "Request"}</span>}
                  </span>
                </button>
              ) : (
                <button
                  key={`b-${row.b.rowIndex ?? row.b.startTime}-${row.b.lane}`}
                  type="button"
                  onClick={() => onSelectBooking(row.b)}
                  className={`grid min-h-12 grid-cols-[104px_minmax(0,1fr)] items-center gap-3 rounded-lg border px-3 py-2 text-left ${
                    row.b.conflict ? "border-red-400 bg-red-500/10" : "border-white/10 bg-white/5"
                  }`}
                >
                  <span className="text-xs text-slate-300">{formatRange(row.b.start, row.b.end)}</span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="break-words text-sm font-semibold text-white">{row.b.eventName}</span>
                    {row.b.conflict && (
                      <span className="self-start rounded bg-red-600 px-1 text-xs font-bold uppercase tracking-wide text-white">
                        Conflict
                      </span>
                    )}
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
