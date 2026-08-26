import "server-only";

import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT must be set to send push notifications");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
};

/**
 * Returns `"gone"` when the push service reports the subscription is dead (410/404) so the
 * caller can prune it — a stale endpoint otherwise fails silently forever.
 */
export async function sendPush(subscription: PushSubscriptionInput, payload: PushPayload): Promise<"sent" | "gone"> {
  ensureConfigured();

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return "sent";
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) return "gone";
    throw error;
  }
}
