/**
 * User menu dropdown component.
 *
 * Displays the current user's name/email with a sign-out button.
 * Shown in the app header when authenticated.
 *
 * @component UserMenu
 */
"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <a href="/login">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          <User className="h-3.5 w-3.5" />
          Sign In
        </Button>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden lg:block">
        {session.user.name || session.user.email}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="gap-1.5 text-xs"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign Out
      </Button>
    </div>
  );
}
