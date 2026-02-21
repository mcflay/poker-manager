/**
 * NextAuth.js v5 configuration for the poker tournament manager.
 *
 * Uses the Credentials provider for email/password authentication
 * with bcrypt password hashing. JWT strategy is used for sessions
 * since SQLite doesn't scale well with database session lookups.
 *
 * The config is split: `authConfig` (edge-compatible, no DB imports)
 * is used by middleware, while `auth`/`signIn`/`signOut` (full config
 * with Credentials provider) is used by server-side code.
 *
 * @module auth/config
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { sqlite } from "@/lib/db";
import { authConfig } from "./edge-config";

interface DbUser {
  id: string;
  name: string | null;
  email: string;
  password_hash: string | null;
  image: string | null;
  display_currency: string | null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = sqlite
          .prepare("SELECT * FROM users WHERE email = ?")
          .get(email) as DbUser | undefined;

        if (!user || !user.password_hash) {
          return null;
        }

        const isValid = await compare(password, user.password_hash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
});
