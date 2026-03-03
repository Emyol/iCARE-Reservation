import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

/**
 * GET /api/auth
 * Checks whether the current request has a valid admin_token cookie.
 * Used by AdminProvider on mount to restore session across page navigation.
 */
export async function GET(request) {
  try {
    const token = request.cookies.get("admin_token")?.value;
    if (!token) return NextResponse.json({ isAdmin: false });
    jwt.verify(token, process.env.JWT_SECRET);
    return NextResponse.json({ isAdmin: true });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}

/**
 * DELETE /api/auth
 * Clears the admin_token httpOnly cookie (proper server-side logout).
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("admin_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return response;
}

/**
 * POST /api/auth
 * Authenticates admin by checking password against ADMIN_PASSWORD env var.
 * On success, sets an HTTP-only JWT cookie.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminPassword || !jwtSecret) {
      console.error(
        "Missing ADMIN_PASSWORD or JWT_SECRET environment variables",
      );
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { role: "admin", iat: Math.floor(Date.now() / 1000) },
      jwtSecret,
      { expiresIn: "8h" },
    );

    // Set HTTP-only cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
