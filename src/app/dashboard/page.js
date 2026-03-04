"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAdmin } from "@/components/AdminProvider";
import Sidebar from "@/components/Sidebar";
import TimelineChart from "@/components/TimelineChart";
import AdminLoginModal from "@/components/AdminLoginModal";
import BookingModal from "@/components/BookingModal";
import EmailModal from "@/components/EmailModal";

export default function DashboardPage() {
  const { isAdmin, adminInfo, login, logout } = useAdmin();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState(null);

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [view, setView] = useState("day"); // "day" | "week"
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const fetchReservations = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/reservations");
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data = await res.json();
      setReservations(data);
    } catch (err) {
      setError(err.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Close notification panel when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // All-time splits (for Quick Stats)
  const avrData = reservations.filter(
    (r) => r.room && r.room.toLowerCase().includes("audio-visual"),
  );
  const studyAreaData = reservations.filter(
    (r) => r.room && !r.room.toLowerCase().includes("audio-visual"),
  );

  // Today-only (Day view)
  const todayDateStr = new Date().toDateString();
  const avrTodayData = avrData.filter(
    (r) => new Date(r.startTime).toDateString() === todayDateStr,
  );
  const studyTodayData = studyAreaData.filter(
    (r) => new Date(r.startTime).toDateString() === todayDateStr,
  );

  // This-week range Mon–Sun (Week view)
  function getWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1));
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 7);
    return { start: mon, end: sun };
  }
  const { start: weekStart, end: weekEnd } = getWeekRange();
  const weekData = reservations.filter((r) => {
    const d = new Date(r.startTime);
    return d >= weekStart && d < weekEnd;
  });
  const weekGrouped = weekData.reduce((acc, r) => {
    const key = new Date(r.startTime).toDateString();
    if (!acc[key]) acc[key] = { date: new Date(r.startTime), events: [] };
    acc[key].events.push(r);
    return acc;
  }, {});
  const weekDays = Object.values(weekGrouped).sort((a, b) => a.date - b.date);

  // Recent reservations for notification panel (latest 5 by startTime)
  const recentReservations = [...reservations]
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .slice(0, 5);

  function handleLogin(adminInfo) {
    login(adminInfo);
    setShowLoginModal(false);
  }

  function handleBooked() {
    setShowBookingModal(false);
    setLoading(true);
    fetchReservations();
  }

  const totalBookings = reservations.length;
  const avrBookings = avrData.length;
  const studyBookings = studyAreaData.length;

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex min-h-screen">
      <Sidebar
        isAdmin={isAdmin}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={logout}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-black/10 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              <span className="text-teal-400">iCARE</span> Dashboard
            </h2>
            <div className="relative w-64 hidden md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-[#0f49bd]/40 focus:outline-none"
                placeholder="Search rooms, staff..."
                type="text"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setShowBookingModal(true)}
                className="flex items-center gap-2 px-4 py-2 auro-button text-white text-sm font-semibold rounded-lg shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[20px]">
                  add
                </span>
                <span className="hidden sm:inline">Add Booking</span>
              </button>
            )}

            {!isAdmin && (
              <button
                onClick={() => setShowLoginModal(true)}
                className="lg:hidden flex items-center gap-1 px-3 py-2 text-sm text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  login
                </span>
                <span className="hidden sm:inline">Login</span>
              </button>
            )}

            {/* Day / Week Toggle */}
            <div className="hidden sm:flex bg-white/5 p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setView("day")}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === "day"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === "week"
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Week
              </button>
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className="size-10 flex items-center justify-center text-slate-400 hover:bg-white/5 rounded-full transition-colors relative"
              >
                <span className="material-symbols-outlined">notifications</span>
                {recentReservations.length > 0 && (
                  <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full pulse-dot" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-12 right-0 w-80 glass-panel border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-white/5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">
                      Recent Reservations
                    </span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        close
                      </span>
                    </button>
                  </div>
                  <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                    {recentReservations.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500 text-center">
                        No reservations yet
                      </p>
                    ) : (
                      recentReservations.map((r, i) => {
                        const isAVR = r.room
                          .toLowerCase()
                          .includes("audio-visual");
                        return (
                          <div key={i} className="p-3 flex items-start gap-3">
                            <div
                              className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isAVR ? "bg-emerald-500/10" : "bg-blue-500/10"
                              }`}
                            >
                              <span
                                className={`material-symbols-outlined text-[16px] ${
                                  isAVR ? "text-emerald-400" : "text-blue-400"
                                }`}
                              >
                                {isAVR ? "videocam" : "groups"}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">
                                {r.eventName}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {r.room.split(" /")[0]}
                              </p>
                              <p
                                suppressHydrationWarning
                                className="text-[10px] text-slate-500 mt-0.5"
                              >
                                {new Date(r.startTime).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" },
                                )}{" "}
                                · {formatTime(r.startTime)} –{" "}
                                {formatTime(r.endTime)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span className="material-symbols-outlined text-red-400">
                error
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">
                  Failed to load reservations
                </p>
                <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
              </div>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchReservations();
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Day view — Gantt charts */}
          {view === "day" && (
            <>
              <TimelineChart
                title="Audio-Visual Room Schedule"
                icon="videocam"
                iconColor="text-emerald-500"
                data={avrTodayData}
                accentColor="emerald"
                loading={loading}
              />
              <TimelineChart
                title="Individual Training Room Schedule"
                icon="auto_stories"
                iconColor="text-amber-500"
                data={studyTodayData}
                accentColor="blue"
                legend={[
                  { color: "bg-blue-500", label: "Group Study" },
                  { color: "bg-amber-500", label: "Reserved Area" },
                ]}
                loading={loading}
              />
            </>
          )}

          {/* Week view — day-by-day list */}
          {view === "week" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-teal-400">
                  calendar_view_week
                </span>
                <h3 className="text-lg font-bold">
                  This Week&apos;s Reservations
                </h3>
                <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5 ml-auto">
                  {weekStart.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  –{" "}
                  {new Date(weekEnd.getTime() - 1).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-20 rounded-xl" />
                  ))}
                </div>
              ) : weekDays.length === 0 ? (
                <div className="glass-panel p-12 text-center">
                  <span className="material-symbols-outlined text-slate-600 text-4xl mb-3 block">
                    event_available
                  </span>
                  <p className="text-slate-500 text-sm font-medium">
                    No reservations this week
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {weekDays.map(({ date, events }) => (
                    <div key={date.toDateString()}>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        {date.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                        {date.toDateString() === todayDateStr && (
                          <span className="ml-2 text-teal-400 normal-case tracking-normal font-semibold">
                            Today
                          </span>
                        )}
                      </p>
                      <div className="space-y-2">
                        {events
                          .sort(
                            (a, b) =>
                              new Date(a.startTime) - new Date(b.startTime),
                          )
                          .map((r, i) => {
                            const isAVR = r.room
                              .toLowerCase()
                              .includes("audio-visual");
                            return (
                              <div
                                key={i}
                                className={`glass-panel/60 rounded-xl border p-4 flex items-center gap-4 ${
                                  isAVR
                                    ? "border-emerald-500/20"
                                    : "border-blue-500/20"
                                }`}
                              >
                                <div
                                  className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                                    isAVR
                                      ? "bg-emerald-500/10"
                                      : "bg-blue-500/10"
                                  }`}
                                >
                                  <span
                                    className={`material-symbols-outlined text-[20px] ${
                                      isAVR
                                        ? "text-emerald-400"
                                        : "text-blue-400"
                                    }`}
                                  >
                                    {isAVR ? "videocam" : "groups"}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">
                                    {r.eventName}
                                  </p>
                                  <p className="text-xs text-slate-400 truncate">
                                    {r.room}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 flex items-center gap-2">
                                  <div>
                                    <p
                                      suppressHydrationWarning
                                      className="text-sm font-medium text-slate-200"
                                    >
                                      {formatTime(r.startTime)} –{" "}
                                      {formatTime(r.endTime)}
                                    </p>
                                    {r.fullName && (
                                      <p className="text-xs text-slate-500 mt-0.5">
                                        {r.fullName}
                                      </p>
                                    )}
                                  </div>
                                  {isAdmin && (
                                    <button
                                      onClick={() => setEmailTarget(r)}
                                      className={`size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                        r.emailSent
                                          ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                          : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                                      }`}
                                      title={
                                        r.emailSent
                                          ? "Email already sent — click to resend"
                                          : "Send email to reservant"
                                      }
                                    >
                                      <span className="material-symbols-outlined text-[16px]">
                                        {r.emailSent
                                          ? "mark_email_read"
                                          : "mail"}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="glass-panel p-6 flex items-center gap-4 hover:border-emerald-500/20 transition-colors">
              <div className="size-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-500">
                  check_circle
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBookings}</p>
                <p className="text-xs text-slate-500 font-medium">
                  Total Reservations
                </p>
              </div>
            </div>

            <div className="glass-panel p-6 flex items-center gap-4 hover:border-[#0f49bd]/20 transition-colors">
              <div className="size-12 rounded-lg bg-[#0f49bd]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#0f49bd]">
                  videocam
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold">{avrBookings}</p>
                <p className="text-xs text-slate-500 font-medium">
                  Audio-Visual Bookings
                </p>
              </div>
            </div>

            <div className="glass-panel p-6 flex items-center gap-4 hover:border-amber-500/20 transition-colors">
              <div className="size-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-500">
                  auto_stories
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold">{studyBookings}</p>
                <p className="text-xs text-slate-500 font-medium">
                  Individual Training Bookings
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-auto px-8 py-6 border-t border-white/5 text-center">
          <p className="text-slate-500 text-xs">
            © {new Date().getFullYear()} iCARE Room Reservation System — FEU
            Institute of Technology
          </p>
        </footer>
      </main>

      {showLoginModal && (
        <AdminLoginModal
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      )}
      {showBookingModal && (
        <BookingModal
          onClose={() => setShowBookingModal(false)}
          onBooked={handleBooked}
        />
      )}
      {emailTarget && (
        <EmailModal
          reservation={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSent={() => {
            fetchReservations();
          }}
        />
      )}
    </div>
  );
}
