import type { ChallengeStatus } from "@/lib/db/schema";

export type ChallengeDTO = {
  id: string;
  name: string;
  startDate: string;
  durationDays: number;
  status: ChallengeStatus;
};

export type ChallengeHabitDTO = {
  id: string;
  title: string;
  position: number;
  /** DECISIONS.md ADR-095 — true when this habit auto-checks from logged workouts instead
   *  of manual toggling (a title-based match, see lib/challenges/workout-match.ts). */
  autoCheck?: boolean;
};

export type ChallengeDetailDTO = {
  challenge: ChallengeDTO;
  habits: ChallengeHabitDTO[];
  dates: string[];
  /** "habitId:date" keys — flattened from a Set server-side, since Sets aren't JSON. */
  completedSet: string[];
  day: number;
  todayDate: string;
};
