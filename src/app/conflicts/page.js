"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CircleCheck, RotateCw } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import GlassShell from "@/components/glass/GlassShell";
import StaffOnly from "@/components/glass/StaffOnly";
import { dealIn } from "@/components/glass/motion";
import AdminLoginModal from "@/components/AdminLoginModal";
import ReservationDetailModal from "@/components/ReservationDetailModal";
import { useHydrated } from "@/hooks/use-hydrated";
import { holdsRoom, manilaNow } from "@/lib/reservationRules";
import { findRoom } from "@/lib/rooms";
import { formatRange, minutesOf } from "@/lib/availability";

/** Every pair of bookings in the same room whose times overlap. */
function findConflicts(reservations) {
  const rows = reservations.filter((r) => r.startTime && r.endTime && holdsRoom(r));
  const pairs = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const [a, b] = [rows[i], rows[j]];
      if ((a.room || "").trim() !== (b.room || "").trim()) continue;
      if (a.startTime < b.endTime && b.startTime < a.endTime) pairs.push(a.startTime <= b.startTime ? [a, b] : [b, a]);
    }
  }
  return pairs.sort(([a], [b]) => a.startTime.localeCompare(b.startTime));
}

const submittedAt = (r) => {
  const d = new Date(r.timestamp);
  return r.timestamp && !Number.isNaN(d.getTime()) ? d : null;
};

const longDay = (dateTime) =>
  new Date(`${dateTime.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function ConflictCard({ pair, onOpen, index }) {
  const [a, b] = pair;
  const [ta, tb] = pair.map(submittedAt);
  const first = ta && tb && ta.getTime() !== tb.getTime() ? (ta < tb ? a : b) : null;
  const room = findRoom(a.room);
  return (
    <motion.li {...dealIn(index)} className="lg-pass flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="lg-pill lg-pill-conflict">Conflict</span>
        <h3 className="text-[17px] font-bold">
          {longDay(a.startTime)}, {room ? room.label : a.room}
        </h3>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {pair.map((r) => (
          <li key={r.rowIndex ?? r.startTime} className="flex flex-col gap-1.5 rounded-[14px] border border-[var(--lg-danger)] bg-[var(--lg-danger-soft)] p-3">
            <span className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{r.eventName}</span>
              {first && (
                <span className={`lg-pill ${r === first ? "lg-pill-confirmed" : "lg-pill-pending"}`}>
                  {r === first ? "Submitted first" : "Submitted later"}
                </span>
              )}
            </span>
            <span className="text-[14px] lg-num">{formatRange(minutesOf(r.startTime), minutesOf(r.endTime))}</span>
            {r.fullName && <span className="text-[13px] lg-muted">{r.fullName}</span>}
            <span className="text-[13px] lg-muted lg-num">
              Submitted{" "}
              {submittedAt(r)
                ? submittedAt(r).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                : "date unknown"}
            </span>
            <button type="button" onClick={() => onOpen(r)} className="lg-btn lg-btn-secondary mt-1 min-h-10 self-start">
              Open
            </button>
          </li>
        ))}
      </ul>
    </motion.li>
  );
}

export default function ConflictsPage() {
  const { isAdmin, login } = useAdmin();
  const hydrated = useHydrated();
  const [showLogin, setShowLogin] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [detail, setDetail] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reservations", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      setReservations(await res.json());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  // Refetch when admin state changes: the API returns full rows only to admins.
  useEffect(() => {
    fetchData();
    const refresh = setInterval(fetchData, 60_000);
    return () => clearInterval(refresh);
  }, [fetchData, isAdmin]);

  const signIn = () => setShowLogin(true);
  const now = hydrated ? manilaNow().slice(0, 16) : "";
  const conflicts = findConflicts(reservations);
  // Still to happen (or under way), soonest first; past ones newest first.
  const upcoming = conflicts.filter((p) => p.some((r) => r.endTime > now));
  const past = conflicts.filter((p) => !upcoming.includes(p)).reverse();

  return (
    <GlassShell onSignIn={isAdmin ? null : signIn}>
      <div className="lg-chrome flex flex-wrap items-center gap-3 px-4 py-3">
        <h1 className="lg-title mr-auto">Conflicts</h1>
        <p className="text-[13px] lg-muted">Bookings in the same room whose times overlap.</p>
      </div>

      {!isAdmin ? (
        <StaffOnly what="overlapping bookings" onSignIn={signIn} />
      ) : status === "error" ? (
        <div role="alert" className="lg-banner">
          <p>
            <strong>Couldn&apos;t load bookings.</strong> Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              fetchData();
            }}
            className="lg-btn lg-btn-secondary"
          >
            <RotateCw aria-hidden="true" className="size-4" strokeWidth={2} />
            Retry
          </button>
        </div>
      ) : !hydrated || status === "loading" ? (
        <div className="lg-pass h-40 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <>
          {upcoming.length === 0 ? (
            <section className="lg-pass flex items-center gap-4 p-6">
              <CircleCheck aria-hidden="true" className="size-8 shrink-0 text-[var(--lg-free)]" strokeWidth={1.75} />
              <div>
                <h2 className="lg-title">No upcoming conflicts</h2>
                <p className="mt-1 lg-muted">Every booking from today on has its room to itself.</p>
              </div>
            </section>
          ) : (
            <section className="flex flex-col gap-3" aria-labelledby="upcoming-title">
              <h2 id="upcoming-title" className="px-1 text-[17px] font-bold">
                {upcoming.length} upcoming conflict{upcoming.length === 1 ? "" : "s"}, soonest first
              </h2>
              <ul className="flex flex-col gap-3">
                {upcoming.map((pair, i) => (
                  <ConflictCard key={pair.map((r) => r.rowIndex ?? r.startTime).join("-")} pair={pair} index={i} onOpen={setDetail} />
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <details className="lg-sheet group p-5">
              <summary className="cursor-pointer text-[17px] font-bold">
                Past conflicts ({past.length})
                <span className="ml-2 text-[14px] font-normal lg-muted">for the record; nothing to resolve</span>
              </summary>
              <ul className="mt-4 flex flex-col gap-3">
                {past.map((pair, i) => (
                  <ConflictCard key={pair.map((r) => r.rowIndex ?? r.startTime).join("-")} pair={pair} index={i} onOpen={setDetail} />
                ))}
              </ul>
            </details>
          )}
        </>
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
      {detail && (
        <ReservationDetailModal
          reservation={detail}
          onClose={() => setDetail(null)}
          onUpdate={() => {
            setDetail(null);
            fetchData();
          }}
        />
      )}
    </GlassShell>
  );
}
