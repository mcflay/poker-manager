/**
 * NextAuth.js type augmentations.
 *
 * Extends the default session types to include the user ID
 * that is attached via the JWT callback in auth/config.ts.
 */
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
