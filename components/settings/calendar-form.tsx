"use client";

import { useActionState } from "react";
import {
  connectCalendarAction,
  disconnectCalendarAction,
  type CalendarFormState,
} from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CalendarForm({
  isConnected,
  displayName,
}: {
  isConnected: boolean;
  displayName: string | null;
}) {
  const [state, formAction, pending] = useActionState<CalendarFormState, FormData>(
    connectCalendarAction,
    undefined,
  );

  return (
    <div className="flex flex-col gap-4">
      {isConnected && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Connected{displayName ? ` — ${displayName}` : ""}.
          </p>
          <form action={disconnectCalendarAction}>
            <Button type="submit" variant="outline" size="sm">
              Disconnect
            </Button>
          </form>
        </div>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Uses an app-specific password, not your real Apple ID password — generate one at{" "}
        <span className="font-medium">appleid.apple.com</span> under Sign-In and Security → App-Specific
        Passwords.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="calendarUsername">Apple ID email</Label>
          <Input id="calendarUsername" name="username" type="email" autoComplete="off" placeholder="you@icloud.com" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="appPassword">App-specific password</Label>
          <Input
            id="appPassword"
            name="appPassword"
            type="password"
            autoComplete="off"
            placeholder={isConnected ? "•••• •••• •••• •••• (saved)" : "xxxx-xxxx-xxxx-xxxx"}
            required
          />
        </div>

        {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Connecting…" : isConnected ? "Update" : "Connect"}
        </Button>
      </form>
    </div>
  );
}
