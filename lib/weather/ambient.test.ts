import { describe, expect, it } from "vitest";
import { ambientMoodFromConditions } from "./ambient";

describe("ambientMoodFromConditions", () => {
  it("maps wet conditions to 'rain'", () => {
    expect(ambientMoodFromConditions("Rain")).toBe("rain");
    expect(ambientMoodFromConditions("Drizzle")).toBe("rain");
    expect(ambientMoodFromConditions("Thunderstorm")).toBe("rain");
  });

  it("maps overcast/low-visibility conditions to 'clouds'", () => {
    expect(ambientMoodFromConditions("Clouds")).toBe("clouds");
    expect(ambientMoodFromConditions("Mist")).toBe("clouds");
    expect(ambientMoodFromConditions("Fog")).toBe("clouds");
  });

  it("maps snow to its own 'snow' mood", () => {
    expect(ambientMoodFromConditions("Snow")).toBe("snow");
  });

  it("returns null (no ambient decoration) for clear skies", () => {
    expect(ambientMoodFromConditions("Clear")).toBeNull();
  });

  it("returns null for no weather connection or unmapped conditions", () => {
    expect(ambientMoodFromConditions(null)).toBeNull();
    expect(ambientMoodFromConditions(undefined)).toBeNull();
    expect(ambientMoodFromConditions("Tornado")).toBeNull();
  });
});
