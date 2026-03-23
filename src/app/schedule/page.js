"use client";

import { useState, useEffect, useMemo } from "react";
import { isSameDay } from "date-fns";
import { useAdmin } from "@/components/AdminProvider";
import AdminLoginModal from "@/components/AdminLoginModal";
import EmailModal from "@/components/EmailModal";
import ReservationDetailModal from "@/components/ReservationDetailModal";
import Sidebar from "@/components/Sidebar";
import { FullScreenCalendar } from "@/components/ui/fullscreen-calendar";
import Link from "next/link";

export default function SchedulePage() {
  const { isAdmin, login, logout } = useAdmin();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  async function fetchData() {
    try {
      const res = await fetch("/api/reservations", { cache: "no-store" });
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

  // Transform reservations into calendar data format
  const calendarData = useMemo(() => {
    const dateMap = {};
    reservations.forEach((r) => {
      const d = new Date(r.startTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!dateMap[key]) {
        dateMap[key] = {
          day: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          events: [],
        };
      }
      const startTime = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTime = new Date(r.endTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      dateMap[key].events.push({
        id: r.rowIndex || key + "-" + dateMap[key].events.length,
        name: r.eventName,
        time: `${startTime} – ${endTime}`,
        datetime: r.startTime,
        room: r.room,
        _raw: r,
      });
    });
    return Object.values(dateMap);
  }, [reservations]);

  // Filtered list for selected date
  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const d = new Date(r.startTime);
      const dayDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return isSameDay(dayDate, selectedDate);
    });
  }, [reservations, selectedDate]);

  function handleLogin(adminInfo) {
    login(adminInfo);
    setShowLoginModal(false);
  }

  function handleEventClick(event) {
    if (event._raw) {
      setSelectedReservation(event._raw);
    }
  }

  function handleDaySelect(day) {
    setSelectedDate(day);
  }

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
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

        <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Fullscreen Calendar */}
          <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
            <FullScreenCalendar
              data={calendarData}
              onEventClick={handleEventClick}
              onDaySelect={handleDaySelect}
            />
          </div>

          {/* Selected Day Reservations */}
          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-teal-400">
                event
              </span>
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
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
              <div className="glass-panel rounded-xl border border-white/5 p-12 text-center">
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
                        className={`w-full text-left glass-panel rounded-xl border p-4 flex items-center gap-4 transition-all hover:scale-[1.01] cursor-pointer ${
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
