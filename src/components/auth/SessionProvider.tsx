/**
 * NextAuth SessionProvider wrapper.
 *
 * Client component that wraps the application with NextAuth's
 * SessionProvider for session state management on the client.
 *
 * @component SessionProvider
 */
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
