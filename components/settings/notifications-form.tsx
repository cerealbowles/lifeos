"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type Status = "checking" | "unsupported" | "blocked" | "enabled" | "disabled";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64Safe);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Web Push requires a real production service-worker registration
 * (components/pwa/register-service-worker.tsx skips registering in dev on purpose) — so this
 * reads "Not available in this environment yet" during local development, same class of
 * caveat as ADR-089's install button only firing under real installability conditions.
 */
export function NotificationsForm() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    async function checkStatus() {
      if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("blocked");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setStatus(subscription ? "enabled" : "disabled");
    }
    checkStatus();
  }, []);

  async function enable() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus(permission === "denied" ? "blocked" : "disabled");
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const { publicKey } = await apiFetch<{ publicKey: string | null }>("/api/notifications/vapid-public-key");
    if (!publicKey) {
      setStatus("unsupported");
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = subscription.toJSON();

    await apiFetch("/api/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    setStatus("enabled");
  }

  async function disable() {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await apiFetch("/api/notifications/subscribe", {
        method: "DELETE",
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
    setStatus("disabled");
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Not available in this browser yet.</p>;
  }

  if (status === "blocked") {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Notifications are blocked for this site — enable them in your browser&apos;s site settings.
      </p>
    );
  }

  if (status === "enabled") {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
          <Bell className="h-4 w-4 text-neutral-400" />
          Enabled on this device
        </p>
        <Button type="button" variant="outline" size="sm" onClick={disable}>
          <BellOff className="h-4 w-4" />
          Disable
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Get notified for genuinely time-sensitive items (overdue tasks, bills due) without opening the app.
      </p>
      <Button type="button" size="sm" onClick={enable}>
        <Bell className="h-4 w-4" />
        Enable
      </Button>
    </div>
  );
}
