/**
 * Edge-compatible NextAuth configuration.
 *
 * This module contains the NextAuth config that can run in the Edge
 * Runtime (middleware). It has NO Node.js-specific imports (no DB,
 * no bcrypt, no `path`/`fs`). Only session strategy, pages, and
 * callbacks that don't need DB access.
 *
 * The full config (with Credentials provider) lives in config.ts
 * and spreads this base config.
 *
 * @module auth/edge-config
 */

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    /** Route protection: allow public routes, require auth for app routes */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAuth = !!auth;

      // Public pages — always accessible
      if (pathname === "/" || pathname === "/login" || pathname === "/register") {
        // Redirect authenticated users away from login/register to the app
        if (isAuth && (pathname === "/login" || pathname === "/register")) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      // API routes handle their own auth
      if (pathname.startsWith("/api/")) return true;

      // All other routes require authentication
      return isAuth;
    },
    /** Attach userId to the JWT token */
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    /** Expose userId on the session object */
    session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
