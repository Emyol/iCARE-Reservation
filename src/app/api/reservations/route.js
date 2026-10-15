import { NextResponse } from "next/server";
import {
  getReservations,
  appendReservation,
  appendAuditLog,
  updateEmailStatus,
} from "@/lib/googleSheets";
import { findAdmin, sendConfirmationEmail } from "@/lib/email";
import { getAdmin, requireAdmin } from "@/lib/auth";
import {
  validateReservation,
  findOverlaps,
  toPublicReservation,
  conflictSummary,
} from "@/lib/reservationRules";

/**
 * GET /api/reservations
 * Public. Admins get full rows; everyone else gets room and time only,
 * because rows hold requesters' names and emails.
 */
export async function GET(request) {
  try {
    const admin = getAdmin(request);
    const reservations = await getReservations();
    const response = NextResponse.json(
      admin ? reservations : reservations.map(toPublicReservation),
    );
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("[DEBUG] Error fetching reservations:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/reservations
 * Admin only. Validates, checks for overlaps, then appends to the sheet.
 * An overlap is saved only with `override: true` and a `reason`.
 */
export async function POST(request) {
  try {
    const { admin, response } = requireAdmin(request);
    if (response) return response;

    const body = await request.json();
    const { room, eventName, fullName, email, attendees, override, reason } = body;

    const check = validateReservation({
      room,
      eventName,
      startTime: body.startTime,
      endTime: body.endTime,
      attendees,
    });
    if (!check.ok) {
      return NextResponse.json(
        { error: check.errors[0], errors: check.errors },
        { status: 400 },
      );
    }
    const { startTime, endTime } = check.value;

    // Saving without a conflict check is how double bookings got in, so a
    // failed read stops the save instead of being ignored.
    let allReservations;
    try {
      allReservations = await getReservations();
    } catch (err) {
      console.error("Error checking conflicts:", err.message);
      return NextResponse.json(
        { error: "Couldn't check the schedule for conflicts. Nothing was saved. Try again." },
        { status: 503 },
      );
    }

    const overlaps = findOverlaps({ room, startTime, endTime }, allReservations);
    const overrideReason = typeof reason === "string" ? reason.trim() : "";
    if (overlaps.length > 0 && !(override && overrideReason)) {
      return NextResponse.json(
        {
          error: "This time overlaps an existing booking.",
          needsOverride: true,
          conflicts: overlaps.map(conflictSummary),
        },
        { status: 409 },
      );
    }

    const reservation = await appendReservation({
      room: room.trim(),
      eventName: eventName.trim(),
      startTime,
      endTime,
      fullName: fullName || "Admin",
      email: email || "",
      attendees: attendees || "",
    });

    // The booking is saved, so the booker always gets a confirmation; the old
    // "Room Not Available" email contradicted the schedule.
    let emailResult = null;
    if (email) {
      const account = findAdmin(admin.username);
      if (!account || !account.smtpPassword) {
        emailResult = {
          sent: false,
          error: "Email isn't set up for your admin account, so no confirmation was sent.",
        };
      } else {
        try {
          await sendConfirmationEmail({
            admin: account,
            reservation: { ...reservation, recipientEmail: email },
          });
          emailResult = { sent: true, type: "confirmation" };
          try {
            const note = `Confirmation sent by ${account.name || admin.username} on ${new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })}`;
            await updateEmailStatus(reservation.rowIndex, note);
            reservation.emailSent = true;
          } catch (updateErr) {
            console.error("Email status update failed:", updateErr.message);
          }
        } catch (err) {
          console.error("Auto-email failed:", err.message);
          emailResult = {
            sent: false,
            error:
              err.code === "EAUTH"
                ? "The confirmation email couldn't be sent: Outlook rejected the app password."
                : "The confirmation email couldn't be sent.",
          };
        }
      }
    }

    try {
      const overrideNote = overlaps.length
        ? ` · OVERRIDE, overlaps ${overlaps.map((o) => o.eventName).join(", ")}: ${overrideReason}`
        : "";
      await appendAuditLog({
        action: "CREATE",
        admin: admin.name || admin.username || "Admin",
        details: `${eventName.trim()} — ${room.trim()} (${startTime} to ${endTime})${overrideNote}`,
      });
    } catch (err) {
      console.error("Audit log failed:", err.message);
    }

    return NextResponse.json(
      {
        success: true,
        reservation,
        overridden: overlaps.length > 0,
        email: emailResult,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { error: "Failed to create reservation" },
      { status: 500 },
    );
  }
}
