"use client";

import { useEffect, useState } from "react";
import { formatInUserZone } from "@/lib/format";

/**
 * DECISIONS.md ADR-057/058 (Ambient Display) — a wall/tablet display is left running for
 * hours, so the clock has to tick on its own rather than showing a stale server-render
 * timestamp. Ticks every second client-side; everything else on the page (weather, today's
 * items) is refreshed separately and much less often by AutoRefresh, since those don't
 * change second-to-second.
 */
export function LiveClock({ timezone }: { timezone: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return <span>{formatInUserZone(now, timezone, "h:mm a")}</span>;
}
