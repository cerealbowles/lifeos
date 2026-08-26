import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import { OpenWeatherMapProvider, parseOneCallResponse, type CurrentWeather, type Forecast } from "./provider";
import type { Units } from "./provider";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes — see spec §12/§39

export type WeatherView = {
  locationName: string;
  temperature: number;
  feelsLike: number;
  conditions: string;
  highToday: number;
  lowToday: number;
  precipitationChance: number;
  precipitationAmount: number;
  humidity: number;
  windSpeed: number;
  observedAt: string;
  unit: "F" | "C";
};

export type HourlyView = {
  time: string;
  temperature: number;
  conditions: string;
  precipitationChance: number;
};

export type DailyView = {
  date: string;
  high: number;
  low: number;
  conditions: string;
  precipitationChance: number;
  precipitationAmount: number;
};

export type WeatherOverview = {
  current: WeatherView;
  hourly: HourlyView[];
  daily: DailyView[];
};

function getProvider(apiKeyEncrypted: string) {
  // OpenWeatherMap is the only provider implemented so far; weather_settings.provider
  // is already in the schema for when a second one shows up.
  return new OpenWeatherMapProvider(decryptSecret(apiKeyEncrypted));
}

/**
 * Validates the key/zip combination by actually calling the provider, then persists
 * both. Throws (with a message safe to show the user) if either step fails — the API
 * key itself is never returned to the caller.
 */
export async function connectWeather(userId: string, apiKey: string, postalCode: string) {
  const provider = new OpenWeatherMapProvider(apiKey);
  const geo = await provider.geocode(postalCode);
  // Fail fast on a bad key (or a key without the One Call subscription enabled) before saving.
  await provider.getForecast(geo.latitude, geo.longitude, "imperial");

  const apiKeyEncrypted = encryptSecret(apiKey);

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.weatherSettings)
      .values({ userId, provider: "openweathermap", apiKeyEncrypted })
      .onConflictDoUpdate({
        target: schema.weatherSettings.userId,
        set: { apiKeyEncrypted, updatedAt: new Date() },
      });

    await tx.delete(schema.weatherLocations).where(eq(schema.weatherLocations.userId, userId));
    await tx.insert(schema.weatherLocations).values({
      userId,
      name: geo.name,
      postalCode,
      latitude: geo.latitude.toString(),
      longitude: geo.longitude.toString(),
      isPrimary: true,
    });
  });

  return { locationName: geo.name };
}

export async function getWeatherConnectionStatus(
  userId: string,
): Promise<{ connected: boolean; locationName: string | null }> {
  const [settings] = await db
    .select({ userId: schema.weatherSettings.userId })
    .from(schema.weatherSettings)
    .where(eq(schema.weatherSettings.userId, userId))
    .limit(1);
  if (!settings) return { connected: false, locationName: null };

  const [location] = await db
    .select({ name: schema.weatherLocations.name })
    .from(schema.weatherLocations)
    .where(and(eq(schema.weatherLocations.userId, userId), eq(schema.weatherLocations.isPrimary, true)))
    .limit(1);

  return { connected: true, locationName: location?.name ?? null };
}

function toWeatherView(locationName: string, current: CurrentWeather, units: Units): WeatherView {
  return {
    locationName,
    temperature: Math.round(current.temperature),
    feelsLike: Math.round(current.feelsLike),
    conditions: current.conditions,
    highToday: Math.round(current.highToday),
    lowToday: Math.round(current.lowToday),
    precipitationChance: Math.round(current.precipitationChance),
    precipitationAmount: Math.round(current.precipitationAmount * 100) / 100,
    humidity: Math.round(current.humidity),
    windSpeed: Math.round(current.windSpeed),
    observedAt: current.observedAt.toISOString(),
    unit: units === "imperial" ? "F" : "C",
  };
}

function toOverview(locationName: string, forecast: Forecast, units: Units): WeatherOverview {
  return {
    current: toWeatherView(locationName, forecast.current, units),
    hourly: forecast.hourly.map((h) => ({
      time: h.time.toISOString(),
      temperature: Math.round(h.temperature),
      conditions: h.conditions,
      precipitationChance: h.precipitationChance,
    })),
    daily: forecast.daily.map((d) => ({
      date: d.date.toISOString(),
      high: Math.round(d.high),
      low: Math.round(d.low),
      conditions: d.conditions,
      precipitationChance: d.precipitationChance,
      precipitationAmount: Math.round(d.precipitationAmount * 100) / 100,
    })),
  };
}

/**
 * Shared by getCurrentWeather/getWeatherOverview — one cache-or-fetch path, since both just
 * need different slices of the same underlying Forecast. A fresh cached snapshot's
 * `raw_payload` is the exact One Call 3.0 response, so it's re-parsed rather than re-fetched.
 */
async function getFreshForecast(
  userId: string,
  units: Units,
): Promise<{ locationName: string; forecast: Forecast } | null> {
  const [settings] = await db
    .select()
    .from(schema.weatherSettings)
    .where(eq(schema.weatherSettings.userId, userId))
    .limit(1);
  if (!settings) return null;

  const [location] = await db
    .select()
    .from(schema.weatherLocations)
    .where(and(eq(schema.weatherLocations.userId, userId), eq(schema.weatherLocations.isPrimary, true)))
    .limit(1);
  if (!location) return null;

  const [latestSnapshot] = await db
    .select()
    .from(schema.weatherSnapshots)
    .where(eq(schema.weatherSnapshots.locationId, location.id))
    .orderBy(desc(schema.weatherSnapshots.observedAt))
    .limit(1);

  const isFresh = latestSnapshot && Date.now() - latestSnapshot.observedAt.getTime() < CACHE_TTL_MS;

  const forecast =
    isFresh && latestSnapshot.rawPayload
      ? parseOneCallResponse(latestSnapshot.rawPayload as Parameters<typeof parseOneCallResponse>[0], units)
      : await fetchAndCache(location.id, Number(location.latitude), Number(location.longitude), settings.apiKeyEncrypted, units);

  return { locationName: location.name, forecast };
}

export async function getCurrentWeather(userId: string, units: Units = "imperial"): Promise<WeatherView | null> {
  const result = await getFreshForecast(userId, units);
  return result ? toWeatherView(result.locationName, result.forecast.current, units) : null;
}

export async function getWeatherOverview(userId: string, units: Units = "imperial"): Promise<WeatherOverview | null> {
  const result = await getFreshForecast(userId, units);
  return result ? toOverview(result.locationName, result.forecast, units) : null;
}

/**
 * DECISIONS.md ADR-088 — called by the background worker (scripts/worker.ts), not by any
 * page load. Every other domain's bulk-refresh function can filter stale rows with a plain
 * `WHERE last_synced_at < ...`; weather has no such column (see weatherLocations/
 * weatherSettings) — staleness has always been derived from the most recent
 * weather_snapshots row per location, so this does that same per-location lookup, just for
 * every primary location across every user instead of one user's on a page request.
 */
export async function refreshAllDueWeatherLocations(now: Date = new Date()): Promise<{ refreshed: number; failed: number }> {
  const rows = await db
    .select({
      locationId: schema.weatherLocations.id,
      latitude: schema.weatherLocations.latitude,
      longitude: schema.weatherLocations.longitude,
      apiKeyEncrypted: schema.weatherSettings.apiKeyEncrypted,
      unitsSystem: schema.users.unitsSystem,
    })
    .from(schema.weatherLocations)
    .innerJoin(schema.weatherSettings, eq(schema.weatherSettings.userId, schema.weatherLocations.userId))
    .innerJoin(schema.users, eq(schema.users.id, schema.weatherLocations.userId))
    .where(eq(schema.weatherLocations.isPrimary, true));

  let refreshed = 0;
  let failed = 0;

  for (const row of rows) {
    const [latestSnapshot] = await db
      .select({ observedAt: schema.weatherSnapshots.observedAt })
      .from(schema.weatherSnapshots)
      .where(eq(schema.weatherSnapshots.locationId, row.locationId))
      .orderBy(desc(schema.weatherSnapshots.observedAt))
      .limit(1);

    const isFresh = latestSnapshot && now.getTime() - latestSnapshot.observedAt.getTime() < CACHE_TTL_MS;
    if (isFresh) continue;

    try {
      await fetchAndCache(
        row.locationId,
        Number(row.latitude),
        Number(row.longitude),
        row.apiKeyEncrypted,
        row.unitsSystem === "metric" ? "metric" : "imperial",
      );
      refreshed++;
    } catch {
      // One user's bad/expired API key shouldn't stop everyone else's weather from
      // refreshing — same "isolate per-item failures" instinct as sports/feed's
      // Promise.allSettled-style per-account error handling.
      failed++;
    }
  }

  return { refreshed, failed };
}

async function fetchAndCache(
  locationId: string,
  latitude: number,
  longitude: number,
  apiKeyEncrypted: string,
  units: Units,
): Promise<Forecast> {
  const provider = getProvider(apiKeyEncrypted);
  const forecast = await provider.getForecast(latitude, longitude, units);
  const { current } = forecast;

  await db.insert(schema.weatherSnapshots).values({
    locationId,
    observedAt: current.observedAt,
    temperature: current.temperature.toString(),
    feelsLike: current.feelsLike.toString(),
    conditions: current.conditions,
    highToday: current.highToday.toString(),
    lowToday: current.lowToday.toString(),
    precipitationChance: current.precipitationChance.toString(),
    precipitationAmount: current.precipitationAmount.toString(),
    humidity: current.humidity.toString(),
    windSpeed: current.windSpeed.toString(),
    rawPayload: forecast.raw as Record<string, unknown>,
  });

  return forecast;
}
