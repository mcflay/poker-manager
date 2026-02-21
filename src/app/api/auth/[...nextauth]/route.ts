/**
 * NextAuth.js API route handler.
 *
 * Handles all /api/auth/* routes: sign-in, sign-out, session, CSRF, etc.
 * Delegates to the NextAuth configuration in lib/auth/config.ts.
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
