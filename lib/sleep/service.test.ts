import { describe, expect, it } from "vitest";
import { continuesSession } from "./service";

describe("continuesSession", () => {
  it("has nothing to continue when there is no open session", () => {
    const segment = { startedAt: new Date("2026-08-17T00:00:00Z"), endedAt: new Date("2026-08-17T00:10:00Z") };
    expect(continuesSession(segment, null, null)).toBe(false);
  });

  it("continues a session when the segment starts within the gap threshold and total span stays sane", () => {
    const sessionStart = new Date("2026-08-17T00:00:00Z");
    const sessionEnd = new Date("2026-08-17T02:00:00Z");
    const segment = { startedAt: new Date("2026-08-17T02:30:00Z"), endedAt: new Date("2026-08-17T03:00:00Z") };
    expect(continuesSession(segment, sessionStart, sessionEnd)).toBe(true);
  });

  it("starts a new session once the gap since the last segment exceeds 60 minutes", () => {
    const sessionStart = new Date("2026-08-17T00:00:00Z");
    const sessionEnd = new Date("2026-08-17T02:00:00Z");
    const segment = { startedAt: new Date("2026-08-17T03:01:00Z"), endedAt: new Date("2026-08-17T03:30:00Z") };
    expect(continuesSession(segment, sessionStart, sessionEnd)).toBe(false);
  });

  /**
   * The 54h bug: a stuck/backlog-drained stage segment can be perfectly contiguous
   * (gap == 0) with the currently open session and still be garbage. This is the case that
   * would previously have silently merged into one multi-day session and rendered as
   * "asleep for 54 hours."
   */
  it("refuses to extend a session past MAX_SESSION_DURATION_MS even with zero gap", () => {
    const sessionStart = new Date("2026-08-17T00:00:00Z");
    const sessionEnd = new Date("2026-08-17T00:05:00Z");
    const backlogDrainedSegment = {
      startedAt: sessionEnd,
      endedAt: new Date(sessionStart.getTime() + 54 * 60 * 60 * 1000), // 54h after session start
    };
    expect(continuesSession(backlogDrainedSegment, sessionStart, sessionEnd)).toBe(false);
  });

  it("allows a session right up to the cap and rejects one second past it", () => {
    const sessionStart = new Date("2026-08-17T00:00:00Z");
    const sessionEnd = new Date("2026-08-17T00:05:00Z");
    const atCap = { startedAt: sessionEnd, endedAt: new Date(sessionStart.getTime() + 16 * 60 * 60 * 1000) };
    const overCap = { startedAt: sessionEnd, endedAt: new Date(sessionStart.getTime() + 16 * 60 * 60 * 1000 + 1000) };
    expect(continuesSession(atCap, sessionStart, sessionEnd)).toBe(true);
    expect(continuesSession(overCap, sessionStart, sessionEnd)).toBe(false);
  });
});
