"use client";

import { Sheet } from "@/components/ui/sheet";
import { GrowCheckInPanel } from "@/components/grow/grow-checkin-panel";
import { GameDetailPanel } from "@/components/sports/game-detail-panel";
import type { RankedItem } from "@/lib/today/ranking";

/**
 * Which domains open a detail sheet from Home instead of navigating away (ADR-124 "one tap
 * away") — grow (quick check-in) and sports (score/odds/boxscore), the two domains a card tap
 * has no other way to act on or inspect further. Everything else keeps its existing `<Link>`
 * navigation (task/routine/pet/financial/calendar already have their own hub or record pages).
 */
export function itemOpensSheet(item: RankedItem): boolean {
  return item.domain === "grow" || (item.domain === "sports" && item.game !== undefined);
}

export function ItemDetailSheet({
  item,
  onClose,
  onCheckedIn,
}: {
  item: RankedItem | null;
  onClose: () => void;
  onCheckedIn: () => void;
}) {
  return (
    <Sheet open={item !== null} onClose={onClose} title={item?.title}>
      {item?.domain === "grow" && <GrowCheckInPanel plantId={item.id} onCheckedIn={onCheckedIn} />}
      {item?.domain === "sports" && item.game && <GameDetailPanel game={item.game} />}
    </Sheet>
  );
}
