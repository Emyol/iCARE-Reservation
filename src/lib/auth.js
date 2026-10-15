import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

/** The signed-in admin's token payload, or null. */
export function getAdmin(request) {
  const token = request.cookies.get("admin_token")?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

/** Returns `{ admin }`, or `{ response }` with the 401 to send back. */
export function requireAdmin(request) {
  if (!request.cookies.get("admin_token")?.value) {
    return {
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  const admin = getAdmin(request);
  if (!admin) {
    return {
      response: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }),
    };
  }
  return { admin };
}
