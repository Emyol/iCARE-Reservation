"use client";

import { useState, useMemo } from "react";

const ROOM_OPTIONS = [
  {
    value: "Audio-Visual Room / Enhancement Area (Capacity: 40)",
    label: "Audio-Visual Room",
  },
  {
    value: "Individual Training / Small Group Discussion Room (Capacity: 10)",
    label: "Training Room",
  },
];

export default function AvailabilityChecker({ reservations = [] }) {
  const [room, setRoom] = useState(ROOM_OPTIONS[0].value);
  const [date, setDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [checked, setChecked] = useState(false);

  const conflicts = useMemo(() => {
    if (!checked) return [];
    const queryStart = new Date(`${date}T${startTime}:00`);
    const queryEnd = new Date(`${date}T${endTime}:00`);
    if (isNaN(queryStart) || isNaN(queryEnd) || queryEnd <= queryStart)
      return [];

    return reservations.filter((r) => {
      if (r.room !== room) return false;
      const rStart = new Date(r.startTime);
      const rEnd = new Date(r.endTime);
      // Check same date using local date components to avoid UTC offset shifting the date
      const rDate = `${rStart.getFullYear()}-${String(rStart.getMonth() + 1).padStart(2, "0")}-${String(rStart.getDate()).padStart(2, "0")}`;
      if (rDate !== date) return false;
      // Check overlap
      return queryStart < rEnd && queryEnd > rStart;
    });
  }, [checked, room, date, startTime, endTime, reservations]);

  const available = checked && conflicts.length === 0;

  function handleCheck() {
    setChecked(true);
  }

  const formatTime12 = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="glass-panel/60 rounded-xl border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center gap-2">
        <span className="material-symbols-outlined text-teal-400 text-[20px]">
          event_available
        </span>
        <h4 className="text-sm font-semibold text-slate-200">
          Room Availability Checker
        </h4>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Room
            </label>
            <select
              value={room}
              onChange={(e) => {
                setRoom(e.target.value);
                setChecked(false);
              }}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500/50 outline-none"
            >
              {ROOM_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setChecked(false);
              }}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500/50 outline-none [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setChecked(false);
              }}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500/50 outline-none [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setChecked(false);
              }}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500/50 outline-none [color-scheme:dark]"
            />
          </div>
        </div>

        <button
          onClick={handleCheck}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white auro-button rounded-lg transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          Check Availability
        </button>

        {checked && (
          <div
            className={`p-4 rounded-lg border flex items-start gap-3 ${
              available
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
          >
            <span
              className={`material-symbols-outlined text-2xl ${
                available ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {available ? "check_circle" : "warning"}
            </span>
            <div className="flex-1">
              <p
                className={`text-sm font-semibold ${
                  available ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {available
                  ? "Room is available! ✅"
                  : `Conflict detected — ${conflicts.length} overlapping reservation(s)`}
              </p>
              {!available && (
                <div className="mt-2 space-y-2">
                  {conflicts
                    .slice()
                    .sort((x, y) => {
                      const xTs = x.timestamp
                        ? new Date(x.timestamp).getTime()
                        : Infinity;
                      const yTs = y.timestamp
                        ? new Date(y.timestamp).getTime()
                        : Infinity;
                      return xTs - yTs;
                    })
                    .map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="flex-1">
                          <p
                            className="text-xs text-red-300/80"
                            suppressHydrationWarning
                          >
                            <span className="font-medium">{c.eventName}</span>
                            {" — "}
                            {formatTime12(c.startTime)} –{" "}
                            {formatTime12(c.endTime)}
                            {c.fullName && ` (${c.fullName})`}
                          </p>
                          {c.timestamp && (
                            <p
                              className="text-[10px] text-slate-500 mt-0.5"
                              suppressHydrationWarning
                            >
                              Submitted: {c.timestamp}
                              {i === 0 && " — has priority"}
                            </p>
                          )}
                        </div>
                        {i === 0 && c.timestamp && (
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Priority
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
