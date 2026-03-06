import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  updateReservation,
  deleteReservation,
  appendAuditLog,
} from "@/lib/googleSheets";

/**
 * PUT /api/reservations/:rowIndex
 * Admin-protected. Updates a reservation row in the Google Sheet.
 */
export async function PUT(request, { params }) {
  try {
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

    const { rowIndex } = await params;
    const rowNum = parseInt(rowIndex, 10);
    if (isNaN(rowNum) || rowNum < 2) {
      return NextResponse.json(
        { error: "Invalid row index" },
        { status: 400 },
      );
    }

    const fields = await request.json();
    await updateReservation(rowNum, fields);

    // Audit log
    try {
      await appendAuditLog({
        action: "EDIT",
        admin: decoded.name || decoded.username,
        targetRow: rowNum.toString(),
        details: `Updated: ${Object.keys(fields).join(", ")}`,
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
 * Admin-protected. Clears a reservation row in the Google Sheet.
 */
export async function DELETE(request, { params }) {
  try {
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

    const { rowIndex } = await params;
    const rowNum = parseInt(rowIndex, 10);
    if (isNaN(rowNum) || rowNum < 2) {
      return NextResponse.json(
        { error: "Invalid row index" },
        { status: 400 },
      );
    }

    await deleteReservation(rowNum);

    // Audit log
    try {
      await appendAuditLog({
        action: "DELETE",
        admin: decoded.name || decoded.username,
        targetRow: rowNum.toString(),
        details: "Reservation deleted (row cleared)",
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
