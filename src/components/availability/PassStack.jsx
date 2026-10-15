"use client";

import { useEffect, useRef } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { formatClock, formatRange } from "@/lib/availability";

// Passes glide to their new place when one is brought to the front.
const PASS_MOVE = { type: "spring", duration: 0.4, bounce: 0 };

const ROOM_SHORT = {
  "Audio-Visual Room": "AVR",
  "Training Room": "Training",
};

// Status comes from the email columns (see statusOf); an overlap outranks it.
function StatusPill({ booking }) {
  if (booking.conflict) return <span className="lg-pill lg-pill-conflict">Conflict</span>;
  if (booking.status === "confirmed") return <span className="lg-pill lg-pill-confirmed">Confirmed</span>;
  return <span className="lg-pill lg-pill-pending">Pending</span>;
}

/**
 * Staff pass column from the "wallet beside the day" comp: the front pass is
 * open with its details and actions; the rest show their header strip.
 * Overlaps come first so they get handled before anything else.
 */
export default function PassStack({ passes, frontKey, onFront, onOpenDetails, onEmail, dateLabel }) {
  const frontRef = useRef(null);
  const shownKey = useRef(null);
  const front = passes.find((p) => p.key === frontKey) || passes[0];

  // The pressed strip leaves the list as it becomes the front pass, so move
  // focus to the pass it became instead of dropping it on the page.
  useEffect(() => {
    if (shownKey.current && front && shownKey.current !== front.key) frontRef.current?.focus();
    shownKey.current = front?.key ?? null;
  }, [front]);

  if (passes.length === 0) {
    return (
      <aside className="lg-pass p-5" aria-label="Bookings">
        <p className="font-semibold">No bookings this day</p>
        <p className="mt-1 text-[14px] lg-muted">Pick a free block to add one.</p>
      </aside>
    );
  }

  const rest = passes.filter((p) => p !== front);
  const roomShort = (p) => ROOM_SHORT[p.roomLabel] || p.roomLabel;

  return (
    <LayoutGroup>
      <aside className="flex flex-col gap-3" aria-label="Bookings">
        {/* Keyed so a new front pass is a new element: Motion animates shared
            elements by remounting, and breaks if layoutId changes in place. */}
        <motion.section
          key={front.key}
          ref={frontRef}
          layoutId={front.key}
          layout="position"
          transition={PASS_MOVE}
          tabIndex={-1}
          className="lg-pass flex flex-col gap-4 p-5"
          aria-labelledby="front-pass-title"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="front-pass-title" className="text-[20px] font-bold leading-snug">
              {front.eventName}
            </h2>
            <StatusPill booking={front} />
          </div>
          <div className="flex items-center gap-3">
            <span className="lg-chip">{roomShort(front)}</span>
            <span className="text-[15px] lg-num">{formatRange(front.start, front.end)}</span>
          </div>
          <dl className="grid grid-cols-4 gap-2 border-t border-[var(--lg-line)] pt-4">
            <div>
              <dt className="lg-label">Date</dt>
              <dd className="mt-0.5 font-semibold">{dateLabel}</dd>
            </div>
            <div>
              <dt className="lg-label">From</dt>
              <dd className="mt-0.5 font-semibold lg-num">{formatClock(front.start)}</dd>
            </div>
            <div>
              <dt className="lg-label">To</dt>
              <dd className="mt-0.5 font-semibold lg-num">{formatClock(front.end)}</dd>
            </div>
            <div>
              <dt className="lg-label">People</dt>
              <dd className="mt-0.5 font-semibold lg-num">{front.attendees || "-"}</dd>
            </div>
          </dl>
          {front.conflict && front.overlapsWith && (
            <p className="rounded-[14px] border border-[var(--lg-danger)] bg-[var(--lg-danger-soft)] px-4 py-3 text-[14px] font-medium">
              Overlaps {front.overlapsWith}.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onEmail(front)} className="lg-btn lg-btn-primary flex-1">
              Send email
            </button>
            <button type="button" onClick={() => onOpenDetails(front)} className="lg-btn lg-btn-secondary flex-1">
              Open details
            </button>
          </div>
        </motion.section>

        {rest.map((p) => (
          <motion.button
            key={p.key}
            layoutId={p.key}
            layout="position"
            transition={PASS_MOVE}
            type="button"
            onClick={() => onFront(p.key)}
            className="lg-pass flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[var(--lg-sheet-fill)]"
            aria-label={`${p.eventName}, ${p.roomLabel}, ${formatRange(p.start, p.end)}${p.conflict ? ", overlaps another booking" : ""}. Show this booking.`}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-bold">{p.eventName}</span>
              <span className="mt-1 flex items-center gap-2 text-[13px]">
                <span className="lg-chip">{roomShort(p)}</span>
                <span className="lg-num">{formatRange(p.start, p.end)}</span>
              </span>
            </span>
            <StatusPill booking={p} />
          </motion.button>
        ))}
      </aside>
    </LayoutGroup>
  );
}
