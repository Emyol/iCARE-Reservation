"use client";

import { useState, useEffect, useMemo } from "react";

/**
 * Custom Timeline/Gantt chart built with CSS grid.
 * Matches the mockup's visual style more closely than react-google-charts Timeline.
 *
 * Props:
 * - title: string
 * - icon: string (Material Symbols icon name)
 * - iconColor: string (tailwind color class like "text-emerald-500")
 * - data: array of { room, eventName, startTime, endTime }
 * - accentColor: "emerald" | "blue" | "amber"
 * - legend?: array of { color, label }
 * - loading: boolean
 */
export default function TimelineChart({
  title,
  icon,
  iconColor,
  data = [],
  accentColor = "emerald",
  legend = [],
  loading = false,
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00 to 19:00
  const timelineStart = 8; // 08:00
  const timelineEnd = 20; // 20:00 (exclusive, so range is 08:00-19:59)
  const totalHours = timelineEnd - timelineStart;

  // dateLabel is computed only on the client to avoid SSR/client hydration mismatch
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    );
  }, []);

  // Group events by room
  const roomGroups = useMemo(() => {
    const groups = {};
    data.forEach((event) => {
      const room = event.room || "Unknown";
      if (!groups[room]) groups[room] = [];
      groups[room].push(event);
    });
    return groups;
  }, [data]);

  const roomNames = Object.keys(roomGroups);

  // Color schemes
  const colors = {
    emerald: {
      bg: "bg-emerald-500/20",
      border: "border-emerald-500",
      textPrimary: "text-emerald-400",
      textSecondary: "text-emerald-500",
      hoverBg: "hover:bg-emerald-500/30",
    },
    blue: {
      bg: "bg-blue-500/20",
      border: "border-blue-500",
      textPrimary: "text-blue-400",
      textSecondary: "text-blue-500",
      hoverBg: "hover:bg-blue-500/30",
    },
    amber: {
      bg: "bg-amber-500/20",
      border: "border-amber-500",
      textPrimary: "text-amber-400",
      textSecondary: "text-amber-500",
      hoverBg: "hover:bg-amber-500/30",
    },
  };

  const colorScheme = colors[accentColor] || colors.emerald;

  function getEventPosition(event) {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const clampedStart = Math.max(startHour, timelineStart);
    const clampedEnd = Math.min(endHour, timelineEnd);

    if (clampedStart >= clampedEnd) return null;

    const left = ((clampedStart - timelineStart) / totalHours) * 100;
    const width = ((clampedEnd - clampedStart) / totalHours) * 100;

    return { left: `${left}%`, width: `${width}%` };
  }

  // Loading skeleton
  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="skeleton w-6 h-6 rounded" />
            <div className="skeleton w-40 h-6 rounded" />
          </div>
        </div>
        <div className="bg-slate-900/60 rounded-xl border border-white/5 overflow-hidden">
          <div className="h-10 bg-white/5 border-b border-white/5" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex h-16 border-b border-white/5">
              <div className="w-52 p-4">
                <div className="skeleton w-16 h-4 rounded" />
              </div>
              <div className="flex-1 p-2">
                <div
                  className="skeleton h-12 rounded"
                  style={{
                    width: `${[40, 30, 50][i - 1]}%`,
                    marginLeft: `${[10, 25, 5][i - 1]}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined ${iconColor}`}>
              {icon}
            </span>
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
        </div>
        <div className="bg-slate-900/60 rounded-xl border border-white/5 p-12 text-center">
          <span className="material-symbols-outlined text-slate-600 text-4xl mb-3 block">
            event_available
          </span>
          <p className="text-slate-500 text-sm font-medium">
            No reservations scheduled
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Bookings will appear here once they are added
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined ${iconColor}`}>
            {icon}
          </span>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="flex gap-4 items-center">
          {legend.length > 0 &&
            legend.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${item.color}`} />
                <span className="text-[10px] font-medium text-slate-500">
                  {item.label}
                </span>
              </div>
            ))}
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">
            Today, {dateLabel}
          </span>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="bg-slate-900/60 rounded-xl border border-white/5 overflow-hidden shadow-sm overflow-x-auto">
        {/* Time Header */}
        <div className="flex border-b border-white/5 bg-white/[0.03] text-[10px] uppercase tracking-wider font-bold text-slate-500 min-w-[960px]">
          <div className="p-3 border-r border-white/5 w-52 shrink-0">Room</div>
          <div className="flex-1 grid grid-cols-12">
            {hours.map((hour) => (
              <div
                key={hour}
                className="p-3 text-center border-r border-white/[0.03] last:border-r-0"
              >
                {hour.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>

        {/* Room Rows */}
        <div className="divide-y divide-white/5 min-w-[960px]">
          {roomNames.map((roomName) => (
            <div key={roomName} className="flex h-16">
              <div className="w-52 p-4 border-r border-white/5 flex items-center shrink-0">
                <span className="text-sm font-semibold truncate">
                  {roomName}
                </span>
              </div>
              <div className="flex-1 relative bg-white/[0.01]">
                {/* Hour gridlines */}
                <div className="absolute inset-0 grid grid-cols-12">
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="border-r border-white/[0.03] last:border-r-0"
                    />
                  ))}
                </div>
                {/* Events */}
                {roomGroups[roomName].map((event, idx) => {
                  const pos = getEventPosition(event);
                  if (!pos) return null;

                  // Alternate colors for study area events
                  const eventColorScheme =
                    accentColor === "emerald"
                      ? colorScheme
                      : idx % 2 === 0
                        ? colors.blue
                        : colors.amber;

                  return (
                    <div
                      key={idx}
                      suppressHydrationWarning
                      className={`absolute inset-y-2 ${eventColorScheme.bg} border-l-4 ${eventColorScheme.border} rounded-r-md p-2 overflow-hidden cursor-pointer ${eventColorScheme.hoverBg} transition-all duration-200 timeline-event z-10`}
                      style={{ left: pos.left, width: pos.width }}
                      title={`${event.eventName}\n${new Date(event.startTime).toLocaleTimeString()} - ${new Date(event.endTime).toLocaleTimeString()}`}
                    >
                      <p
                        className={`text-[10px] font-bold ${eventColorScheme.textPrimary} truncate`}
                      >
                        {event.eventName}
                      </p>
                      <p
                        suppressHydrationWarning
                        className={`text-[9px] ${eventColorScheme.textSecondary} truncate`}
                      >
                        {new Date(event.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(event.endTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
