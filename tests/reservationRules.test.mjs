import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDateTime,
  manilaNow,
  validateReservation,
  findOverlaps,
  fingerprintMatches,
  toPublicReservation,
  statusOf,
  publicReservations,
} from "../src/lib/reservationRules.js";

const AVR = "Audio-Visual Room / Enhancement Area (Capacity: 40)";
const TRAINING = "Individual Training / Small Group Discussion Room (Capacity: 10)";
const NOW = "2026-10-15T09:00";

const valid = {
  room: AVR,
  eventName: "Org week briefing",
  startTime: "2026-10-16T13:00",
  endTime: "2026-10-16T15:00",
};

test("normalizeDateTime trims seconds and rejects impossible dates", () => {
  assert.equal(normalizeDateTime("2026-10-16T13:00:00"), "2026-10-16T13:00");
  assert.equal(normalizeDateTime("2026-02-30T10:00"), null);
  assert.equal(normalizeDateTime("2026-10-16T24:00"), null);
  assert.equal(normalizeDateTime("10/16/2026 1:00 PM"), null);
});

test("manilaNow reports Philippine wall-clock time", () => {
  assert.equal(manilaNow(new Date("2026-10-15T00:30:00Z")), "2026-10-15T08:30");
  assert.equal(manilaNow(new Date("2026-10-15T17:30:00Z")), "2026-10-16T01:30");
});

test("a normal booking passes", () => {
  const result = validateReservation(valid, { now: NOW });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { startTime: "2026-10-16T13:00", endTime: "2026-10-16T15:00" });
});

test("overnight bookings are rejected instead of being saved on the wrong date", () => {
  const result = validateReservation(
    { ...valid, startTime: "2026-10-16T22:00", endTime: "2026-10-17T01:00" },
    { now: NOW },
  );
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /same day/);
});

test("end must be after start", () => {
  const result = validateReservation({ ...valid, endTime: "2026-10-16T13:00" }, { now: NOW });
  assert.match(result.errors[0], /after the start/);
});

test("past start times are rejected unless allowed", () => {
  const past = { ...valid, startTime: "2026-10-15T08:00", endTime: "2026-10-15T10:00" };
  assert.equal(validateReservation(past, { now: NOW }).ok, false);
  assert.equal(validateReservation(past, { now: NOW, allowPast: true }).ok, true);
});

test("attendees over capacity are rejected", () => {
  const result = validateReservation({ ...valid, room: TRAINING, attendees: "12" }, { now: NOW });
  assert.match(result.errors[0], /holds 10 people/);
});

test("free-text attendees from old Form rows are skipped when not provided", () => {
  assert.equal(validateReservation({ ...valid, attendees: undefined }, { now: NOW }).ok, true);
  assert.equal(validateReservation({ ...valid, attendees: "20-25" }, { now: NOW }).ok, false);
});

test("unknown rooms are rejected unless the caller allows them", () => {
  const odd = { ...valid, room: "Old room name" };
  assert.equal(validateReservation(odd, { now: NOW }).ok, false);
  assert.equal(validateReservation(odd, { now: NOW, requireKnownRoom: false }).ok, true);
});

test("findOverlaps finds same-room overlaps only", () => {
  const existing = [
    { rowIndex: 2, room: AVR, startTime: "2026-10-16T14:00:00", endTime: "2026-10-16T16:00:00" },
    { rowIndex: 3, room: TRAINING, startTime: "2026-10-16T13:00:00", endTime: "2026-10-16T15:00:00" },
    { rowIndex: 4, room: AVR, startTime: "2026-10-16T15:00:00", endTime: "2026-10-16T16:00:00" },
  ];
  assert.deepEqual(findOverlaps(valid, existing).map((r) => r.rowIndex), [2]);
});

test("back-to-back bookings don't overlap", () => {
  const existing = [{ rowIndex: 2, room: AVR, startTime: "2026-10-16T15:00:00", endTime: "2026-10-16T16:00:00" }];
  assert.equal(findOverlaps(valid, existing).length, 0);
});

test("identical duplicate submissions count as overlaps", () => {
  const existing = [{ rowIndex: 7, room: AVR, eventName: valid.eventName, startTime: "2026-10-16T13:00:00", endTime: "2026-10-16T15:00:00" }];
  assert.equal(findOverlaps(valid, existing).length, 1);
});

test("findOverlaps can exclude the row being edited", () => {
  const existing = [{ rowIndex: 5, room: AVR, startTime: "2026-10-16T13:00:00", endTime: "2026-10-16T15:00:00" }];
  assert.equal(findOverlaps(valid, existing, { excludeRowIndex: 5 }).length, 0);
});

test("fingerprints match the loaded row and reject a moved row", () => {
  const row = { rowIndex: 9, timestamp: "10/1/2026 9:14:00", room: AVR, startTime: "2026-10-16T13:00:00", endTime: "2026-10-16T15:00:00" };
  assert.equal(fingerprintMatches(row, { ...row, startTime: "2026-10-16T13:00" }), true);
  assert.equal(fingerprintMatches(row, { ...row, timestamp: "10/2/2026 8:00:00" }), false);
  assert.equal(fingerprintMatches(row, undefined), false);
});

test("public view hides who booked", () => {
  const row = { room: AVR, startTime: "a", endTime: "b", eventName: "Thesis defense", fullName: "Dela Cruz, J.", recipientEmail: "x@feutech.edu.ph", department: "CS", attendees: "20", timestamp: "t", rowIndex: 4, emailSent: true };
  assert.deepEqual(toPublicReservation(row), { room: AVR, startTime: "a", endTime: "b", eventName: "Reserved", timestamp: "t" });
});

test("statusOf reads the email columns: none sent, conflict notice, anything else", () => {
  assert.equal(statusOf({ emailSent: false, emailNote: "" }), "pending");
  assert.equal(statusOf({ emailSent: false, emailNote: "Conflict notice sent by X" }), "pending");
  assert.equal(statusOf({ emailSent: true, emailNote: "Conflict notice sent by Ana on 10/15/2026" }), "declined");
  assert.equal(statusOf({ emailSent: true, emailNote: "Confirmation sent by Ana on 10/15/2026" }), "confirmed");
  assert.equal(statusOf({ emailSent: true, emailNote: "Dear student, your booking..." }), "confirmed");
  assert.equal(statusOf({ emailSent: true }), "confirmed");
});

test("a declined request no longer counts as an overlap", () => {
  const declined = { ...valid, rowIndex: 7, status: "declined" };
  const kept = { ...valid, rowIndex: 8, status: "confirmed" };
  assert.deepEqual(findOverlaps(valid, [declined]), []);
  assert.deepEqual(findOverlaps(valid, [declined, kept]).map((r) => r.rowIndex), [8]);
});

test("the public list drops declined requests and personal details", () => {
  const rows = [
    { ...valid, fullName: "Cruz, Ana", status: "confirmed", timestamp: "t1" },
    { ...valid, fullName: "Reyes, Ben", status: "declined", timestamp: "t2" },
  ];
  const out = publicReservations(rows);
  assert.equal(out.length, 1);
  assert.equal(out[0].timestamp, "t1");
  assert.equal(out[0].fullName, undefined);
});

