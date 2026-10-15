import { ROOMS } from "./rooms.js";

/**
 * Pure helpers for the availability views. Dates are "YYYY-MM-DD" strings and
 * times are minutes after midnight, both in Philippine wall-clock time, so
 * nothing here depends on the viewer's time zone.
 */

export const DEFAULT_HOURS = { start: 7 * 60, end: 20 * 60 };
export const SLOT_STEP = 15;

export const dateOf = (dateTime) => dateTime.slice(0, 10);
export const minutesOf = (dateTime) =>
  Number(dateTime.slice(11, 13)) * 60 + Number(dateTime.slice(14, 16));

export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function startOfWeek(date) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

export function formatClock(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 && h < 24 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatRange(start, end) {
  return `${formatClock(start)} – ${formatClock(end)}`;
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "HH:MM" for form inputs. */
export function toClockInput(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Reservations starting on `date`, with numeric start/end added. */
export function bookingsOn(reservations, date) {
  return reservations
    .filter((r) => r.startTime && r.endTime && dateOf(r.startTime) === date)
    .map((r) => ({ ...r, start: minutesOf(r.startTime), end: minutesOf(r.endTime) }))
    .filter((r) => r.end > r.start);
}

/** The rooms to show: the configured ones, plus any odd names found in the data. */
export function roomsFor(bookings) {
  const known = ROOMS.map((r) => ({ ...r, known: true }));
  const extra = [...new Set(bookings.map((b) => (b.room || "").trim()))]
    .filter((name) => name && !ROOMS.some((r) => r.value === name))
    .map((name) => ({ value: name, label: name, capacity: null, known: false }));
  return [...known, ...extra];
}

export const inRoom = (bookings, roomValue) =>
  bookings.filter((b) => (b.room || "").trim() === roomValue);

/** Operating hours, widened to whole hours so no booking is clipped. */
export function hoursFor(bookings, base = DEFAULT_HOURS) {
  let { start, end } = base;
  for (const b of bookings) {
    start = Math.min(start, Math.floor(b.start / 60) * 60);
    end = Math.max(end, Math.ceil(b.end / 60) * 60);
  }
  return { start, end };
}

/**
 * Assigns each booking a lane so overlapping bookings sit side by side
 * instead of on top of each other, and flags the overlaps.
 */
export function layoutLanes(bookings) {
  const sorted = [...bookings].sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds = [];
  const placed = sorted.map((b) => {
    let lane = laneEnds.findIndex((end) => end <= b.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = b.end;
    return { ...b, lane };
  });
  for (const b of placed) {
    b.conflict = placed.some((o) => o !== b && o.start < b.end && b.start < o.end);
  }
  return { items: placed, laneCount: Math.max(1, laneEnds.length) };
}

/**
 * Free stretches of at least `minLength` minutes within `hours`.
 * `notBefore` (minutes) hides time that has already passed today; it is
 * rounded up to the next quarter hour.
 */
export function freeGaps(bookings, hours, { minLength = 30, notBefore = null } = {}) {
  const from = notBefore === null ? hours.start : Math.max(hours.start, Math.ceil(notBefore / SLOT_STEP) * SLOT_STEP);
  const busy = [...bookings].sort((a, b) => a.start - b.start);
  const gaps = [];
  let cursor = from;
  for (const b of busy) {
    if (b.start > cursor) gaps.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < hours.end) gaps.push({ start: cursor, end: hours.end });
  return gaps.filter((g) => g.end - g.start >= minLength);
}

/** For the week view: bookings, overlap, and the longest free stretch per room. */
export function daySummary(reservations, date, roomValue, now) {
  const all = bookingsOn(reservations, date);
  const mine = inRoom(all, roomValue);
  const hours = hoursFor(all);
  const notBefore = now && date === now.date ? now.minutes : date < (now?.date ?? "") ? hours.end : null;
  const gaps = freeGaps(mine, hours, { minLength: 1, notBefore });
  return {
    count: mine.length,
    conflict: layoutLanes(mine).items.some((b) => b.conflict),
    longestFree: gaps.reduce((max, g) => Math.max(max, g.end - g.start), 0),
  };
}

/**
 * Room-and-time options that fit `attendees` for `duration` minutes,
 * searching `days` days from `fromDate`. Earliest first, at most `limit`.
 */
export function findOptions(
  reservations,
  { attendees, duration, fromDate, days = 7, limit = 8, now },
) {
  const rooms = ROOMS.filter((r) => !attendees || r.capacity >= attendees);
  const options = [];
  for (let i = 0; i < days && options.length < limit; i++) {
    const date = addDays(fromDate, i);
    if (now && date < now.date) continue;
    const all = bookingsOn(reservations, date);
    const hours = hoursFor([], DEFAULT_HOURS);
    const notBefore = now && date === now.date ? now.minutes : null;
    for (const room of rooms) {
      for (const gap of freeGaps(inRoom(all, room.value), hours, { minLength: duration, notBefore })) {
        options.push({ room, date, start: gap.start, end: gap.start + duration, gapEnd: gap.end });
      }
    }
  }
  return options
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start || a.room.capacity - b.room.capacity)
    .slice(0, limit);
}
