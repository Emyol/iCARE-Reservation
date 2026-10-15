"use client";

import { useMemo, useState } from "react";
import { useAdmin } from "@/components/AdminProvider";
import ConflictOverride from "@/components/ConflictOverride";
import { ROOMS } from "@/lib/rooms";
import { reservationFingerprint } from "@/lib/reservationRules";

const ROOM_OPTIONS = ROOMS;

export default function ReservationDetailModal({
  reservation,
  onClose,
  onUpdate,
}) {
  const { isAdmin } = useAdmin();
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-panel border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-5 border-b border-white/5 flex items-center gap-3`}>
          <div
            className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
              isAVR ? "bg-emerald-500/10" : "bg-blue-500/10"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                isAVR ? "text-emerald-400" : "text-blue-400"
              }`}
            >
              {isAVR ? "videocam" : "groups"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white truncate">
              {reservation.eventName}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              {reservation.room}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
              {stale && (
                <button
                  onClick={() => {
                    onUpdate?.();
                    onClose();
                  }}
                  className="block mt-2 text-xs font-semibold text-teal-300 underline"
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
                      ? `${formatTime(reservation.startTime)} – ${formatTime(reservation.endTime)}`
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
                      label="Email Status"
                      value={reservation.emailSent ? "Sent ✅" : "Not sent"}
                    />
                  </>
                )}
              </div>
              {!isAdmin && (
                <p className="text-xs text-slate-400">
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

              {/* Admin Actions */}
              {isAdmin && (
                <div className="pt-3 border-t border-white/5 flex gap-2">
                  <button
                    onClick={() => setMode("edit")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-500/20 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => setMode("confirmDelete")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Delete
                  </button>
                </div>
              )}
            </>
          )}

          {mode === "edit" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Room</label>
                <select
                  value={editFields.room}
                  onChange={(e) =>
                    setEditFields({ ...editFields, room: e.target.value })
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                  {availableRoomOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  Event / Purpose
                </label>
                <input
                  type="text"
                  value={editFields.eventName}
                  onChange={(e) =>
                    setEditFields({ ...editFields, eventName: e.target.value })
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="edit-date" className="block text-xs text-slate-400 mb-1 font-medium">
                    Date
                  </label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editFields.date}
                    onChange={(e) => setSlotField("date", e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label htmlFor="edit-start" className="block text-xs text-slate-400 mb-1 font-medium">
                    Start Time
                  </label>
                  <input
                    id="edit-start"
                    type="time"
                    step="900"
                    value={editFields.start}
                    onChange={(e) => setSlotField("start", e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label htmlFor="edit-end" className="block text-xs text-slate-400 mb-1 font-medium">
                    End Time
                  </label>
                  <input
                    id="edit-end"
                    type="time"
                    step="900"
                    value={editFields.end}
                    onChange={(e) => setSlotField("end", e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none [color-scheme:dark]"
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
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFields.fullName}
                  onChange={(e) =>
                    setEditFields({ ...editFields, fullName: e.target.value })
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  Attendees
                </label>
                <input
                  type="text"
                  value={editFields.attendees}
                  onChange={(e) =>
                    setEditFields({ ...editFields, attendees: e.target.value })
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || Boolean(conflicts && !override)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white auro-button rounded-lg disabled:opacity-50 transition-opacity"
                >
                  {saving ? "Saving..." : conflicts ? "Save Anyway" : "Save Changes"}
                </button>
                <button
                  onClick={() => setMode("view")}
                  className="px-4 py-2.5 text-sm font-medium text-slate-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {mode === "confirmDelete" && (
            <div className="text-center space-y-4 py-4">
              <span className="material-symbols-outlined text-red-400 text-5xl block">
                warning
              </span>
              <div>
                <p className="text-white font-semibold">Delete this reservation?</p>
                <p className="text-slate-400 text-sm mt-1">
                  &ldquo;{reservation.eventName}&rdquo; will be permanently removed.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all"
                >
                  {saving ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  onClick={() => setMode("view")}
                  className="px-6 py-2.5 text-sm font-medium text-slate-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
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
      <span className="material-symbols-outlined text-slate-500 text-[16px] mt-0.5">
        {icon}
      </span>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
          {label}
        </p>
        <p
          suppressHydrationWarning={suppressHydrationWarning}
          className="text-sm text-slate-200 mt-0.5"
        >
          {value}
        </p>
      </div>
    </div>
  );
}
