import { findRoom } from "./rooms.js";

/**
 * Booking rules shared by the API routes and the admin forms.
 *
 * Times are timezone-free wall-clock strings ("YYYY-MM-DDTHH:MM"), the same
 * shape getReservations() produces, so they compare correctly as strings.
 */

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/** Returns "YYYY-MM-DDTHH:MM", or null if the value isn't a real date and time. */
export function normalizeDateTime(value) {
  const match = typeof value === "string" ? value.match(DATE_TIME) : null;
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  if (h > 23 || mi > 59) return null;
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d
  ) {
    return null;
  }
  return value.slice(0, 16);
}

/** Current wall-clock time in the Philippines, as "YYYY-MM-DDTHH:MM". */
export function manilaNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Validates a reservation. `attendees` is checked only when it is provided,
 * so editing an old Form row with free-text attendees ("20-25") still works.
 */
export function validateReservation(
  { room, eventName, startTime, endTime, attendees },
  { now = manilaNow(), requireKnownRoom = true, allowPast = false } = {},
) {
  const errors = [];
  const knownRoom = findRoom(room);

  if (!(room || "").trim()) errors.push("Choose a room.");
  else if (requireKnownRoom && !knownRoom) errors.push("Choose one of the iCARE rooms.");

  if (!(eventName || "").trim()) errors.push("Enter the purpose or event name.");

  const start = normalizeDateTime(startTime);
  const end = normalizeDateTime(endTime);
  if (!start || !end) {
    errors.push("Enter a valid date, start time, and end time.");
  } else if (start.slice(0, 10) !== end.slice(0, 10)) {
    errors.push("Start and end must be on the same day. Overnight bookings aren't supported.");
  } else if (end <= start) {
    errors.push("End time must be after the start time.");
  } else if (!allowPast && start < now) {
    errors.push("The start time has already passed.");
  }

  if (attendees !== undefined && attendees !== null && String(attendees).trim() !== "") {
    const count = Number(attendees);
    if (!Number.isInteger(count) || count < 1) {
      errors.push("Enter the number of attendees as a whole number.");
    } else if (knownRoom && count > knownRoom.capacity) {
      errors.push(
        `The ${knownRoom.label} holds ${knownRoom.capacity} people. Choose a larger room or reduce the group.`,
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    value: { startTime: start, endTime: end },
  };
}

/** Reservations in the same room whose time ranges overlap the candidate. */
export function findOverlaps(candidate, reservations, { excludeRowIndex } = {}) {
  const room = (candidate.room || "").trim();
  const start = normalizeDateTime(candidate.startTime);
  const end = normalizeDateTime(candidate.endTime);
  if (!start || !end) return [];
  return reservations.filter((r) => {
    if (excludeRowIndex !== undefined && r.rowIndex === excludeRowIndex) return false;
    if ((r.room || "").trim() !== room) return false;
    const rStart = normalizeDateTime(r.startTime);
    const rEnd = normalizeDateTime(r.endTime);
    return rStart && rEnd && start < rEnd && rStart < end;
  });
}

/**
 * The fields a client sends back to prove it is editing the row it loaded.
 * Rows are addressed by sheet row number, which moves if the sheet is sorted
 * or edited by hand.
 */
export function reservationFingerprint(r) {
  return {
    timestamp: r.timestamp || "",
    room: (r.room || "").trim(),
    startTime: normalizeDateTime(r.startTime) || "",
    endTime: normalizeDateTime(r.endTime) || "",
  };
}

export function fingerprintMatches(current, expected) {
  if (!current || !expected || typeof expected !== "object") return false;
  const a = reservationFingerprint(current);
  const b = reservationFingerprint(expected);
  return (
    a.timestamp === b.timestamp &&
    a.room === b.room &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime
  );
}

/** The overlap details an admin needs to decide whether to override. */
export function conflictSummary(r) {
  return {
    eventName: r.eventName,
    startTime: r.startTime,
    endTime: r.endTime,
    fullName: r.fullName || "",
    timestamp: r.timestamp || "",
  };
}

/** What anonymous visitors may see: when a room is taken, not by whom. */
export function toPublicReservation(r) {
  return {
    room: r.room,
    startTime: r.startTime,
    endTime: r.endTime,
    eventName: "Reserved",
    timestamp: r.timestamp,
  };
}
