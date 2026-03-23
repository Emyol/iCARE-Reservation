"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "@/components/AdminProvider";
import AdminLoginModal from "@/components/AdminLoginModal";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function ActivityPage() {
  const { isAdmin, login, logout } = useAdmin();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // "all" | "CREATE" | "EDIT" | "DELETE"

  useEffect(() => {
    if (!isAdmin) return;
    async function fetchLogs() {
      try {
        const res = await fetch("/api/activity");
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [isAdmin]);

  function handleLogin(adminInfo) {
    login(adminInfo);
    setShowLoginModal(false);
  }

  const filtered =
    filter === "all" ? logs : logs.filter((l) => l.action === filter);
  // Reverse to show newest first
  const displayLogs = [...filtered].reverse();

  const actionConfig = {
    CREATE: {
      icon: "add_circle",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      label: "Created",
    },
    EDIT: {
      icon: "edit",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      label: "Edited",
    },
    DELETE: {
      icon: "delete",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      label: "Deleted",
    },
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
              <span className="text-teal-400">iCARE</span> Activity Log
            </h2>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                Audit Trail
              </h3>
              <p className="text-slate-400 text-sm">
                Track all admin actions — bookings created, edited, and deleted.
              </p>
            </div>
            {isAdmin && (
              <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                {["all", "CREATE", "EDIT", "DELETE"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filter === f
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isAdmin && (
            <div className="glass-panel/60 rounded-xl border border-amber-500/20 p-8 text-center">
              <span className="material-symbols-outlined text-amber-400 text-4xl mb-3 block">
                shield
              </span>
              <p className="text-amber-400 font-semibold text-sm">
                Admin access required
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
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          )}

          {isAdmin && !loading && displayLogs.length === 0 && (
            <div className="glass-panel/60 rounded-xl border border-white/5 p-12 text-center">
              <span className="material-symbols-outlined text-slate-600 text-4xl mb-3 block">
                history
              </span>
              <p className="text-slate-500 text-sm font-medium">
                No activity recorded yet
              </p>
            </div>
          )}

          {isAdmin && !loading && displayLogs.length > 0 && (
            <div className="space-y-2">
              {displayLogs.map((log, i) => {
                const cfg = actionConfig[log.action] || {
                  icon: "info",
                  color: "text-slate-400",
                  bg: "bg-white/5",
                  border: "border-white/10",
                  label: log.action,
                };
                return (
                  <div
                    key={i}
                    className={`glass-panel/60 rounded-xl border ${cfg.border} p-4 flex items-start gap-3`}
                  >
                    <div
                      className={`size-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}
                    >
                      <span
                        className={`material-symbols-outlined text-[18px] ${cfg.color}`}
                      >
                        {cfg.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          by {log.admin}
                        </span>
                        {log.targetRow && (
                          <span className="text-xs text-slate-600">
                            Row #{log.targetRow}
                          </span>
                        )}
                      </div>
                      {log.details && (
                        <p className="text-sm text-slate-300 mt-1 truncate">
                          {log.details}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">
                        {log.timestamp}
                      </p>
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
