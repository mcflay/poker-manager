/**
 * Edge middleware for route protection.
 *
 * Uses the edge-compatible NextAuth config (no DB imports) to check
 * JWT sessions and enforce auth on protected routes.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/edge-config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
