"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Plus, RotateCw } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import GlassShell from "@/components/glass/GlassShell";
import AdminLoginModal from "@/components/AdminLoginModal";
import BookingModal from "@/components/BookingModal";
import ReservationDetailModal from "@/components/ReservationDetailModal";
import EmailModal from "@/components/EmailModal";
import DayGrid from "@/components/availability/DayGrid";
import DayAgenda from "@/components/availability/DayAgenda";
import WeekGrid from "@/components/availability/WeekGrid";
import FindTime from "@/components/availability/FindTime";
import RequestSlotDialog from "@/components/availability/RequestSlotDialog";
import PassStack from "@/components/availability/PassStack";
import { useMediaQuery } from "@/hooks/use-media-query";
import { manilaNow } from "@/lib/reservationRules";
import {
  addDays,
  bookingsOn,
  formatClock,
  hoursFor,
  inRoom,
  layoutLanes,
  roomsFor,
  startOfWeek,
  toClockInput,
} from "@/lib/availability";

const VIEWS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "find", label: "Find a time" },
];

function currentNow() {
  const stamp = manilaNow();
  return { date: stamp.slice(0, 10), minutes: Number(stamp.slice(11, 13)) * 60 + Number(stamp.slice(14, 16)) };
}

// Same key for a booking whether it comes from the grid or the pass list.
const bookingKey = (b) => String(b.rowIndex ?? `${b.room}-${b.start}-${b.end}`);

const longDate = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 px-1 text-[13px] font-medium" aria-label="Legend">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-4 w-7 rounded-md border-2 border-dashed border-[var(--lg-free)] bg-[var(--lg-free-soft)]" />
        Free
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-4 w-7 rounded-md border border-[var(--lg-rim)] bg-[var(--lg-pass-fill)] shadow-[var(--lg-shadow-soft)]" />
        Booked
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-4 w-7 rounded-md border border-[var(--lg-danger)] bg-[var(--lg-danger-soft)]" />
        Overlapping bookings (marked &ldquo;Conflict&rdquo;)
      </li>
    </ul>
  );
}

export default function AvailabilityPage() {
  const { isAdmin, login } = useAdmin();
  const [now, setNow] = useState(currentNow);
  const [date, setDate] = useState(() => currentNow().date);
  const [view, setView] = useState("day");
  const [reservations, setReservations] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [updatedAt, setUpdatedAt] = useState(null);

  const [showLogin, setShowLogin] = useState(false);
  const [requestSlot, setRequestSlot] = useState(null);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [selected, setSelected] = useState(null);
  const [emailTarget, setEmailTarget] = useState(null);
  const [frontKey, setFrontKey] = useState(null);
  const isWide = useMediaQuery("(min-width: 1024px)");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/reservations", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      setReservations(await res.json());
      setUpdatedAt(formatClock(currentNow().minutes));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  // Refetch when admin state changes: the API returns full rows only to admins.
  useEffect(() => {
    fetchData();
    const refresh = setInterval(fetchData, 60_000);
    const tick = setInterval(() => setNow(currentNow()), 60_000);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [fetchData, isAdmin]);

  const dayBookings = bookingsOn(reservations, date);
  const rooms = roomsFor(dayBookings);
  const hours = hoursFor(dayBookings);
  // Staff pass column: every booking that day, overlaps first.
  const passes = isAdmin
    ? rooms
        .flatMap((room) => {
          const { items } = layoutLanes(inRoom(dayBookings, room.value));
          return items.map((b) => ({
            ...b,
            key: bookingKey(b),
            roomLabel: room.label,
            overlapsWith: items
              .filter((o) => o !== b && o.start < b.end && b.start < o.end)
              .map((o) => o.eventName)
              .join(", "),
          }));
        })
        .sort((a, b) => Number(b.conflict) - Number(a.conflict) || a.start - b.start)
    : [];
  const showPassStack = isAdmin && isWide;
  const isToday = date === now.date;
  const isPast = date < now.date;
  const canAct = status === "ready" && !isPast;
  const dayProps = {
    rooms,
    bookings: dayBookings,
    hours,
    now: isToday ? now.minutes : null,
    notBefore: isToday ? now.minutes : isPast ? hours.end : null,
    canAct,
    isAdmin,
    onSelectBooking: showPassStack ? (b) => setFrontKey(bookingKey(b)) : setSelected,
    onSelectGap: (room, gap) => pickSlot({ room, date, start: gap.start, end: Math.min(gap.end, gap.start + 60) }),
  };

  function pickSlot({ room, date: slotDate, start, end }) {
    if (!room.capacity) return; // a room name the app doesn't know can't be booked
    if (isAdmin) {
      setBookingSlot({ room: room.value, date: slotDate, start: toClockInput(start), end: toClockInput(end) });
    } else {
      setRequestSlot({ room, date: slotDate, start, end });
    }
  }

  const step = view === "week" ? 7 : 1;
  const weekStart = startOfWeek(date);
  const heading =
    view === "week" ? `Week of ${longDate(weekStart)}` : view === "find" ? "Find a free room" : `${isToday ? "Today, " : ""}${longDate(date)}`;

  return (
    <GlassShell title="Availability" onSignIn={isAdmin ? null : () => setShowLogin(true)}>
      {/* Date navigation and view switch */}
      <div className="lg-chrome flex flex-wrap items-center gap-3 px-4 py-3">
        <h1 className="lg-title mr-auto">{heading}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label={view === "week" ? "Previous week" : "Previous day"}
            onClick={() => setDate(addDays(date, -step))}
            className="lg-btn lg-btn-secondary lg-btn-icon"
          >
            <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
          <button type="button" onClick={() => setDate(now.date)} className="lg-btn lg-btn-secondary">
            Today
          </button>
          <button
            type="button"
            aria-label={view === "week" ? "Next week" : "Next day"}
            onClick={() => setDate(addDays(date, step))}
            className="lg-btn lg-btn-secondary lg-btn-icon"
          >
            <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
          <label htmlFor="availability-go-to" className="sr-only">Go to date</label>
          <input
            id="availability-go-to"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="lg-input w-44"
          />
        </div>
        <div role="group" aria-label="View" className="lg-segmented">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setBookingSlot({ date: now.date })}
            className="lg-btn lg-btn-primary"
          >
            <Plus aria-hidden="true" className="size-5" strokeWidth={2} />
            New booking
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {status !== "error" && view !== "find" ? <Legend /> : <span />}
        <p className="text-[13px] lg-muted" role="status">
          {status === "loading" && "Loading the schedule…"}
          {status === "ready" && `Updated ${updatedAt}. Times are Philippine time.`}
        </p>
      </div>

      {status === "error" && (
        <div role="alert" className="lg-banner">
          <p>
            <strong>Couldn&apos;t load the schedule.</strong>{" "}
            {updatedAt ? `Showing the schedule as of ${updatedAt}. ` : ""}
            Requests and bookings are paused until it loads.
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
      )}

      {status === "loading" && reservations.length === 0 ? (
        <div className="lg-sheet flex flex-col gap-3 p-6" aria-hidden="true">
          <div className="h-16 animate-pulse rounded-[14px] bg-[var(--lg-line)] motion-reduce:animate-none" />
          <div className="h-16 animate-pulse rounded-[14px] bg-[var(--lg-line)] motion-reduce:animate-none" />
        </div>
      ) : view === "day" ? (
        <>
          {isPast && <p className="px-1 text-[15px] lg-muted">This day has passed. Bookings are shown for reference.</p>}
          {!isPast && dayBookings.length === 0 && status === "ready" && (
            <div className="lg-pass flex flex-wrap items-center gap-6 p-6">
              <Image src="/brand/glass-pass-empty.webp" alt="" width={140} height={140} className="rounded-2xl" />
              <div className="min-w-0 max-w-prose">
                <h2 className="lg-title">Both rooms are free all day</h2>
                <p className="mt-1 lg-muted">Pick a free block below to {isAdmin ? "book it" : "request it"}.</p>
              </div>
            </div>
          )}
          <div className={showPassStack ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]" : "hidden md:block"}>
            <div className="min-w-0">
              <DayGrid {...dayProps} />
            </div>
            {showPassStack && (
              <PassStack
                passes={passes}
                frontKey={frontKey}
                onFront={setFrontKey}
                onOpenDetails={setSelected}
                onEmail={setEmailTarget}
                dateLabel={new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", day: "numeric", month: "short" })}
              />
            )}
          </div>
          <div className="md:hidden">
            <DayAgenda {...dayProps} />
          </div>
        </>
      ) : view === "week" ? (
        <WeekGrid
          reservations={reservations}
          weekStart={weekStart}
          now={now}
          onOpenDay={(d) => {
            setDate(d);
            setView("day");
          }}
        />
      ) : (
        <FindTime reservations={reservations} now={now} canAct={status === "ready"} isAdmin={isAdmin} onPick={pickSlot} />
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
      {requestSlot && <RequestSlotDialog slot={requestSlot} onClose={() => setRequestSlot(null)} />}
      {bookingSlot && (
        <BookingModal
          initial={bookingSlot}
          onClose={() => setBookingSlot(null)}
          onBooked={() => {
            setBookingSlot(null);
            fetchData();
          }}
        />
      )}
      {emailTarget && (
        <EmailModal reservation={emailTarget} onClose={() => setEmailTarget(null)} onSent={() => fetchData()} />
      )}
      {selected && (
        <ReservationDetailModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => {
            setSelected(null);
            fetchData();
          }}
        />
      )}
    </GlassShell>
  );
}
