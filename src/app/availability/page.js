"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/AdminProvider";
import Sidebar from "@/components/Sidebar";
import AdminLoginModal from "@/components/AdminLoginModal";
import BookingModal from "@/components/BookingModal";
import ReservationDetailModal from "@/components/ReservationDetailModal";
import DayGrid from "@/components/availability/DayGrid";
import DayAgenda from "@/components/availability/DayAgenda";
import WeekGrid from "@/components/availability/WeekGrid";
import FindTime from "@/components/availability/FindTime";
import RequestSlotDialog from "@/components/availability/RequestSlotDialog";
import { manilaNow } from "@/lib/reservationRules";
import {
  addDays,
  bookingsOn,
  formatClock,
  hoursFor,
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

const longDate = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function AvailabilityPage() {
  const { isAdmin, login, logout } = useAdmin();
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
    onSelectBooking: setSelected,
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar isAdmin={isAdmin} onLoginClick={() => setShowLogin(true)} onLogout={logout} />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-black/10 backdrop-blur-md border-b border-white/10 flex items-center px-4 md:px-8 sticky top-0 z-30">
          <h1 className="text-lg md:text-xl font-bold tracking-tight">
            <span className="text-teal-400">iCARE</span> Availability
          </h1>
        </header>

        <div className="p-4 md:p-8 flex flex-col gap-5 max-w-7xl mx-auto w-full">
          {/* Date navigation and view switch */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label={view === "week" ? "Previous week" : "Previous day"}
                onClick={() => setDate(addDays(date, -step))}
                className="size-11 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              >
                <span aria-hidden="true" className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => setDate(now.date)}
                className="h-11 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                Today
              </button>
              <button
                type="button"
                aria-label={view === "week" ? "Next week" : "Next day"}
                onClick={() => setDate(addDays(date, step))}
                className="size-11 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              >
                <span aria-hidden="true" className="material-symbols-outlined">chevron_right</span>
              </button>
              <label htmlFor="availability-go-to" className="sr-only">Go to date</label>
              <input
                id="availability-go-to"
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="h-11 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-200 [color-scheme:dark]"
              />
            </div>
            <div role="group" aria-label="View" className="flex rounded-lg border border-white/10 bg-white/5 p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={view === v.id}
                  onClick={() => setView(v.id)}
                  className={`min-h-9 rounded-md px-3 text-sm font-medium ${
                    view === v.id ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold text-white">
              {view === "week"
                ? `Week of ${longDate(weekStart)}`
                : view === "find"
                  ? "Find a free room"
                  : `${isToday ? "Today, " : ""}${longDate(date)}`}
            </h2>
            <p className="text-xs text-slate-400" role="status">
              {status === "loading" && "Loading the schedule…"}
              {status === "ready" && `Updated ${updatedAt} · times in PH time`}
            </p>
          </div>

          {status === "error" && (
            <div role="alert" className="status-message status-message-warning flex-wrap justify-between">
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
                className="rounded-lg border border-amber-300/40 px-3 py-1.5 text-sm font-semibold hover:bg-amber-500/10"
              >
                Retry
              </button>
            </div>
          )}

          {status !== "error" && view !== "find" && (
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300" aria-label="Legend">
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-5 rounded-sm border border-dashed border-emerald-400" />
                Free
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-5 rounded-sm border border-l-4 border-indigo-400 bg-indigo-500/20" />
                Booked
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-5 rounded-sm border border-l-4 border-red-400 bg-red-500/15" />
                Overlapping bookings (marked &ldquo;Conflict&rdquo;)
              </li>
            </ul>
          )}

          {status === "loading" && reservations.length === 0 ? (
            <div className="flex flex-col gap-3" aria-hidden="true">
              <div className="skeleton h-20 rounded-xl" />
              <div className="skeleton h-20 rounded-xl" />
            </div>
          ) : view === "day" ? (
            <>
              {isPast && <p className="text-sm text-slate-400">This day has passed. Bookings are shown for reference.</p>}
              {!isPast && dayBookings.length === 0 && status === "ready" && (
                <p className="status-message status-message-success">
                  Both rooms are free all day. Pick a free block to {isAdmin ? "book it" : "request it"}.
                </p>
              )}
              <div className="hidden md:block">
                <DayGrid {...dayProps} />
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
            <FindTime
              reservations={reservations}
              now={now}
              canAct={status === "ready"}
              isAdmin={isAdmin}
              onPick={pickSlot}
            />
          )}
        </div>

        <footer className="mt-auto px-8 py-6 border-t border-white/5 text-center">
          <p className="text-slate-400 text-xs">
            © {new Date().getFullYear()} iCARE Room Reservation System — FEU Institute of Technology
          </p>
        </footer>
      </main>

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
    </div>
  );
}
