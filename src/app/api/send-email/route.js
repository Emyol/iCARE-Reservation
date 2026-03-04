import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getReservations, updateEmailStatus } from "@/lib/googleSheets";
import {
  findAdmin,
  sendConfirmationEmail,
  sendConflictEmail,
  findConflict,
} from "@/lib/email";

/**
 * POST /api/send-email
 * Protected endpoint. Sends an email for a specific reservation.
 *
 * Body: {
 *   reservation: { room, eventName, startTime, endTime, fullName, recipientEmail, rowIndex },
 *   emailType: "confirmation" | "conflict"
 * }
 *
 * The system auto-detects conflicts if emailType is not specified.
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

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }

    // Find the admin account (needed for SMTP credentials)
    const admin = findAdmin(decoded.username);
    if (!admin || !admin.smtpPassword) {
      return NextResponse.json(
        {
          error:
            "Email not configured for your admin account. Please add SMTP credentials.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { reservation, emailType } = body;

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation data is required" },
        { status: 400 },
      );
    }

    const recipientEmail = reservation.recipientEmail || reservation.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No recipient email address available for this reservation" },
        { status: 400 },
      );
    }

    // Determine email type: auto-detect conflict or use explicit type
    let type = emailType;
    let conflictingReservation = null;

    if (!type || type === "auto") {
      // Fetch all reservations to check for conflicts
      const allReservations = await getReservations();
      conflictingReservation = findConflict(reservation, allReservations);
      type = conflictingReservation ? "conflict" : "confirmation";
    }

    // If type is conflict but no conflicting reservation was determined, try to find one
    if (type === "conflict" && !conflictingReservation) {
      const allReservations = await getReservations();
      conflictingReservation = findConflict(reservation, allReservations);
    }

    // Send the email
    let result;
    if (type === "conflict" && conflictingReservation) {
      result = await sendConflictEmail({
        admin,
        reservation: { ...reservation, recipientEmail },
        conflictingReservation,
      });
    } else {
      result = await sendConfirmationEmail({
        admin,
        reservation: { ...reservation, recipientEmail },
      });
    }

    // Update email status in Google Sheet if we have a row index
    if (reservation.rowIndex) {
      try {
        const note =
          type === "conflict"
            ? `Conflict notice sent by ${admin.name} on ${new Date().toLocaleString()}`
            : `Confirmation sent by ${admin.name} on ${new Date().toLocaleString()}`;
        await updateEmailStatus(reservation.rowIndex, note);
      } catch (err) {
        console.error("Failed to update email status in sheet:", err.message);
        // Don't fail the request — email was already sent
      }
    }

    return NextResponse.json({
      success: true,
      emailType: type,
      sentTo: recipientEmail,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error sending email:", error);

    // Provide friendly error messages for common SMTP issues
    let errorMessage = "Failed to send email";
    if (error.code === "EAUTH") {
      errorMessage =
        "SMTP authentication failed. Check your Outlook app password.";
    } else if (error.code === "ECONNECTION") {
      errorMessage =
        "Could not connect to Outlook SMTP server. Check your network.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
