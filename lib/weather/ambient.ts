export type AmbientMood = "clouds" | "rain" | "snow" | null;

const RAIN_CONDITIONS = new Set(["Rain", "Drizzle", "Thunderstorm"]);
const SNOW_CONDITIONS = new Set(["Snow"]);
const CLOUDS_CONDITIONS = new Set(["Clouds", "Mist", "Fog", "Haze", "Smoke", "Dust", "Sand", "Ash"]);

/**
 * Maps OpenWeatherMap's `conditions` string (the raw `weather[0].main` category — see
 * lib/weather/provider.ts) to one of four ambient moods for the Today page backdrop
 * (components/dashboard/ambient-weather.tsx). Pure, no DB/secrets — deliberately not
 * "server-only" so it can be unit-tested and, if ever needed, imported client-side, same
 * reasoning as lib/pets/birthday.ts.
 */
export function ambientMoodFromConditions(conditions: string | null | undefined): AmbientMood {
  if (!conditions) return null;
  if (RAIN_CONDITIONS.has(conditions)) return "rain";
  if (SNOW_CONDITIONS.has(conditions)) return "snow";
  if (CLOUDS_CONDITIONS.has(conditions)) return "clouds";
  return null; // "Clear", or anything unmapped — no decoration, the requested "or nothing" state.
}
