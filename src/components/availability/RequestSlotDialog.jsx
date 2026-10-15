"use client";

import { ExternalLink, Users } from "lucide-react";
import GlassSheet from "@/components/glass/GlassSheet";
import { requestFormUrl } from "@/lib/requestForm";
import { formatRange, toClockInput } from "@/lib/availability";

/** Public "request this slot": hands off to the Google Form, pre-filled when configured. */
export default function RequestSlotDialog({ slot, onClose }) {
  const { room, date, start, end } = slot;
  const url = requestFormUrl({ room: room.value, date, start: toClockInput(start), end: toClockInput(end) });
  const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <GlassSheet
      titleId="request-title"
      title={`Request ${room.label}`}
      subtitle={`${dateLabel}, ${formatRange(start, end)}`}
      onClose={onClose}
      footer={
        <>
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="lg-btn lg-btn-primary">
              Open the request form
              <ExternalLink aria-hidden="true" className="size-4" strokeWidth={2} />
            </a>
          ) : (
            <p className="text-[14px] text-[var(--lg-danger)]">
              The request form link isn&apos;t set up yet. Contact iCARE at icarevo@feutech.edu.ph.
            </p>
          )}
          <button type="button" onClick={onClose} className="lg-btn lg-btn-secondary">
            Cancel
          </button>
        </>
      }
    >
      <p className="flex items-center gap-2">
        <Users aria-hidden="true" className="size-5 lg-muted" strokeWidth={1.75} />
        Fits up to {room.capacity} people
      </p>
      <p className="lg-muted">
        Requests go through the iCARE form. You&apos;ll get an email once iCARE confirms. This time is free
        right now, but someone else may request it first.
      </p>
    </GlassSheet>
  );
}
