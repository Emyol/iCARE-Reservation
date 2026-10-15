import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  startOfWeek,
  formatClock,
  formatRange,
  formatCompactRange,
  bookingsOn,
  roomsFor,
  hoursFor,
  layoutLanes,
  freeGaps,
  daySummary,
  findOptions,
} from "../src/lib/availability.js";

const AVR = "Audio-Visual Room / Enhancement Area (Capacity: 40)";
const TRAINING = "Individual Training / Small Group Discussion Room (Capacity: 10)";
const row = (room, date, start, end, extra = {}) => ({
  room,
  startTime: `${date}T${start}:00`,
  endTime: `${date}T${end}:00`,
  eventName: "Reserved",
  ...extra,
});

const data = [
  row(AVR, "2026-10-16", "08:00", "10:00"),
  row(AVR, "2026-10-16", "13:00", "15:00"),
  row(AVR, "2026-10-16", "14:00", "16:00"),
  row(TRAINING, "2026-10-16", "09:00", "10:00"),
  row(AVR, "2026-10-17", "09:00", "12:00"),
];

test("date helpers", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(startOfWeek("2026-10-18"), "2026-10-12"); // Sunday → Monday before
  assert.equal(startOfWeek("2026-10-12"), "2026-10-12");
  assert.equal(formatClock(0), "12:00 AM");
  assert.equal(formatClock(12 * 60 + 5), "12:05 PM");
  assert.equal(formatRange(13 * 60, 15 * 60 + 30), "1:00 PM - 3:30 PM");
  assert.equal(formatCompactRange(19 * 60, 20 * 60), "7-8 PM");
  assert.equal(formatCompactRange(11 * 60 + 30, 13 * 60), "11:30 AM-1 PM");
});

test("bookingsOn keeps one day and drops rows that end before they start", () => {
  const bad = row(AVR, "2026-10-16", "22:00", "01:00");
  const day = bookingsOn([...data, bad], "2026-10-16");
  assert.equal(day.length, 4);
  assert.deepEqual([day[0].start, day[0].end], [480, 600]);
});

test("roomsFor lists configured rooms first and keeps unknown room names visible", () => {
  const rooms = roomsFor([{ room: "Old Room Name" }]);
  assert.deepEqual(rooms.map((r) => r.label), ["Audio-Visual Room", "Training Room", "Old Room Name"]);
});

test("hoursFor widens to whole hours around early or late bookings", () => {
  assert.deepEqual(hoursFor([{ start: 6 * 60 + 30, end: 7 * 60 + 30 }]), { start: 360, end: 1200 });
  assert.deepEqual(hoursFor([{ start: 19 * 60, end: 21 * 60 + 15 }]), { start: 420, end: 1320 });
});

test("layoutLanes puts overlapping bookings in separate lanes and flags them", () => {
  const { items, laneCount } = layoutLanes(bookingsOn(data, "2026-10-16").filter((b) => b.room === AVR));
  assert.equal(laneCount, 2);
  assert.deepEqual(items.map((b) => [b.start / 60, b.lane, b.conflict]), [
    [8, 0, false],
    [13, 0, true],
    [14, 1, true],
  ]);
});

test("back-to-back bookings share a lane and aren't conflicts", () => {
  const { items, laneCount } = layoutLanes([
    { start: 600, end: 660 },
    { start: 660, end: 720 },
  ]);
  assert.equal(laneCount, 1);
  assert.ok(items.every((b) => !b.conflict));
});

test("freeGaps finds free time and hides the past", () => {
  const avr = bookingsOn(data, "2026-10-16").filter((b) => b.room === AVR);
  const hours = { start: 420, end: 1200 };
  assert.deepEqual(freeGaps(avr, hours), [
    { start: 420, end: 480 },
    { start: 600, end: 780 },
    { start: 960, end: 1200 },
  ]);
  // At 11:07 the free time starts at 11:15.
  assert.deepEqual(freeGaps(avr, hours, { notBefore: 11 * 60 + 7 })[0], { start: 675, end: 780 });
});

test("daySummary counts bookings, overlap, and longest free time", () => {
  const s = daySummary(data, "2026-10-16", AVR, null);
  assert.deepEqual(s, { count: 3, conflict: true, longestFree: 240 });
});

test("findOptions respects capacity, duration, and the current time", () => {
  const now = { date: "2026-10-16", minutes: 9 * 60 };
  const big = findOptions(data, { attendees: 25, duration: 120, fromDate: "2026-10-16", now });
  assert.ok(big.length > 0);
  assert.ok(big.every((o) => o.room.value === AVR));
  assert.deepEqual([big[0].date, big[0].start, big[0].end], ["2026-10-16", 600, 720]);

  const small = findOptions(data, { attendees: 8, duration: 60, fromDate: "2026-10-16", now });
  assert.equal(small[0].room.value, TRAINING);
  assert.equal(small[0].start, 600);

  assert.equal(findOptions(data, { attendees: 41, duration: 60, fromDate: "2026-10-16", now }).length, 0);
});
