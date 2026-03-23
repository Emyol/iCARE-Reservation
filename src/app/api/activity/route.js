import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAuditLog } from "@/lib/googleSheets";

/**
 * GET /api/activity
 * Admin-protected. Returns all audit log entries.
 */
export async function GET(request) {
  try {
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

    const logs = await getAuditLog();
    const response = NextResponse.json(logs);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("Error fetching activity log:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity log" },
      { status: 500 },
    );
  }
}
