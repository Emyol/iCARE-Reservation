"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "@/components/AdminProvider";
import AdminLoginModal from "@/components/AdminLoginModal";
import EmailModal from "@/components/EmailModal";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function SchedulePage() {
  const { isAdmin, login, logout } = useAdmin();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [emailTarget, setEmailTarget] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
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

  const filtered = reservations.filter((r) => {
    // Compare using local date to avoid UTC conversion shifting the date
    const d = new Date(r.startTime);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}` === selectedDate;
  });

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  function handleLogin(adminInfo) {
    login(adminInfo);
    setShowLoginModal(false);
  }

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

        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                Reservation Schedule
              </h3>
              <p className="text-slate-400 text-sm">
                Browse all bookings by date.
              </p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 bg-slate-800/50 border border-slate-700 rounded-lg px-4 text-slate-100 focus:ring-2 focus:ring-[#0f49bd]/50 focus:border-[#0f49bd] outline-none [color-scheme:dark]"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

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
                      className={`glass-panel/60 rounded-xl border p-4 flex items-center gap-4 ${
                        isAVR ? "border-emerald-500/20" : "border-blue-500/20"
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
                            {formatTime(r.startTime)} – {formatTime(r.endTime)}
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
    </div>
  );
}

