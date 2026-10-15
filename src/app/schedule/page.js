"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Mail, MailCheck, RotateCw } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import GlassShell from "@/components/glass/GlassShell";
import { dealIn, slideByDirection } from "@/components/glass/motion";
import AdminLoginModal from "@/components/AdminLoginModal";
import EmailModal from "@/components/EmailModal";
import ReservationDetailModal from "@/components/ReservationDetailModal";
import MonthGrid, { ROOM_MARK, dayBookings } from "@/components/calendar/MonthGrid";
import { useHydrated } from "@/hooks/use-hydrated";
import { manilaNow } from "@/lib/reservationRules";
import { ROOMS } from "@/lib/rooms";
import { formatRange } from "@/lib/availability";
import { useReservations } from "@/hooks/use-reservations";

const today = () => manilaNow().slice(0, 10);

function shiftMonth(month, n) {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

const monthTitle = (month) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });

const longDay = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

export default function SchedulePage() {
  const { isAdmin, login } = useAdmin();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [direction, setDirection] = useState(0);
  const { reservations, status, reload, retry } = useReservations(isAdmin);

  const [showLogin, setShowLogin] = useState(false);
  const [detail, setDetail] = useState(null);
  const [emailTarget, setEmailTarget] = useState(null);

  function goToMonth(next) {
    setDirection(next > month ? 1 : next < month ? -1 : 0);
    setMonth(next);
  }

  function selectDay(date) {
    setSelected(date);
    if (date.slice(0, 7) !== month) goToMonth(date.slice(0, 7));
  }

  const now = today();
  const items = dayBookings(reservations, selected);
  const slide = reduceMotion ? 0 : direction;

  return (
    <GlassShell title="Calendar" onSignIn={isAdmin ? null : () => setShowLogin(true)}>
      <div className="lg-chrome flex flex-wrap items-center gap-3 px-4 py-3">
        <h1 className="lg-title mr-auto">{hydrated ? monthTitle(month) : "Calendar"}</h1>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous month" onClick={() => goToMonth(shiftMonth(month, -1))} className="lg-btn lg-btn-secondary lg-btn-icon">
            <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => {
              goToMonth(now.slice(0, 7));
              setSelected(now);
            }}
            className="lg-btn lg-btn-secondary"
          >
            Today
          </button>
          <button type="button" aria-label="Next month" onClick={() => goToMonth(shiftMonth(month, 1))} className="lg-btn lg-btn-secondary lg-btn-icon">
            <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium" aria-label="Legend">
          {ROOMS.map((r) => (
            <li key={r.value} className="flex items-center gap-2">
              <span aria-hidden="true" className={`size-2.5 ${ROOM_MARK[r.value].mark}`} />
              {r.label}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-full ring-2 ring-[var(--lg-danger)]" />
            Overlap
          </li>
        </ul>
      </div>

      {status === "error" && (
        <div role="alert" className="lg-banner">
          <p>
            <strong>Couldn&apos;t load the calendar.</strong> Check your connection and try again.
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
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        {!hydrated || (status === "loading" && reservations.length === 0) ? (
          <div className="lg-sheet h-[420px] animate-pulse motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <div className="min-w-0 overflow-hidden rounded-[28px]">
            <AnimatePresence mode="wait" initial={false} custom={slide}>
              <motion.div key={month} custom={slide} variants={slideByDirection} initial="enter" animate="center" exit="exit">
                <MonthGrid
                  reservations={reservations}
                  month={month}
                  today={now}
                  selected={selected}
                  showNames={isAdmin}
                  onSelect={selectDay}
                  onOpenBooking={setDetail}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <section className="lg-pass flex flex-col gap-3 p-5" aria-labelledby="calendar-day-title" aria-live="polite">
          <div>
            <h2 id="calendar-day-title" className="text-[19px] font-bold leading-snug">
              {hydrated ? `${selected === now ? "Today, " : ""}${longDay(selected)}` : "Selected day"}
            </h2>
            <p className="text-[14px] lg-muted">
              {status === "ready" ? `${items.length} booking${items.length === 1 ? "" : "s"}. Times are Philippine time.` : "Loading…"}
            </p>
          </div>
          <ul key={selected} className="flex flex-col gap-2">
            {items.map((b, i) => (
              <motion.li key={`${b.rowIndex ?? b.startTime}-${i}`} {...dealIn(i)} className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => setDetail(b)}
                  className={`lg-press flex min-w-0 flex-1 flex-col items-start gap-1 rounded-[14px] border px-3 py-2.5 text-left ${
                    b.conflict
                      ? "border-[var(--lg-danger)] bg-[var(--lg-danger-soft)]"
                      : "border-[var(--lg-rim)] bg-[var(--lg-pass-fill)] hover:bg-[var(--lg-sheet-fill)]"
                  }`}
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{b.eventName}</span>
                    {b.conflict && <span className="lg-pill lg-pill-conflict">Conflict</span>}
                  </span>
                  <span className="flex items-center gap-2 text-[13px]">
                    <span aria-hidden="true" className={`size-2 ${(ROOM_MARK[(b.room || "").trim()] || {}).mark || "rounded-full bg-[var(--lg-ink-muted)]"}`} />
                    <span>{(ROOM_MARK[(b.room || "").trim()] || {}).short || b.room}</span>
                    <span className="lg-num lg-muted">{formatRange(b.start, b.end)}</span>
                  </span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setEmailTarget(b)}
                    aria-label={b.emailSent ? `Resend email for ${b.eventName}` : `Send email for ${b.eventName}`}
                    className="lg-btn lg-btn-secondary lg-btn-icon self-center"
                  >
                    {b.emailSent ? (
                      <MailCheck aria-hidden="true" className="size-5 text-[var(--lg-free)]" strokeWidth={1.75} />
                    ) : (
                      <Mail aria-hidden="true" className="size-5" strokeWidth={1.75} />
                    )}
                  </button>
                )}
              </motion.li>
            ))}
          </ul>
          {status === "ready" && items.length === 0 && <p className="lg-muted">Nothing booked. Both rooms are free.</p>}
          {hydrated && selected >= now && (
            <Link href={`/availability?date=${selected}`} className="lg-btn lg-btn-secondary self-start">
              See free times this day
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
            </Link>
          )}
        </section>
      </div>

      {showLogin && (
        <AdminLoginModal
          onClose={() => setShowLogin(false)}
          onLogin={(info) => {
            login(info);
            setShowLogin(false);
          }}
        />
      )}
      {emailTarget && <EmailModal reservation={emailTarget} onClose={() => setEmailTarget(null)} onSent={reload} />}
      {detail && (
        <ReservationDetailModal
          reservation={detail}
          onClose={() => setDetail(null)}
          onUpdate={() => {
            setDetail(null);
            reload();
          }}
        />
      )}
    </GlassShell>
  );
}
