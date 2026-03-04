import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAdminAccounts } from "@/lib/email";

/**
 * GET /api/auth
 * Checks whether the current request has a valid admin_token cookie.
 * Returns admin identity if authenticated.
 */
export async function GET(request) {
  try {
    const token = request.cookies.get("admin_token")?.value;
    if (!token) return NextResponse.json({ isAdmin: false });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return NextResponse.json({
      isAdmin: true,
      adminInfo: {
        username: decoded.username || "admin",
        name: decoded.name || "Administrator",
        email: decoded.email || "",
      },
    });
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
 * Authenticates admin by checking username+password against ADMIN_ACCOUNTS,
 * or password-only against legacy ADMIN_PASSWORD.
 * On success, sets an HTTP-only JWT cookie with admin identity.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("Missing JWT_SECRET environment variable");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    let adminInfo = null;

    // Try multi-admin accounts first
    const accounts = getAdminAccounts();
    if (accounts.length > 0) {
      if (!username) {
        return NextResponse.json(
          { error: "Username is required" },
          { status: 400 },
        );
      }
      const account = accounts.find(
        (a) => a.username === username && a.password === password,
      );
      if (account) {
        adminInfo = {
          username: account.username,
          name: account.name,
          email: account.email,
        };
      }
    } else {
      // Legacy single-password mode
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.error("Missing ADMIN_PASSWORD or ADMIN_ACCOUNTS env var");
        return NextResponse.json(
          { error: "Server configuration error" },
          { status: 500 },
        );
      }
      if (password === adminPassword) {
        adminInfo = {
          username: username || "admin",
          name: "Administrator",
          email: "",
        };
      }
    }

    if (!adminInfo) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Generate JWT token with admin identity
    const token = jwt.sign(
      {
        role: "admin",
        username: adminInfo.username,
        name: adminInfo.name,
        email: adminInfo.email,
        iat: Math.floor(Date.now() / 1000),
      },
      jwtSecret,
      { expiresIn: "8h" },
    );

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      adminInfo,
    });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60,
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
