"use client";

import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";
import { requestFormUrl } from "@/lib/requestForm";
import { formatRange, toClockInput } from "@/lib/availability";

/** Public "request this slot": hands off to the Google Form, pre-filled when configured. */
export default function RequestSlotDialog({ slot, onClose }) {
  const dialogRef = useAccessibleDialog(onClose);
  const { room, date, start, end } = slot;
  const url = requestFormUrl({ room: room.value, date, start: toClockInput(start), end: toClockInput(end) });
  const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-slate-800 bg-[#192233] shadow-2xl modal-content"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <div>
            <h2 id="request-title" className="text-lg font-bold text-white">Request {room.label}</h2>
            <p className="mt-1 text-sm text-slate-300">
              {dateLabel} · {formatRange(start, end)}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-white">
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-col gap-3 p-5 text-sm text-slate-300">
          <p>
            Requests go through the iCARE form. Your request is reviewed, and you&apos;ll get an
            email once it&apos;s confirmed.
          </p>
          <p>
            Fits up to {room.capacity} people. This time is free right now, but someone else may
            request it before you do.
          </p>
          {!url && (
            <p className="text-amber-300">
              The request form link isn&apos;t set up yet. Contact iCARE at icarevo@feutech.edu.ph.
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 p-5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg px-5 font-semibold text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="primary-action">
              Open the request form
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">open_in_new</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
