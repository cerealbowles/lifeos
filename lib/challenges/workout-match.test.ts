import { describe, expect, it } from "vitest";
import { isWorkoutHabit, requiresOutdoorWorkout } from "./workout-match";

describe("isWorkoutHabit", () => {
  it("matches the 75 Hard preset's workout habit titles", () => {
    expect(isWorkoutHabit("Workout 1 (45 min)")).toBe(true);
    expect(isWorkoutHabit("Workout 2 (45 min, outdoors)")).toBe(true);
  });

  it("does not match unrelated habits", () => {
    expect(isWorkoutHabit("Drink a gallon of water")).toBe(false);
    expect(isWorkoutHabit("Read 10 pages (non-fiction)")).toBe(false);
  });
});

describe("requiresOutdoorWorkout", () => {
  it("requires outdoor only when the title says so", () => {
    expect(requiresOutdoorWorkout("Workout 2 (45 min, outdoors)")).toBe(true);
    expect(requiresOutdoorWorkout("Workout 1 (45 min)")).toBe(false);
  });
});
