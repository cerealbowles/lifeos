// Client-facing shapes — mirrors lib/measurements/types.ts's own MeasurementDTO pattern:
// the raw Drizzle-inferred SleepSession/SleepStageSegment types have `Date` fields, which is
// only true server-side; once serialized through NextResponse.json() and parsed by a
// client's apiFetch, timestamps are plain ISO strings. Using the DB type directly in a
// client component (found live via a real type error) mismatches what actually arrives.
export type SleepSessionDTO = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  source: string;
};

export type SleepStageSegmentDTO = {
  id: string;
  sleepSessionId: string;
  stage: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};
