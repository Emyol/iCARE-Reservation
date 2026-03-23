"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "@/components/AdminProvider";
import AdminLoginModal from "@/components/AdminLoginModal";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function ReportsPage() {
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

  const total = reservations.length;
  const avrCount = reservations.filter((r) =>
    r.room.toLowerCase().includes("audio-visual"),
  ).length;
  const trainingCount = total - avrCount;

  // Group by month
  const byMonth = reservations.reduce((acc, r) => {
    const key = new Date(r.startTime).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const monthEntries = Object.entries(byMonth).sort(
    (a, b) => new Date(b[0]) - new Date(a[0]),
  );

  const stats = [
    {
      label: "Total Reservations",
      value: total,
      icon: "check_circle",
      color: "emerald",
    },
    {
      label: "Audio-Visual Room",
      value: avrCount,
      icon: "videocam",
      color: "blue",
    },
    {
      label: "Training Room",
      value: trainingCount,
      icon: "groups",
      color: "amber",
    },
  ];

  const colorMap = {
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "hover:border-emerald-500/20",
    },
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "hover:border-blue-500/20",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "hover:border-amber-500/20",
    },
  };

  function handleLogin(adminInfo) {
    login(adminInfo);
    setShowLoginModal(false);
  }

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
              <span className="text-teal-400">iCARE</span> Reports
            </h2>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              Reservation Reports
            </h3>
            <p className="text-slate-400 text-sm">
              Overall booking statistics from Google Sheets data.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((s) => {
              const c = colorMap[s.color];
              return (
                <div
                  key={s.label}
                  className={`glass-panel/60 p-6 rounded-xl border border-white/5 ${c.border} flex items-center gap-4 transition-colors`}
                >
                  <div
                    className={`size-12 rounded-lg ${c.bg} flex items-center justify-center`}
                  >
                    <span className={`material-symbols-outlined ${c.text}`}>
                      {s.icon}
                    </span>
                  </div>
                  <div>
                    {loading ? (
                      <div className="skeleton w-10 h-7 rounded mb-1" />
                    ) : (
                      <p className="text-2xl font-bold">{s.value}</p>
                    )}
                    <p className="text-xs text-slate-500 font-medium">
                      {s.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bookings by Month */}
          <div className="glass-panel/60 rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">
                calendar_month
              </span>
              <h4 className="text-sm font-semibold text-slate-200">
                Bookings by Month
              </h4>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-8 rounded" />
                ))}
              </div>
            ) : monthEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No data available
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {monthEntries.map(([month, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div
                      key={month}
                      className="px-4 py-3 flex items-center gap-4"
                    >
                      <span className="text-sm text-slate-300 w-40 shrink-0">
                        {month}
                      </span>
                      <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-teal-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-200 w-8 text-right">
                        {count}
                      </span>
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
    </div>
  );
}

