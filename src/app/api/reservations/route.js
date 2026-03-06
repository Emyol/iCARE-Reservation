import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  getReservations,
  appendReservation,
  appendAuditLog,
} from "@/lib/googleSheets";
import {
  findAdmin,
  sendConfirmationEmail,
  sendConflictEmail,
  findConflict,
} from "@/lib/email";

/**
 * GET /api/reservations
 * Public endpoint. Returns all reservations from the Google Sheet.
 */
export async function GET() {
  try {
    const reservations = await getReservations();
    console.log("[DEBUG] Reservations fetched:", reservations.length, "rows");
    if (reservations.length > 0) {
      console.log("[DEBUG] First row sample:", JSON.stringify(reservations[0]));
    }
    return NextResponse.json(reservations);
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
 * Protected endpoint. Requires valid admin JWT cookie.
 * Appends a new reservation to the Google Sheet.
 */
export async function POST(request) {
  try {
    // Verify admin authentication
    const token = request.cookies.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }

    // Decode token to get admin identity
    const decoded = jwt.decode(token);

    // Parse and validate request body
    const body = await request.json();
    const { room, eventName, startTime, endTime, fullName, email, attendees } =
      body;

    if (!room || !eventName || !startTime || !endTime) {
      return NextResponse.json(
        {
          error: "All fields are required: room, eventName, startTime, endTime",
        },
        { status: 400 },
      );
    }

    // Validate that endTime is after startTime
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 format." },
        { status: 400 },
      );
    }
    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 },
      );
    }

    // Check for conflicts BEFORE appending
    let conflictingReservation = null;
    try {
      const allReservations = await getReservations();
      conflictingReservation = findConflict(
        { room, startTime, endTime, eventName },
        allReservations,
      );
    } catch (err) {
      console.error("Error checking conflicts:", err.message);
    }

    // Append to Google Sheet — pass timezone-free datetime strings
    const reservation = await appendReservation({
      room,
      eventName,
      startTime,
      endTime,
      fullName: fullName || "Admin",
      email: email || "",
      attendees: attendees || "",
    });

    // Auto-send email if reservant email is provided and admin has SMTP configured
    let emailResult = null;
    if (email && decoded?.username) {
      const admin = findAdmin(decoded.username);
      if (admin && admin.smtpPassword) {
        try {
          const reservationForEmail = {
            ...reservation,
            recipientEmail: email,
          };
          if (conflictingReservation) {
            await sendConflictEmail({
              admin,
              reservation: reservationForEmail,
              conflictingReservation,
            });
            emailResult = { sent: true, type: "conflict" };
          } else {
            await sendConfirmationEmail({
              admin,
              reservation: reservationForEmail,
            });
            emailResult = { sent: true, type: "confirmation" };
          }
        } catch (err) {
          console.error("Auto-email failed:", err.message);
          emailResult = { sent: false, error: err.message };
        }
      }
    }

    // Audit log
    try {
      await appendAuditLog({
        action: "CREATE",
        admin: decoded?.name || decoded?.username || "Admin",
        details: `${eventName} — ${room} (${startTime} to ${endTime})`,
      });
    } catch (err) {
      console.error("Audit log failed:", err.message);
    }

    return NextResponse.json(
      {
        success: true,
        reservation,
        conflict: conflictingReservation
          ? {
              eventName: conflictingReservation.eventName,
              startTime: conflictingReservation.startTime,
              endTime: conflictingReservation.endTime,
              fullName: conflictingReservation.fullName || "",
              timestamp: conflictingReservation.timestamp || "",
              hasPriority: true,
            }
          : null,
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
