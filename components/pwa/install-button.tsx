"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Not in TypeScript's standard DOM lib — beforeinstallprompt is a real, widely-implemented
// (Chrome/Edge/Android) but still non-standard event, so there's no built-in type for it.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * DECISIONS.md ADR-089. Renders nothing until the browser actually fires
 * `beforeinstallprompt` — which only happens when the manifest/service-worker installability
 * criteria are already met and the app isn't already installed. That means this button is
 * self-suppressing exactly the way the rest of the app avoids showing UI with nothing useful
 * to say: no separate "is this installable" check needed, no fallback state to design for
 * unsupported browsers (notably Safari/iOS, which never fires this event at all — those
 * users still have the existing `appleWebApp` meta-tag-driven native "Add to Home Screen"
 * flow, just without a custom prompt).
 */
export function InstallPwaButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstallEvent(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    // Whatever the user chose, this exact prompt object can't be reused — Chrome only fires
    // beforeinstallprompt again later (e.g. next visit) if they dismissed it.
    setInstallEvent(null);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleInstall} className="gap-2">
      <Download className="h-4 w-4" />
      Install
    </Button>
  );
}
