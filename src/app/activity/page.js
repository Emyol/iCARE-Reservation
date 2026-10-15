"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RotateCw } from "lucide-react";
import { useAdmin } from "@/components/AdminProvider";
import GlassShell from "@/components/glass/GlassShell";
import GlassSegmented from "@/components/glass/GlassSegmented";
import StaffOnly from "@/components/glass/StaffOnly";
import { dealIn } from "@/components/glass/motion";
import AdminLoginModal from "@/components/AdminLoginModal";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "CREATE", label: "Created" },
  { id: "EDIT", label: "Edited" },
  { id: "DELETE", label: "Deleted" },
];

const ACTION = {
  CREATE: { label: "Created", pill: "lg-pill-confirmed" },
  EDIT: { label: "Edited", pill: "lg-pill-pending" },
  DELETE: { label: "Deleted", pill: "lg-pill-conflict" },
};

export default function ActivityPage() {
  const { isAdmin, login } = useAdmin();
  const [showLogin, setShowLogin] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [filter, setFilter] = useState("all");

  const [nonce, setNonce] = useState(0); // bumped by Retry

  // Staff only; a response from an earlier load is dropped.
  useEffect(() => {
    if (!isAdmin) return;
    let live = true;
    async function load() {
      try {
        const res = await fetch("/api/activity");
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const rows = await res.json();
        if (!live) return;
        setLogs(rows);
        setStatus("ready");
      } catch {
        if (live) setStatus("error");
      }
    }
    load();
    return () => {
      live = false;
    };
  }, [isAdmin, nonce]);

  const signIn = () => setShowLogin(true);
  // The log is stored oldest first.
  const shown = (filter === "all" ? logs : logs.filter((l) => l.action === filter)).slice().reverse();

  return (
    <GlassShell onSignIn={isAdmin ? null : signIn}>
      <div className="lg-chrome flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="mr-auto">
          <h1 className="lg-title">Activity</h1>
          <p className="text-[13px] lg-muted">Bookings staff created, edited and deleted, newest first.</p>
        </div>
        {isAdmin && (
          <GlassSegmented label="Show" options={FILTERS} value={filter} onChange={setFilter} />
        )}
      </div>

      {!isAdmin ? (
        <StaffOnly what="the activity log" onSignIn={signIn} />
      ) : status === "error" ? (
        <div role="alert" className="lg-banner">
          <p>
            <strong>Couldn&apos;t load the activity log.</strong> Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setNonce((n) => n + 1);
            }}
            className="lg-btn lg-btn-secondary"
          >
            <RotateCw aria-hidden="true" className="size-4" strokeWidth={2} />
            Retry
          </button>
        </div>
      ) : status === "loading" ? (
        <div className="lg-pass h-40 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
      ) : shown.length === 0 ? (
        <section className="lg-pass p-6">
          <h2 className="lg-title">{filter === "all" ? "Nothing recorded yet" : `Nothing ${ACTION[filter].label.toLowerCase()} yet`}</h2>
          <p className="mt-1 lg-muted">Changes staff make to bookings in this app show up here.</p>
        </section>
      ) : (
        // Keyed by the filter so switching it deals the matching entries in, newest first.
        <ul key={filter} className="lg-sheet flex flex-col p-2">
          {shown.map((log, i) => {
            const action = ACTION[log.action] || { label: log.action, pill: "lg-pill-void" };
            return (
              <motion.li
                key={`${log.timestamp}-${i}`}
                {...dealIn(i)}
                className="grid gap-x-4 gap-y-1 border-t border-[var(--lg-line)] px-4 py-3 first:border-t-0 sm:grid-cols-[96px_minmax(0,1fr)_auto]"
              >
                <span className={`lg-pill ${action.pill} self-start justify-self-start`}>{action.label}</span>
                <span className="min-w-0">
                  {log.details && <span className="block break-words text-[15px] font-semibold">{log.details}</span>}
                  <span className="text-[13px] lg-muted">
                    by {log.admin}
                    {log.targetRow ? `, sheet row ${log.targetRow}` : ""}
                  </span>
                </span>
                <span className="text-[13px] lg-muted lg-num sm:text-right">{log.timestamp}</span>
              </motion.li>
            );
          })}
        </ul>
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
    </GlassShell>
  );
}
