/**
 * Auth module re-exports.
 *
 * Centralizes auth imports so other files can do:
 * `import { auth, signIn, signOut } from "@/lib/auth"`
 *
 * @module auth
 */

export { handlers, auth, signIn, signOut } from "./config";
