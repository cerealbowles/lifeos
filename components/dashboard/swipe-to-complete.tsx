"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";

const COMPLETE_THRESHOLD_PX = 88;
/** A drag under this never counts as a swipe at all — lets a tap-to-navigate <Link> through untouched. */
const DRAG_START_PX = 8;

/**
 * DECISIONS.md ADR-100. Wraps a NOW-list row with swipe-right-to-complete — direct product
 * request ("swipe right to mark it complete vs going into the Routine section"). Reveals a
 * green checkmark behind the row as it's dragged right; releasing past
 * `COMPLETE_THRESHOLD_PX` calls `onComplete`. Releasing short of that springs the row back to
 * rest — no accidental completions from a small/undecided drag.
 *
 * Built on raw pointer events (not a gesture library) — this is the one interaction in the
 * app that needs it, and pointer events already unify mouse + touch without an extra
 * dependency. `pointer-events: none` isn't used; instead a drag is only "claimed" once it
 * clears `DRAG_START_PX`, and `onClickCapture` swallows the click that a real drag's pointerup
 * would otherwise still fire — so a genuine tap still reaches the row's own `<Link>`
 * (tap-to-navigate keeps working exactly as before), but a real swipe never also navigates.
 */
export function SwipeToComplete({ onComplete, children }: { onComplete: () => void; children: React.ReactNode }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const didDrag = useRef(false);
  // Mirrors `dragX`, read by handlePointerUp instead of the state value — pointerdown/move/up
  // can all land in the same React batch (same tick, no re-render in between; a fast swipe or
  // — as caught here — a scripted/synthetic event sequence), and a state variable closed over
  // by a handler defined in the same batch can still read the *previous* render's value. A
  // ref sidesteps that: it's updated and read synchronously, independent of when React
  // actually flushes the corresponding state update/re-render.
  const dragXRef = useRef(0);

  function handlePointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    if (!dragging && Math.abs(delta) < DRAG_START_PX) return;

    if (!dragging) {
      setDragging(true);
      didDrag.current = true;
      // Guards a real but rare browser edge case (the pointer isn't/no-longer "active" by
      // the time this fires) rather than any observed failure — capture just makes a fast
      // drag more reliable (keeps receiving move events even if the pointer leaves this
      // element's bounds), it isn't required for the gesture to work at all.
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Not fatal — the drag still tracks via document-level bubbling either way.
      }
    }
    // Rightward only — a left drag (or any negative delta) just holds at rest.
    const next = Math.max(0, delta);
    dragXRef.current = next;
    setDragX(next);
  }

  function handlePointerUp() {
    if (dragXRef.current >= COMPLETE_THRESHOLD_PX) {
      onComplete();
    }
    dragXRef.current = 0;
    setDragX(0);
    setDragging(false);
    startX.current = null;
    // Let the click that follows this pointerup get swallowed once (see onClickCapture
    // below), then clear the flag so a later genuine tap isn't affected.
    window.setTimeout(() => {
      didDrag.current = false;
    }, 0);
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div
        className="absolute inset-0 flex items-center bg-emerald-500 pl-4 text-white transition-opacity"
        style={{ opacity: Math.min(dragX / COMPLETE_THRESHOLD_PX, 1) }}
        aria-hidden="true"
      >
        <Check className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={(e) => {
          if (didDrag.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 200ms ease-out",
          touchAction: "pan-y",
        }}
        className="relative bg-white dark:bg-neutral-900"
      >
        {children}
      </div>
    </div>
  );
}
