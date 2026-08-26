// Pure, no DB — deliberately not "server-only", same reasoning as lib/challenges/day.ts.

/**
 * DECISIONS.md ADR-095. A lightweight title-matching heuristic, not a schema field or a
 * habit-linking UI — the planning doc's "75 Hard integration: Challenges reads from the
 * workouts table to auto-check the day's workout requirement(s) instead of manual toggling"
 * only needs to work for the actual 75 Hard preset's habit titles ("Workout 1 (45 min)",
 * "Workout 2 (45 min, outdoors)" — see components/challenges/new-challenge-form.tsx), and a
 * substring match on the habit's own title is enough for that without building a general
 * "link any habit to any data source" system nobody asked for. Revisit with a real field if
 * a challenge ever needs a habit titled "workout" that *shouldn't* auto-check.
 */
export function isWorkoutHabit(title: string): boolean {
  return /workout/i.test(title);
}

export function requiresOutdoorWorkout(title: string): boolean {
  return /outdoor/i.test(title);
}
