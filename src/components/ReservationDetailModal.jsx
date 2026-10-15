"use client";

import { useMemo, useState } from "react";
import { useAdmin } from "@/components/AdminProvider";
import ConflictOverride from "@/components/ConflictOverride";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";
import { ROOMS } from "@/lib/rooms";
import { reservationFingerprint } from "@/lib/reservationRules";

const ROOM_OPTIONS = ROOMS;

export default function ReservationDetailModal({
  reservation,
  onClose,
  onUpdate,
}) {
  const { isAdmin } = useAdmin();
  const dialogRef = useAccessibleDialog(onClose);
  const [mode, setMode] = useState("view"); // "view" | "edit" | "confirmDelete"
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [stale, setStale] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");

  // Edit form state. One date for both times: bookings can't span midnight.
  const [editFields, setEditFields] = useState({
    room: reservation.room,
    eventName: reservation.eventName,
    date: reservation.startTime?.slice(0, 10) || "",
    start: reservation.startTime?.slice(11, 16) || "",
    end: reservation.endTime?.slice(11, 16) || "",
    fullName: reservation.fullName || "",
    attendees: reservation.attendees || "",
  });

  // A changed slot needs a fresh conflict check.
  function setSlotField(key, value) {
    setEditFields((f) => ({ ...f, [key]: value }));
    setConflicts(null);
    setOverride(false);
  }

  // Sent with every change so the server can refuse it if the sheet row
  // no longer holds this reservation.
  const expected = reservationFingerprint(reservation);

  async function readError(res) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data.stale) setStale(true);
    return data;
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const isAVR = reservation.room?.toLowerCase().includes("audio-visual");
  const availableRoomOptions = useMemo(() => {
    const currentRoom = reservation.room?.trim();
    if (!currentRoom) return ROOM_OPTIONS;

    const hasCurrent = ROOM_OPTIONS.some((opt) => opt.value === currentRoom);
    if (hasCurrent) return ROOM_OPTIONS;

    return [{ value: currentRoom, label: currentRoom }, ...ROOM_OPTIONS];
  }, [reservation.room]);

  async function handleSave() {
    if (conflicts && override && !reason.trim()) {
      setError("Enter a reason for booking over the overlap.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { date, start, end, ...rest } = editFields;
      const res = await fetch(`/api/reservations/${reservation.rowIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          startTime: `${date}T${start}`,
          endTime: `${date}T${end}`,
          expected,
          override: Boolean(conflicts && override),
          reason: reason.trim(),
        }),
      });
      if (!res.ok) {
        const data = await readError(res);
        if (res.status === 409 && data.needsOverride) {
          setConflicts(data.conflicts || []);
          return;
        }
        throw new Error(data.error || "Failed to update");
      }
      onUpdate?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.rowIndex}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expected }),
      });
      if (!res.ok) {
        const data = await readError(res);
        throw new Error(data.error || "Failed to delete");
      }
      onUpdate?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lg-tokens fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div aria-hidden="true" className="lg-scrim absolute inset-0" onClick={onClose} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="detail-title" tabIndex={-1} className="lg-sheet lg-materialize relative w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pb-3 pt-6">
          <div
            className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
              "bg-[var(--lg-free-soft)]"
            }`}
          >
            <span aria-hidden="true"
              className={`material-symbols-outlined text-[20px] ${
                "text-[var(--lg-free)]"
              }`}
            >
              {isAVR ? "videocam" : "groups"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="detail-title" className="truncate text-[19px] font-bold">
              {reservation.eventName}
            </h3>
            <p className="truncate text-[13px] lg-muted">
              {reservation.room}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="lg-btn lg-btn-secondary lg-btn-icon"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 pb-6 pt-2">
          {error && (
            <div role="alert" className="rounded-[14px] border border-[var(--lg-danger)] bg-[var(--lg-danger-soft)] px-4 py-3 text-[14px] font-medium">
              {error}
              {stale && (
                <button
                  onClick={() => {
                    onUpdate?.();
                    onClose();
                  }}
                  className="mt-2 block text-[13px] font-semibold underline"
                >
                  Reload the schedule
                </button>
              )}
            </div>
          )}

          {mode === "view" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <DetailField
                  icon="calendar_today"
                  label="Date"
                  value={reservation.startTime ? formatDate(reservation.startTime) : "—"}
                  suppressHydrationWarning
                />
                <DetailField
                  icon="schedule"
                  label="Time"
                  value={
                    reservation.startTime
                      ? `${formatTime(reservation.startTime)} - ${formatTime(reservation.endTime)}`
                      : "—"
                  }
                  suppressHydrationWarning
                />
                {isAdmin && (
                  <>
                    <DetailField
                      icon="person"
                      label="Organizer"
                      value={reservation.fullName || "—"}
                    />
                    <DetailField
                      icon="group"
                      label="Attendees"
                      value={reservation.attendees || "—"}
                    />
                    <DetailField
                      icon="apartment"
                      label="Department"
                      value={reservation.department || "—"}
                    />
                    <DetailField
                      icon="mail"
                      label="Status"
                      value={
                        { pending: "Pending: no email sent yet", confirmed: "Confirmed: email sent", declined: "Declined: room-not-available email sent" }[
                          reservation.status
                        ] || (reservation.emailSent ? "Email sent" : "No email sent yet")
                      }
                    />
                  </>
                )}
              </div>
              {!isAdmin && (
                <p className="text-[13px] lg-muted">
                  Organizer details are visible to iCARE staff only.
                </p>
              )}
              {isAdmin && reservation.recipientEmail && (
                <DetailField
                  icon="alternate_email"
                  label="Contact Email"
                  value={reservation.recipientEmail}
                />
              )}
              {isAdmin && reservation.equipment && (
                <DetailField
                  icon="build"
                  label="Setup / Equipment"
                  value={reservation.equipment}
                />
              )}
              {isAdmin && reservation.notes && (
                <DetailField
                  icon="sticky_note_2"
                  label="Additional Notes"
                  value={reservation.notes}
                />
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex gap-2 border-t border-[var(--lg-line)] pt-4">
                  <button
                    onClick={() => setMode("edit")}
                    className="lg-btn lg-btn-secondary flex-1"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => setMode("confirmDelete")}
                    className="lg-btn lg-btn-secondary flex-1 text-[var(--lg-danger)]"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete</span>
                    Delete
                  </button>
                </div>
              )}
            </>
          )}

          {mode === "edit" && (
            <div className="space-y-3">
              <div>
                <label htmlFor="edit-room" className="mb-1.5 block text-[13px] font-semibold">Room</label>
                <select
                  id="edit-room"
                  value={editFields.room}
                  onChange={(e) =>
                    setEditFields({ ...editFields, room: e.target.value })
                  }
                  className="lg-input"
                >
                  {availableRoomOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-event" className="mb-1.5 block text-[13px] font-semibold">
                  Event / Purpose
                </label>
                <input
                  type="text"
                  id="edit-event"
                  value={editFields.eventName}
                  onChange={(e) =>
                    setEditFields({ ...editFields, eventName: e.target.value })
                  }
                  className="lg-input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="edit-date" className="mb-1.5 block text-[13px] font-semibold">
                    Date
                  </label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editFields.date}
                    onChange={(e) => setSlotField("date", e.target.value)}
                    className="lg-input"
                  />
                </div>
                <div>
                  <label htmlFor="edit-start" className="mb-1.5 block text-[13px] font-semibold">
                    Start Time
                  </label>
                  <input
                    id="edit-start"
                    type="time"
                    step="900"
                    value={editFields.start}
                    onChange={(e) => setSlotField("start", e.target.value)}
                    className="lg-input"
                  />
                </div>
                <div>
                  <label htmlFor="edit-end" className="mb-1.5 block text-[13px] font-semibold">
                    End Time
                  </label>
                  <input
                    id="edit-end"
                    type="time"
                    step="900"
                    value={editFields.end}
                    onChange={(e) => setSlotField("end", e.target.value)}
                    className="lg-input"
                  />
                </div>
              </div>
              {conflicts && (
                <ConflictOverride
                  conflicts={conflicts}
                  override={override}
                  onOverrideChange={setOverride}
                  reason={reason}
                  onReasonChange={setReason}
                  disabled={saving}
                  idPrefix="edit"
                />
              )}
              <div>
                <label htmlFor="edit-name" className="mb-1.5 block text-[13px] font-semibold">
                  Full Name
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={editFields.fullName}
                  onChange={(e) =>
                    setEditFields({ ...editFields, fullName: e.target.value })
                  }
                  className="lg-input"
                />
              </div>
              <div>
                <label htmlFor="edit-attendees" className="mb-1.5 block text-[13px] font-semibold">
                  Attendees
                </label>
                <input
                  type="text"
                  id="edit-attendees"
                  value={editFields.attendees}
                  onChange={(e) =>
                    setEditFields({ ...editFields, attendees: e.target.value })
                  }
                  className="lg-input"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || Boolean(conflicts && !override)}
                  className="lg-btn lg-btn-primary flex-1"
                >
                  {saving ? "Saving..." : conflicts ? "Save Anyway" : "Save Changes"}
                </button>
                <button
                  onClick={() => setMode("view")}
                  className="lg-btn lg-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === "confirmDelete" && (
            <div className="text-center space-y-4 py-4">
              <span aria-hidden="true" className="material-symbols-outlined block text-5xl text-[var(--lg-danger)]">
                warning
              </span>
              <div>
                <p className="font-semibold">Delete this reservation?</p>
                <p className="mt-1 text-[14px] lg-muted">
                  &ldquo;{reservation.eventName}&rdquo; will be permanently removed.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="lg-btn bg-[#b3261e] text-white hover:bg-[#99201a]"
                >
                  {saving ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  onClick={() => setMode("view")}
                  className="lg-btn lg-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ icon, label, value, suppressHydrationWarning }) {
  return (
    <div className="flex items-start gap-2">
      <span aria-hidden="true" className="material-symbols-outlined mt-0.5 text-[16px] lg-muted">
        {icon}
      </span>
      <div>
        <p className="lg-label">
          {label}
        </p>
        <p
          suppressHydrationWarning={suppressHydrationWarning}
          className="mt-0.5 text-[15px]"
        >
          {value}
        </p>
      </div>
    </div>
  );
}
