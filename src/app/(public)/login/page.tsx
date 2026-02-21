/**
 * Login page.
 *
 * Displays the login form centered on screen.
 * Redirects to home if already authenticated.
 *
 * @page /login
 */

import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <LoginForm />
    </div>
  );
}
