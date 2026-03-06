"use client";

import { useState, useEffect, useMemo } from "react";
import { useAdmin } from "@/components/AdminProvider";
import AdminLoginModal from "@/components/AdminLoginModal";
import EmailModal from "@/components/EmailModal";
import ReservationDetailModal from "@/components/ReservationDetailModal";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function SchedulePage() {
  const { isAdmin, login, logout } = useAdmin();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(
    today.toISOString().slice(0, 10),
  );

  async function fetchData() {
    try {
      const res = await fetch("/api/reservations");
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data = await res.json();
      setReservations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    const days = [];
    // Leading blank cells
    for (let i = 0; i < startDow; i++) days.push(null);
    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, dateStr });
    }
    return days;
  }, [viewYear, viewMonth]);

  // Map date -> reservations
  const reservationsByDate = useMemo(() => {
    const map = {};
    reservations.forEach((r) => {
      const d = new Date(r.startTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [reservations]);

  // Filtered list for selected date
  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const d = new Date(r.startTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return key === selectedDate;
    });
  }, [reservations, selectedDate]);

  function handleLogin(adminInfo) {
    login(adminInfo);
    setShowLoginModal(false);
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

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
        <header className="h-16 bg-black/10 backdrop-blur-md border-b border-white/10 flex items-center px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_back
              </span>
            </Link>
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              <span className="text-teal-400">iCARE</span> Schedule
            </h2>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">
              Reservation Calendar
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="size-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_left
                </span>
              </button>
              <span className="text-sm font-semibold text-slate-200 w-40 text-center">
                {monthName}
              </span>
              <button
                onClick={nextMonth}
                className="size-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_right
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Calendar Grid */}
          <div className="glass-panel/60 rounded-xl border border-white/5 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-white/5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="p-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="p-2 min-h-[72px] border-b border-r border-white/5 bg-white/[0.01]"
                    />
                  );
                }
                const { day, dateStr } = cell;
                const dayReservations = reservationsByDate[dateStr] || [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                const avrCount = dayReservations.filter((r) =>
                  r.room?.toLowerCase().includes("audio-visual"),
                ).length;
                const trainingCount = dayReservations.length - avrCount;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-2 min-h-[72px] border-b border-r border-white/5 text-left transition-colors relative group ${
                      isSelected
                        ? "bg-indigo-500/10 border-indigo-500/30"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium inline-flex items-center justify-center size-7 rounded-full ${
                        isToday
                          ? "bg-teal-500 text-white font-bold"
                          : isSelected
                            ? "text-indigo-300"
                            : "text-slate-300"
                      }`}
                    >
                      {day}
                    </span>
                    {dayReservations.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {avrCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <span className="text-[9px] text-emerald-400 font-medium">
                              {avrCount}
                            </span>
                          </span>
                        )}
                        {trainingCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="size-2 rounded-full bg-blue-500" />
                            <span className="text-[9px] text-blue-400 font-medium">
                              {trainingCount}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              Audio-Visual Room
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-blue-500" />
              Training Room
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-5 rounded-full bg-teal-500 text-white text-[8px] flex items-center justify-center font-bold">
                D
              </span>
              Today
            </span>
          </div>

          {/* Selected Day Reservations */}
          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-teal-400">
                event
              </span>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                },
              )}
              <span className="text-slate-600 font-normal ml-1">
                ({filtered.length} reservation{filtered.length !== 1 ? "s" : ""}
                )
              </span>
            </h4>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-20 rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-panel/60 rounded-xl border border-white/5 p-12 text-center">
                <span className="material-symbols-outlined text-slate-600 text-4xl mb-3 block">
                  event_busy
                </span>
                <p className="text-slate-500 text-sm font-medium">
                  No reservations on this date
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered
                  .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                  .map((r, i) => {
                    const isAVR = r.room.toLowerCase().includes("audio-visual");
                    return (
                      <div
                        key={i}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedReservation(r)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            setSelectedReservation(r);
                        }}
                        className={`w-full text-left glass-panel/60 rounded-xl border p-4 flex items-center gap-4 transition-all hover:scale-[1.01] cursor-pointer ${
                          isAVR
                            ? "border-emerald-500/20 hover:border-emerald-500/40"
                            : "border-blue-500/20 hover:border-blue-500/40"
                        }`}
                      >
                        <div
                          className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isAVR ? "bg-emerald-500/10" : "bg-blue-500/10"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[20px] ${
                              isAVR ? "text-emerald-400" : "text-blue-400"
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmailTarget(r);
                              }}
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
                                {r.emailSent ? "mark_email_read" : "mail"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
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
      {emailTarget && (
        <EmailModal
          reservation={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSent={() => {
            fetchData();
          }}
        />
      )}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onUpdate={() => {
            setSelectedReservation(null);
            setLoading(true);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
