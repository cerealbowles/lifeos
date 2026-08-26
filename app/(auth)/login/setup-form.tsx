"use client";

import { useActionState, useState } from "react";
import { setupFirstUser, type AuthFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function detectTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
}

export function SetupForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(setupFirstUser, undefined);
  const [timezone] = useState(detectTimezone);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Your name</Label>
        <Input id="displayName" name="displayName" autoComplete="name" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <input type="hidden" name="timezone" value={timezone} />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">Timezone detected as {timezone}.</p>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
