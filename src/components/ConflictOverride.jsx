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
    <div role="alert" className="flex flex-col gap-3 rounded-[18px] border border-[var(--lg-danger)] bg-[var(--lg-danger-soft)] p-4">
      <p className="font-semibold">
        This time overlaps {conflicts.length === 1 ? "an existing booking" : `${conflicts.length} existing bookings`}
      </p>
      <ul className="flex flex-col gap-1.5">
        {conflicts.map((c, i) => (
          <li key={i} className="text-[14px] lg-num" suppressHydrationWarning>
            <span className="font-semibold">{c.eventName}</span>, {formatTime(c.startTime)} - {formatTime(c.endTime)}
            {c.fullName && `, ${c.fullName}`}
            {c.timestamp && <span className="lg-muted">. Submitted {c.timestamp}</span>}
          </li>
        ))}
      </ul>
      <p className="text-[14px] lg-muted">Pick another time, or book anyway with a reason.</p>
      <label htmlFor={`${idPrefix}-override`} className="flex items-center gap-2 text-[15px] font-medium">
        <input
          id={`${idPrefix}-override`}
          type="checkbox"
          checked={override}
          onChange={(e) => onOverrideChange(e.target.checked)}
          disabled={disabled}
          className="size-5 accent-[var(--lg-action)]"
        />
        Book anyway (override)
      </label>
      {override && (
        <div className="lg-field">
          <label htmlFor={`${idPrefix}-reason`}>Reason for override (saved to the activity log)</label>
          <input
            id={`${idPrefix}-reason`}
            type="text"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            disabled={disabled}
            className="lg-input"
            placeholder="e.g. Dean approved sharing the room"
          />
        </div>
      )}
    </div>
  );
}
