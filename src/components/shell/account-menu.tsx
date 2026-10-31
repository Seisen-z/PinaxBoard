"use client";

import { LogIn, LogOut, Settings, UserPlus } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/features/auth/types";

export interface AccountMenuProps {
  /** `null` when signed out, or when no Supabase project is connected. */
  user: SessionUser | null;
  /**
   * The sign-out server action. When absent the Sign out row is omitted
   * entirely, rather than rendering a control that quietly does nothing.
   */
  onSignOut?: () => Promise<void>;
}

/**
 * The header's account control (IMPLEMENTATION_PLAN.md §12 — auth-aware
 * navigation).
 *
 * Signed out, it offers a way in without blocking anything: the board runs on
 * local state, so the app stays usable for someone who has not signed up.
 */
export function AccountMenu({ user, onSignOut }: AccountMenuProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            user
              ? `Account: ${user.displayName ?? user.email ?? "signed in"}`
              : "Account — signed out"
          }
          className="tk-clay grid size-9 shrink-0 place-items-center rounded-full bg-[image:var(--clay-neutral-gradient)] text-xs font-semibold"
        >
          <span aria-hidden="true">{user ? user.initials : "?"}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-auto min-w-52">
        {user ? (
          <>
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate">{user.displayName ?? "Your account"}</span>
              {user.email ? (
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              ) : null}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem disabled title="Settings arrive in a later milestone">
              <Settings aria-hidden="true" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/*
              A form, not an onClick: signing out is a state change on the
              server, and a form post still works if the JavaScript bundle has
              not loaded.
            */}
            {onSignOut ? (
              <form action={onSignOut}>
                <DropdownMenuItem asChild onSelect={(event) => event.preventDefault()}>
                  <button type="submit" className="w-full">
                    <LogOut aria-hidden="true" />
                    Sign out
                  </button>
                </DropdownMenuItem>
              </form>
            ) : null}
          </>
        ) : (
          <>
            <DropdownMenuLabel>Not signed in</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/login">
                <LogIn aria-hidden="true" />
                Sign in
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/register">
                <UserPlus aria-hidden="true" />
                Create an account
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
