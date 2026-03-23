"use client";

import { useState, useEffect, useMemo } from "react";
import { useAdmin } from "@/components/AdminProvider";
import AdminLoginModal from "@/components/AdminLoginModal";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function ConflictsPage() {
  const { isAdmin, login, logout } = useAdmin();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
    fetchData();
  }, []);

  function handleLogin(adminInfo) {
    login(adminInfo);
    setShowLoginModal(false);
  }

  // Find all conflicts: pairs of overlapping reservations in the same room
  const conflicts = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < reservations.length; i++) {
      for (let j = i + 1; j < reservations.length; j++) {
        const a = reservations[i];
        const b = reservations[j];
        if (a.room !== b.room) continue;
        const aStart = new Date(a.startTime);
        const aEnd = new Date(a.endTime);
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        if (aStart < bEnd && aEnd > bStart) {
          pairs.push({ a, b });
        }
      }
    }
    // Sort by date (most recent first)
    pairs.sort((x, y) => new Date(y.a.startTime) - new Date(x.a.startTime));
    return pairs;
  }, [reservations]);

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const parseTimestamp = (ts) => {
    if (!ts) return null;
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "N/A";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

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
              href="/dashboard"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_back
              </span>
            </Link>
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              <span className="text-teal-400">iCARE</span> Conflict Detection
            </h2>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              Schedule Conflicts
            </h3>
            <p className="text-slate-400 text-sm">
              Automatically detects overlapping reservations for the same room.
            </p>
          </div>

          {!isAdmin && (
            <div className="glass-panel/60 rounded-xl border border-amber-500/20 p-8 text-center">
              <span className="material-symbols-outlined text-amber-400 text-4xl mb-3 block">
                shield
              </span>
              <p className="text-amber-400 font-semibold text-sm">
                Admin access required
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Log in as an admin to view schedule conflicts.
              </p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-white auro-button rounded-lg"
              >
                Admin Login
              </button>
            </div>
          )}

          {isAdmin && error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {isAdmin && loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          )}

          {isAdmin && !loading && conflicts.length === 0 && (
            <div className="glass-panel/60 rounded-xl border border-emerald-500/20 p-12 text-center">
              <span className="material-symbols-outlined text-emerald-400 text-5xl mb-3 block">
                check_circle
              </span>
              <p className="text-emerald-400 font-semibold text-lg">
                No conflicts detected!
              </p>
              <p className="text-slate-500 text-sm mt-1">
                All reservations are scheduled without overlaps.
              </p>
            </div>
          )}

          {isAdmin && !loading && conflicts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-red-400 text-[20px]">
                  warning
                </span>
                <span className="text-sm font-semibold text-red-400">
                  {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}{" "}
                  found
                </span>
              </div>

              {conflicts.map(({ a, b }, idx) => {
                // Determine priority based on submission timestamp
                const aTs = parseTimestamp(a.timestamp);
                const bTs = parseTimestamp(b.timestamp);
                let aPriority = null;
                let bPriority = null;
                if (aTs && bTs) {
                  if (aTs < bTs) {
                    aPriority = true;
                    bPriority = false;
                  } else if (bTs < aTs) {
                    bPriority = true;
                    aPriority = false;
                  }
                }
                const priorities = [aPriority, bPriority];

                return (
                  <div
                    key={idx}
                    className="glass-panel/60 rounded-xl border border-red-500/20 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-red-500/10 bg-red-500/5 flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-400 text-[18px]">
                        schedule
                      </span>
                      <span
                        className="text-sm font-medium text-slate-300"
                        suppressHydrationWarning
                      >
                        {formatDate(a.startTime)} — {a.room?.split(" /")[0]}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[a, b].map((r, i) => {
                        const hasPriority = priorities[i];
                        return (
                          <div
                            key={i}
                            className={`p-3 rounded-lg border ${
                              hasPriority === true
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : hasPriority === false
                                  ? "border-red-500/20 bg-red-500/5"
                                  : i === 0
                                    ? "border-red-500/20 bg-red-500/5"
                                    : "border-amber-500/20 bg-amber-500/5"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {hasPriority === true && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <span className="material-symbols-outlined text-[12px]">
                                    verified
                                  </span>
                                  Priority
                                </span>
                              )}
                              {hasPriority === false && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-500/15 text-red-400 border border-red-500/30">
                                  <span className="material-symbols-outlined text-[12px]">
                                    schedule
                                  </span>
                                  Later Submission
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-white truncate">
                              {r.eventName}
                            </p>
                            <p
                              className="text-xs text-slate-400 mt-1"
                              suppressHydrationWarning
                            >
                              {formatTime(r.startTime)} –{" "}
                              {formatTime(r.endTime)}
                            </p>
                            {r.fullName && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {r.fullName}
                              </p>
                            )}
                            <p
                              className="text-[10px] text-slate-600 mt-1.5"
                              suppressHydrationWarning
                            >
                              Submitted: {formatTimestamp(r.timestamp)}
                            </p>
                          </div>
                        );
                      })}
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
    </div>
  );
}
