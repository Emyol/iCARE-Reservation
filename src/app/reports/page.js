"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RotateCw } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import GlassShell from "@/components/glass/GlassShell";
import { EASE_OUT } from "@/components/glass/motion";
import AdminLoginModal from "@/components/AdminLoginModal";
import { ROOMS, findRoom } from "@/lib/rooms";
import { holdsRoom } from "@/lib/reservationRules";
import { useReservations } from "@/hooks/use-reservations";

const monthLabel = (key) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });

export default function ReportsPage() {
  const { isAdmin, login } = useAdmin();
  const [showLogin, setShowLogin] = useState(false);
  const { reservations, status, reload, retry } = useReservations(isAdmin);

  const dated = reservations.filter((r) => r.startTime && holdsRoom(r));
  const stats = [
    { label: "All bookings", value: dated.length },
    ...ROOMS.map((room) => ({
      label: room.label,
      hint: `Fits ${room.capacity}`,
      value: dated.filter((r) => findRoom(r.room) === room).length,
    })),
  ];

  // "YYYY-MM" keys sort as text, newest first; split per room for the bars.
  const byMonth = {};
  for (const r of dated) {
    const key = r.startTime.slice(0, 7);
    const room = findRoom(r.room);
    byMonth[key] ??= { total: 0, perRoom: Object.fromEntries(ROOMS.map((x) => [x.value, 0])) };
    byMonth[key].total += 1;
    if (room) byMonth[key].perRoom[room.value] += 1;
  }
  const months = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a));
  const busiest = Math.max(1, ...months.map(([, m]) => m.total));
  const loading = status === "loading" && reservations.length === 0;

  return (
    <GlassShell onSignIn={isAdmin ? null : () => setShowLogin(true)}>
      <div className="lg-chrome flex flex-wrap items-center gap-3 px-4 py-3">
        <h1 className="lg-title mr-auto">Reports</h1>
        <p className="text-[13px] lg-muted">Every booking in the sheet, past and upcoming.</p>
      </div>

      {status === "error" && (
        <div role="alert" className="lg-banner">
          <p>
            <strong>Couldn&apos;t load the numbers.</strong> Check your connection and try again.
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

      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="lg-pass flex flex-col gap-1 p-5">
            <dt className="lg-label">{s.label}</dt>
            <dd className="lg-display lg-num">{loading ? <span className="lg-muted">-</span> : s.value}</dd>
            {s.hint && <dd className="text-[13px] lg-muted">{s.hint}</dd>}
          </div>
        ))}
      </dl>

      <section className="lg-sheet flex flex-col gap-4 p-6" aria-labelledby="by-month-title">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="by-month-title" className="lg-title">
            Bookings by month
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium" aria-label="Legend">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-[var(--lg-booked)]" />
              {ROOMS[0].label}
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-[var(--lg-attention)]" />
              {ROOMS[1].label}
            </li>
          </ul>
        </div>
        {loading ? (
          <div className="h-40 animate-pulse rounded-[14px] bg-[var(--lg-line)] motion-reduce:animate-none" aria-hidden="true" />
        ) : months.length === 0 ? (
          <p className="lg-muted">No bookings yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {months.map(([key, m], i) => (
              <li key={key} className="grid grid-cols-[120px_minmax(0,1fr)_40px] items-center gap-3 sm:grid-cols-[160px_minmax(0,1fr)_48px]">
                <span className="text-[14px] font-semibold">{monthLabel(key)}</span>
                {/* Bars grow from the left once, on first load, so the busiest months read first. */}
                <motion.span
                  className="flex h-3 origin-left overflow-hidden rounded-full"
                  style={{ width: `${(m.total / busiest) * 100}%` }}
                  initial={{ transform: "scaleX(0)" }}
                  animate={{ transform: "scaleX(1)" }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: Math.min(i, 8) * 0.04 }}
                  aria-hidden="true"
                >
                  <span className="h-full bg-[var(--lg-booked)]" style={{ flexGrow: m.perRoom[ROOMS[0].value] }} />
                  <span className="h-full bg-[var(--lg-attention)]" style={{ flexGrow: m.perRoom[ROOMS[1].value] }} />
                  <span className="h-full bg-[var(--lg-ink-muted)]" style={{ flexGrow: m.total - m.perRoom[ROOMS[0].value] - m.perRoom[ROOMS[1].value] }} />
                </motion.span>
                <span className="text-right text-[15px] font-bold lg-num">
                  {m.total}
                  <span className="sr-only">
                    {" "}
                    bookings: {m.perRoom[ROOMS[0].value]} {ROOMS[0].label}, {m.perRoom[ROOMS[1].value]} {ROOMS[1].label}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showLogin && (
        <AdminLoginModal
          onClose={() => setShowLogin(false)}
          onLogin={(info) => {
            login(info);
            setShowLogin(false);
          }}
        />
      )}
    </GlassShell>
  );
}
