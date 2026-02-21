/**
 * User registration API route.
 *
 * Creates a new user account with email and bcrypt-hashed password.
 * Validates that email is not already taken and password meets
 * minimum length requirements.
 *
 * @endpoint POST /api/auth/register
 * @body {{ name: string, email: string, password: string }}
 * @returns {{ user: { id, name, email } }}
 */

import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { sqlite } from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = sqlite
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as { id: string } | undefined;

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hash(password, 12);
    const id = randomUUID();

    sqlite
      .prepare(
        "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)"
      )
      .run(id, name || null, email, passwordHash);

    return NextResponse.json({
      user: { id, name: name || null, email },
    });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
