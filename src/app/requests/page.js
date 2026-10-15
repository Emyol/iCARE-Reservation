"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, RotateCw, Search } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import GlassShell from "@/components/glass/GlassShell";
import GlassSegmented from "@/components/glass/GlassSegmented";
import StaffOnly from "@/components/glass/StaffOnly";
import { EASE_OUT } from "@/components/glass/motion";
import AdminLoginModal from "@/components/AdminLoginModal";
import EmailModal from "@/components/EmailModal";
import ReservationDetailModal from "@/components/ReservationDetailModal";
import { dayBookings } from "@/components/calendar/MonthGrid";
import { useHydrated } from "@/hooks/use-hydrated";
import { holdsRoom, manilaNow } from "@/lib/reservationRules";
import { findRoom } from "@/lib/rooms";
import { formatRange, minutesOf } from "@/lib/availability";
import { useReservations } from "@/hooks/use-reservations";

const VIEWS = [
  { id: "review", label: "To review" },
  { id: "confirmed", label: "Confirmed" },
  { id: "declined", label: "Declined" },
  { id: "all", label: "All" },
];

const SHORT = { "Audio-Visual Room": "AVR", "Training Room": "TR" };
const roomLabel = (r) => findRoom(r.room)?.label || r.room;
const keyOf = (r) => String(r.rowIndex ?? `${r.room}-${r.startTime}`);
const when = (r) =>
  `${new Date(`${r.startTime.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  })}, ${formatRange(minutesOf(r.startTime), minutesOf(r.endTime))}`;

function submittedAt(r) {
  const d = new Date(r.timestamp);
  return r.timestamp && !Number.isNaN(d.getTime()) ? d : null;
}

function submittedAgo(r) {
  const d = submittedAt(r);
  if (!d) return "Submitted date unknown";
  const hours = Math.round((Date.now() - d.getTime()) / 3_600_000);
  if (hours < 1) return "Submitted just now";
  if (hours < 24) return `Submitted ${hours} h ago`;
  return `Submitted ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

const STATUS_PILL = {
  pending: <span className="lg-pill lg-pill-pending">Pending</span>,
  confirmed: <span className="lg-pill lg-pill-confirmed">Confirmed</span>,
  declined: <span className="lg-pill lg-pill-void">Declined</span>,
};

/** Upcoming overlapping pairs that still need a decision (at least one side pending). */
function overlapPairs(upcoming) {
  const pairs = [];
  for (let i = 0; i < upcoming.length; i++) {
    for (let j = i + 1; j < upcoming.length; j++) {
      const [a, b] = [upcoming[i], upcoming[j]];
      if ((a.room || "").trim() !== (b.room || "").trim()) continue;
      if (!(a.startTime < b.endTime && b.startTime < a.endTime)) continue;
      if (a.status !== "pending" && b.status !== "pending") continue;
      const [ta, tb] = [submittedAt(a), submittedAt(b)];
      // Earlier submission first: the first-submitted-wins rule.
      pairs.push(ta && tb && tb < ta ? [b, a] : [a, b]);
    }
  }
  return pairs.sort(([a], [b]) => a.startTime.localeCompare(b.startTime));
}

const RoomTag = ({ r }) => <span className="lg-chip">{SHORT[roomLabel(r)] || roomLabel(r)}</span>;

function Side({ r, tag }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[18px] border border-[var(--lg-rim)] bg-[var(--lg-pass-fill)] p-4">
      <span className="flex flex-wrap items-center gap-2">
        {tag}
        {STATUS_PILL[r.status]}
      </span>
      <span className="break-words text-[17px] font-bold">{r.eventName}</span>
      <span className="text-[14px] lg-num">{when(r)}</span>
      {r.fullName && <span className="text-[13px] lg-muted">{r.fullName}</span>}
      <span className="text-[13px] lg-muted">{submittedAgo(r)}</span>
    </div>
  );
}

const cardMotion = {
  layout: "position",
  initial: { opacity: 0, transform: "translateY(8px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  // Resolved cards lift away and the queue closes up behind them.
  exit: { opacity: 0, transform: "scale(0.97)", transition: { duration: 0.18, ease: EASE_OUT } },
  transition: { duration: 0.24, ease: EASE_OUT },
};

export default function RequestsPage() {
  const { isAdmin, login } = useAdmin();
  const hydrated = useHydrated();
  const [showLogin, setShowLogin] = useState(false);
  const { reservations, status, reload, retry } = useReservations(isAdmin, 30_000);
  const [view, setView] = useState("review");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null);
  // Emails waiting to be sent, one dialog at a time: [{ reservation, type, keeping }]
  const [emails, setEmails] = useState([]);
  const headingRef = useRef(null);
  const handled = useRef(false);

  // Once a dialog that handled a request closes, reload so its card visibly
  // leaves the queue (not hidden behind the dialog), and put focus on the
  // heading, since the button that opened the dialog goes with the card.
  // Cancelling leaves focus on that button, as usual.
  const markHandled = () => {
    handled.current = true;
  };
  const refocus = () => {
    if (!handled.current) return;
    handled.current = false;
    reload();
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const signIn = () => setShowLogin(true);
  const now = hydrated ? manilaNow() : "";
  const q = query.trim().toLowerCase();
  const matches = (r) =>
    !q || [r.eventName, r.fullName, r.recipientEmail, roomLabel(r)].some((v) => (v || "").toLowerCase().includes(q));

  const upcoming = reservations.filter((r) => holdsRoom(r) && r.endTime > now).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const pairs = overlapPairs(upcoming).filter((p) => p.some(matches));
  const inPair = new Set(pairs.flat().map(keyOf));
  const pending = upcoming.filter((r) => r.status === "pending" && !inPair.has(keyOf(r)) && matches(r));
  const pendingCount = upcoming.filter((r) => r.status === "pending").length;
  // The other views list newest submissions first, like the old "latest submissions" bell.
  const listed = reservations
    .filter((r) => (view === "all" || r.status === view) && matches(r))
    .sort((a, b) => (submittedAt(b)?.getTime() || 0) - (submittedAt(a)?.getTime() || 0));
  const today = now.slice(0, 10);
  const todays = hydrated ? dayBookings(reservations, today) : [];

  const confirm = (r) => setEmails([{ reservation: r, type: "confirmation" }]);
  const decline = (r, keeping) => setEmails([{ reservation: r, type: "conflict", keeping }]);

  return (
    <GlassShell onSignIn={isAdmin ? null : signIn}>
      <div className="lg-chrome flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="mr-auto flex flex-wrap items-center gap-3">
          <h1 ref={headingRef} tabIndex={-1} className="lg-title">
            Requests to review
          </h1>
          {isAdmin && status === "ready" && hydrated && (
            <span className="flex gap-2">
              <span className="lg-pill lg-pill-pending">{pendingCount} pending</span>
              {pairs.length > 0 && (
                <span className="lg-pill lg-pill-conflict">
                  {pairs.length} overlap{pairs.length === 1 ? "" : "s"}
                </span>
              )}
            </span>
          )}
        </div>
        {isAdmin && (
          <>
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Search requests</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 lg-muted" strokeWidth={2} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Event, name, email or room"
                className="lg-input pl-9"
              />
            </label>
            <GlassSegmented label="Show" options={VIEWS} value={view} onChange={setView} />
          </>
        )}
      </div>

      {!isAdmin ? (
        <StaffOnly what="room requests" onSignIn={signIn} />
      ) : status === "error" ? (
        <div role="alert" className="lg-banner">
          <p>
            <strong>Couldn&apos;t load requests.</strong> Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={retry}
            className="lg-btn lg-btn-secondary"
          >
            <RotateCw aria-hidden="true" className="size-4" strokeWidth={2} />
            Retry
          </button>
        </div>
      ) : !hydrated || status === "loading" ? (
        <div className="lg-pass h-48 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          {view === "review" ? (
            <ul className="flex min-w-0 flex-col gap-3" aria-label="Requests to review">
              <AnimatePresence mode="popLayout" initial={false}>
                {pairs.map(([first, later]) => {
                  const known = submittedAt(first) && submittedAt(later) && submittedAt(first) < submittedAt(later);
                  return (
                    <motion.li key={`pair-${keyOf(first)}-${keyOf(later)}`} {...cardMotion} className="lg-pass flex flex-col gap-4 p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <RoomTag r={first} />
                        <h2 className="text-[19px] font-bold">{roomLabel(first)}</h2>
                        <span className="lg-pill lg-pill-conflict">Overlap</span>
                      </div>
                      <p>These bookings overlap. Which would you like to keep?</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Side r={first} tag={known && <span className="lg-pill lg-pill-confirmed">Submitted first</span>} />
                        <Side r={later} tag={known && <span className="lg-pill lg-pill-conflict">Submitted later</span>} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => decline(later, first)} className="lg-btn lg-btn-primary">
                          Keep {known ? "earlier" : `“${first.eventName}”`}, decline {known ? "later" : "the other"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEmails([first, later].filter((r) => r.status === "pending").map((r) => ({ reservation: r, type: "confirmation" })))
                          }
                          className="lg-btn lg-btn-secondary"
                        >
                          Keep both
                        </button>
                        <button type="button" onClick={() => decline(first, later)} className="lg-btn lg-btn-quiet">
                          Keep {known ? "later" : `“${later.eventName}”`} instead
                        </button>
                      </div>
                    </motion.li>
                  );
                })}
                {pending.map((r) => (
                  <motion.li key={keyOf(r)} {...cardMotion} className="lg-pass flex flex-wrap items-center gap-4 p-5">
                    {/* basis-64: on phones the buttons drop below instead of squeezing the text. */}
                    <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <RoomTag r={r} />
                        <span className="text-[14px] font-semibold">{roomLabel(r)}</span>
                        {STATUS_PILL.pending}
                      </span>
                      <span className="break-words text-[18px] font-bold">{r.eventName}</span>
                      <span className="text-[14px] lg-num">{when(r)}</span>
                      <span className="text-[13px] lg-muted">
                        {[r.fullName, r.attendees && `${r.attendees} people`, submittedAgo(r)].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => confirm(r)} className="lg-btn lg-btn-primary">
                        Confirm
                      </button>
                      <button type="button" onClick={() => setDetail(r)} className="lg-btn lg-btn-secondary">
                        Open
                      </button>
                    </div>
                  </motion.li>
                ))}
                {pairs.length === 0 && pending.length === 0 && (
                  <motion.li key="empty" {...cardMotion} className="lg-pass p-6">
                    <h2 className="lg-title">{q ? "No requests match your search" : "All caught up"}</h2>
                    <p className="mt-1 lg-muted">
                      {q ? "Try an event name, a person, an email or a room." : "Every upcoming request has been confirmed or declined."}
                    </p>
                  </motion.li>
                )}
              </AnimatePresence>
            </ul>
          ) : (
            <ul key={view} className="lg-sheet flex min-w-0 flex-col p-2" aria-label={`${VIEWS.find((v) => v.id === view).label} requests, newest submission first`}>
              {listed.length === 0 && <li className="p-4 lg-muted">Nothing here{q ? " for that search" : ""}.</li>}
              {listed.slice(0, 100).map((r, i) => (
                <motion.li
                  key={keyOf(r)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.03 }}
                  className="flex flex-wrap items-center gap-3 border-t border-[var(--lg-line)] px-3 py-3 first:border-t-0"
                >
                  <RoomTag r={r} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{r.eventName}</span>
                    <span className="text-[13px] lg-muted lg-num">
                      {when(r)} · {submittedAgo(r)}
                    </span>
                  </span>
                  {STATUS_PILL[r.status]}
                  <button type="button" onClick={() => setDetail(r)} className="lg-btn lg-btn-secondary min-h-10">
                    Open
                  </button>
                </motion.li>
              ))}
              {listed.length > 100 && <li className="p-3 text-[13px] lg-muted">Showing the newest 100. Search to narrow it down.</li>}
            </ul>
          )}

          <aside className="lg-pass flex flex-col gap-3 p-5" aria-labelledby="today-title">
            <h2 id="today-title" className="text-[19px] font-bold">
              Today
            </h2>
            {todays.length === 0 ? (
              <p className="lg-muted">Nothing booked today.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {todays.map((b, i) => (
                  <li key={`${keyOf(b)}-${i}`} className="flex items-center gap-2 text-[14px]">
                    <RoomTag r={b} />
                    <span className="lg-num">{formatRange(b.start, b.end)}</span>
                    <span className="min-w-0 flex-1 truncate">{b.eventName}</span>
                    {b.conflict ? <span className="lg-pill lg-pill-conflict">Conflict</span> : STATUS_PILL[b.status]}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/availability" className="lg-btn lg-btn-secondary self-start">
              Open Availability
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
            </Link>
          </aside>
        </div>
      )}

      {showLogin && (
        <AdminLoginModal
          onClose={() => setShowLogin(false)}
          onLogin={(info) => {
            login(info);
            setShowLogin(false);
          }}
        />
      )}
      {emails[0] && (
        <EmailModal
          key={keyOf(emails[0].reservation) + emails[0].type}
          reservation={emails[0].reservation}
          initialType={emails[0].type}
          keeping={emails[0].keeping}
          onSent={markHandled}
          onClose={() => {
            setEmails((queue) => queue.slice(1));
            refocus();
          }}
        />
      )}
      {detail && (
        <ReservationDetailModal
          reservation={detail}
          onClose={() => {
            setDetail(null);
            refocus();
          }}
          onUpdate={() => {
            markHandled();
            setDetail(null);
            refocus();
          }}
        />
      )}
    </GlassShell>
  );
}
