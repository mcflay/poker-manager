/**
 * App layout — wraps all authenticated pages.
 *
 * Checks authentication server-side and redirects to /login if
 * the user is not signed in. This is a secondary guard on top
 * of the middleware (belt-and-suspenders).
 *
 * @layout (app)
 */
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <>{children}</>;
}
