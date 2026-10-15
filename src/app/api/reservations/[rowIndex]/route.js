import { NextResponse } from "next/server";
import {
  getReservations,
  updateReservation,
  deleteReservation,
  appendAuditLog,
} from "@/lib/googleSheets";
import { requireAdmin } from "@/lib/auth";
import {
  validateReservation,
  findOverlaps,
  fingerprintMatches,
  normalizeDateTime,
  conflictSummary,
} from "@/lib/reservationRules";

const EDITABLE = ["room", "eventName", "startTime", "endTime", "fullName", "attendees", "email"];

function parseRow(rowIndex) {
  const rowNum = parseInt(rowIndex, 10);
  return isNaN(rowNum) || rowNum < 2 ? null : rowNum;
}

/**
 * Loads the row the client means to change. Rows are addressed by sheet row
 * number, which shifts if the sheet is sorted or edited by hand, so the client
 * sends back what it loaded (`expected`) and a mismatch is refused.
 * Sheets has no transactions: this narrows the window but can't close it.
 */
async function loadExpectedRow(rowNum, expected) {
  let all;
  try {
    all = await getReservations();
  } catch (err) {
    console.error("Error reading reservations:", err.message);
    return {
      response: NextResponse.json(
        { error: "Couldn't read the schedule. Nothing was changed. Try again." },
        { status: 503 },
      ),
    };
  }
  const current = all.find((r) => r.rowIndex === rowNum);
  if (!current) {
    return {
      response: NextResponse.json(
        { error: "This reservation no longer exists in the sheet. Refresh to see the latest schedule.", stale: true },
        { status: 409 },
      ),
    };
  }
  if (!fingerprintMatches(current, expected)) {
    return {
      response: NextResponse.json(
        { error: "This reservation changed in the sheet since you opened it. Refresh and try again.", stale: true },
        { status: 409 },
      ),
    };
  }
  return { current, all };
}

/**
 * PUT /api/reservations/:rowIndex
 * Admin only. Body: editable fields + `expected` (the row as loaded), plus
 * `override` and `reason` to save a change that overlaps another booking.
 */
export async function PUT(request, { params }) {
  try {
    const { admin, response } = requireAdmin(request);
    if (response) return response;

    const { rowIndex } = await params;
    const rowNum = parseRow(rowIndex);
    if (!rowNum) {
      return NextResponse.json({ error: "Invalid row index" }, { status: 400 });
    }

    const body = await request.json();
    const fields = Object.fromEntries(
      EDITABLE.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]),
    );

    const loaded = await loadExpectedRow(rowNum, body.expected);
    if (loaded.response) return loaded.response;
    const { current, all } = loaded;

    const merged = {
      room: fields.room ?? current.room,
      eventName: fields.eventName ?? current.eventName,
      startTime: fields.startTime ?? current.startTime,
      endTime: fields.endTime ?? current.endTime,
    };
    const timesChanged =
      normalizeDateTime(merged.startTime) !== normalizeDateTime(current.startTime) ||
      normalizeDateTime(merged.endTime) !== normalizeDateTime(current.endTime);
    const roomChanged = (merged.room || "").trim() !== (current.room || "").trim();
    // Old Form rows can hold free text such as "20-25"; only check a new value.
    const attendeesChanged =
      fields.attendees !== undefined && String(fields.attendees) !== String(current.attendees ?? "");

    const check = validateReservation(
      { ...merged, attendees: attendeesChanged ? fields.attendees : undefined },
      { requireKnownRoom: roomChanged, allowPast: !timesChanged },
    );
    if (!check.ok) {
      return NextResponse.json(
        { error: check.errors[0], errors: check.errors },
        { status: 400 },
      );
    }

    // Rows already overlapping (e.g. two Form submissions) can still have
    // their details edited; only a new time or room is checked.
    const overlaps =
      timesChanged || roomChanged
        ? findOverlaps({ ...merged, ...check.value }, all, { excludeRowIndex: rowNum })
        : [];
    const overrideReason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (overlaps.length > 0 && !(body.override && overrideReason)) {
      return NextResponse.json(
        {
          error: "This time overlaps an existing booking.",
          needsOverride: true,
          conflicts: overlaps.map(conflictSummary),
        },
        { status: 409 },
      );
    }

    if (fields.startTime) fields.startTime = check.value.startTime;
    if (fields.endTime) fields.endTime = check.value.endTime;
    await updateReservation(rowNum, fields);

    try {
      const overrideNote = overlaps.length
        ? ` · OVERRIDE, overlaps ${overlaps.map((o) => o.eventName).join(", ")}: ${overrideReason}`
        : "";
      await appendAuditLog({
        action: "EDIT",
        admin: admin.name || admin.username,
        targetRow: rowNum.toString(),
        details: `Updated: ${Object.keys(fields).join(", ")}${overrideNote}`,
      });
    } catch (err) {
      console.error("Audit log failed:", err.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { error: "Failed to update reservation" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/reservations/:rowIndex
 * Admin only. Body: `expected` (the row as loaded). Clears the row.
 */
export async function DELETE(request, { params }) {
  try {
    const { admin, response } = requireAdmin(request);
    if (response) return response;

    const { rowIndex } = await params;
    const rowNum = parseRow(rowIndex);
    if (!rowNum) {
      return NextResponse.json({ error: "Invalid row index" }, { status: 400 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      // No body: the fingerprint check below refuses the request.
    }

    const loaded = await loadExpectedRow(rowNum, body.expected);
    if (loaded.response) return loaded.response;
    const { current } = loaded;

    await deleteReservation(rowNum);

    try {
      await appendAuditLog({
        action: "DELETE",
        admin: admin.name || admin.username,
        targetRow: rowNum.toString(),
        details: `Deleted: ${current.eventName} — ${current.room} (${current.startTime} to ${current.endTime})`,
      });
    } catch (err) {
      console.error("Audit log failed:", err.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reservation:", error);
    return NextResponse.json(
      { error: "Failed to delete reservation" },
      { status: 500 },
    );
  }
}
