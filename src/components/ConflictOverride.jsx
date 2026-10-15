"use client";

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/**
 * Shown when the server refuses a save because the time overlaps another
 * booking. The admin can pick another time, or save anyway with a reason,
 * which is written to the activity log.
 */
export default function ConflictOverride({
  conflicts,
  override,
  onOverrideChange,
  reason,
  onReasonChange,
  disabled,
  idPrefix,
}) {
  return (
    <div role="alert" className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
      <p className="text-sm font-semibold text-amber-400">
        This time overlaps {conflicts.length === 1 ? "an existing booking" : `${conflicts.length} existing bookings`}
      </p>
      <ul className="space-y-1.5">
        {conflicts.map((c, i) => (
          <li key={i} className="text-xs text-slate-300" suppressHydrationWarning>
            <span className="font-semibold text-white">{c.eventName}</span>
            {" · "}
            {formatTime(c.startTime)}–{formatTime(c.endTime)}
            {c.fullName && ` · ${c.fullName}`}
            {c.timestamp && <span className="text-slate-400"> · submitted {c.timestamp}</span>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-400">
        Pick another time, or book anyway with a reason.
      </p>
      <label htmlFor={`${idPrefix}-override`} className="flex items-center gap-2 text-sm text-slate-200">
        <input
          id={`${idPrefix}-override`}
          type="checkbox"
          checked={override}
          onChange={(e) => onOverrideChange(e.target.checked)}
          disabled={disabled}
          className="size-4"
        />
        Book anyway (override)
      </label>
      {override && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-reason`} className="text-xs font-medium text-slate-300">
            Reason for override (saved to the activity log)
          </label>
          <input
            id={`${idPrefix}-reason`}
            type="text"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            disabled={disabled}
            className="w-full h-10 bg-slate-800/50 border border-slate-700 rounded-lg px-3 text-sm text-slate-100 focus:ring-2 focus:ring-[#0f49bd]/50 outline-none"
            placeholder="e.g. Dean approved sharing the room"
          />
        </div>
      )}
    </div>
  );
}
