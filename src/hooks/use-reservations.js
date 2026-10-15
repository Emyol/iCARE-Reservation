"use client";

import { useEffect, useState } from "react";

/**
 * Loads /api/reservations on mount, every `every` ms, when `isAdmin` changes
 * (admins get full rows, everyone else room and time only) and on reload().
 * A response from an earlier load is dropped, so a slow request can't
 * overwrite newer data.
 */
export function useReservations(isAdmin, every = 60_000) {
  const [reservations, setReservations] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadedAt, setLoadedAt] = useState(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const res = await fetch("/api/reservations", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
        const rows = await res.json();
        if (!live) return;
        setReservations(rows);
        setLoadedAt(new Date());
        setStatus("ready");
      } catch {
        if (live) setStatus("error");
      }
    }
    load();
    const refresh = setInterval(load, every);
    return () => {
      live = false;
      clearInterval(refresh);
    };
  }, [isAdmin, every, nonce]);

  const reload = () => setNonce((n) => n + 1);
  // For a Retry button: show loading again while it tries.
  const retry = () => {
    setStatus("loading");
    reload();
  };
  return { reservations, status, loadedAt, reload, retry };
}
