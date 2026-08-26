"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FeedItemsList } from "./feed-items-list";
import { NewMomentForm } from "@/components/moments/new-moment-form";
import { MomentsList } from "@/components/moments/moments-list";

const TABS = ["RSS", "Log"] as const;
type Tab = (typeof TABS)[number];

/**
 * DECISIONS.md ADR-096 — Moments ("Log") lives as a segment inside the existing Feed tab
 * rather than a new nav item, per the planning doc's explicit "new nav items are expensive"
 * principle and its own placement instruction: "segmented view within the existing Feed tab —
 * RSS | Log — same pill/segment pattern as Now/Today/Everything." Reuses the exact pill
 * styling from components/dashboard/mobile-today-tabs.tsx.
 */
export function FeedTabs({
  hasSubscriptions,
  immichConnected,
}: {
  hasSubscriptions: boolean;
  immichConnected: boolean;
}) {
  const [tab, setTab] = useState<Tab>("RSS");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-full py-1.5 text-sm font-medium transition-colors",
              tab === t
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                : "text-neutral-500 dark:text-neutral-400",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "RSS" &&
        (hasSubscriptions ? (
          <FeedItemsList />
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            You&apos;re not subscribed to any feeds yet.{" "}
            <Link href="/settings" className="underline">
              Add some in Settings
            </Link>
            .
          </p>
        ))}

      {tab === "Log" &&
        (immichConnected ? (
          <div className="flex flex-col gap-4">
            <NewMomentForm />
            <MomentsList />
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Connect Immich in{" "}
            <Link href="/settings" className="underline">
              Settings
            </Link>{" "}
            to start logging Moments.
          </p>
        ))}
    </div>
  );
}
