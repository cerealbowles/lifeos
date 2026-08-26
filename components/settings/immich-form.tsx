"use client";

import { useActionState } from "react";
import { connectImmichAction, disconnectImmichAction, type ImmichFormState } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImmichForm({
  isConnected,
  instanceUrl,
  albumId,
}: {
  isConnected: boolean;
  instanceUrl: string | null;
  albumId: string | null;
}) {
  const [state, formAction, pending] = useActionState<ImmichFormState, FormData>(connectImmichAction, undefined);

  return (
    <div className="flex flex-col gap-4">
      {isConnected && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Connected — {instanceUrl}, album {albumId}.
          </p>
          <form action={disconnectImmichAction}>
            <Button type="submit" variant="outline" size="sm">
              Disconnect
            </Button>
          </form>
        </div>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Moments photos are uploaded to this Immich album, then referenced (not duplicated) in the Log tab of
        Feed. Find the album ID in its share URL: immich.example.com/albums/<span className="font-medium">this-part</span>.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="instanceUrl">Immich URL</Label>
          <Input
            id="instanceUrl"
            name="instanceUrl"
            type="url"
            autoComplete="off"
            placeholder="http://192.168.1.23:2283"
            defaultValue={instanceUrl ?? ""}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="immichApiKey">API key</Label>
          <Input
            id="immichApiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={isConnected ? "•••••••••••••••••••••••••••••• (saved)" : "Paste your API key"}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="albumId">Album ID</Label>
          <Input
            id="albumId"
            name="albumId"
            autoComplete="off"
            placeholder="e.g. ea79d265-9115-4e2a-8b9a-270012f69f88"
            defaultValue={albumId ?? ""}
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
