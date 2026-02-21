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
import { LogOut, User, Settings } from "lucide-react";
import Link from "next/link";

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
      <Link href="/settings">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </Link>
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
