import type { RankedItem } from "@/lib/today/ranking";

/**
 * DECISIONS.md ADR-100. Which domains have a real, existing one-tap "complete" endpoint —
 * financial (no mark-paid action exists), calendar (an appointment isn't "completable" the
 * same way a task is), and sports (informational only) are deliberately excluded, not an
 * oversight. A pet-domain "birthday" is excluded too (computed occurrence, no underlying
 * pet_events row — see RankedItem.eventType).
 *
 * Shared between `NowList` (swipe-to-complete) and `TodayGroupCard` (checkbox-complete) — same
 * completable set, two different trigger gestures for the identical underlying action.
 */
export function getCompleteRequest(item: RankedItem): { url: string; init: RequestInit } | null {
  switch (item.domain) {
    case "task":
      return { url: `/api/tasks/${item.id}`, init: { method: "PATCH", body: JSON.stringify({ status: "done" }) } };
    case "routine":
      return { url: `/api/routines/${item.id}/complete`, init: { method: "POST" } };
    case "pet":
      if (item.eventType === "birthday") return null;
      // The [id] segment here is the pet id, but completePetEvent (lib/pets/service.ts)
      // scopes purely by (eventId, userId) — the route never actually reads it.
      return {
        url: `/api/pets/_/events/${item.id}`,
        init: { method: "PATCH", body: JSON.stringify({ completed: true }) },
      };
    case "grow":
      // Empty body — a swipe/check is the "yep, still fine" quick check-in
      // (lib/growing/service.ts already treats a check-in with nothing changed as valid).
      return { url: `/api/grow/${item.id}/check-in`, init: { method: "POST", body: JSON.stringify({}) } };
    case "financial":
    case "calendar":
    case "sports":
      return null;
  }
}
