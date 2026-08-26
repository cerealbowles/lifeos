"use client";

import { useActionState } from "react";
import { connectWeatherAction, type WeatherFormState } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WeatherForm({
  isConnected,
  locationName,
}: {
  isConnected: boolean;
  locationName: string | null;
}) {
  const [state, formAction, pending] = useActionState<WeatherFormState, FormData>(connectWeatherAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isConnected && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Connected{locationName ? ` — showing weather for ${locationName}` : ""}.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="apiKey">OpenWeatherMap API key</Label>
        <Input
          id="apiKey"
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={isConnected ? "•••••••••••••••••••••••••••••• (saved)" : "Paste your API key"}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="postalCode">Postal code</Label>
        <Input id="postalCode" name="postalCode" placeholder="e.g. 23111" required className="max-w-[160px]" />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700 dark:text-emerald-400">{state.success}</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Connecting…" : isConnected ? "Update" : "Connect"}
      </Button>
    </form>
  );
}
