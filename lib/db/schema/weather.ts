import { boolean, index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

// One row per user: which provider, and the encrypted credential for it.
// Kept separate from weather_locations because the credential is account-level,
// not location-level (see lib/security/crypto.ts for how api_key_encrypted is handled).
export const weatherSettings = pgTable("weather_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("openweathermap"),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WeatherSettings = typeof weatherSettings.$inferSelect;
export type NewWeatherSettings = typeof weatherSettings.$inferInsert;

export const weatherLocations = pgTable(
  "weather_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    postalCode: text("postal_code"),
    latitude: numeric("latitude").notNull(),
    longitude: numeric("longitude").notNull(),
    isPrimary: boolean("is_primary").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("weather_locations_user_id_idx").on(table.userId)],
);

export type WeatherLocation = typeof weatherLocations.$inferSelect;
export type NewWeatherLocation = typeof weatherLocations.$inferInsert;

// Cached provider responses. Never queried live on every page load (spec §12) —
// lib/weather/service.ts only fetches when the freshest snapshot is stale.
export const weatherSnapshots = pgTable(
  "weather_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => weatherLocations.id, { onDelete: "cascade" }),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    temperature: numeric("temperature").notNull(),
    feelsLike: numeric("feels_like"),
    conditions: text("conditions").notNull(),
    highToday: numeric("high_today"),
    lowToday: numeric("low_today"),
    precipitationChance: numeric("precipitation_chance"),
    precipitationAmount: numeric("precipitation_amount"),
    humidity: numeric("humidity"),
    windSpeed: numeric("wind_speed"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("weather_snapshots_location_id_idx").on(table.locationId),
    index("weather_snapshots_observed_at_idx").on(table.observedAt),
  ],
);

export type WeatherSnapshot = typeof weatherSnapshots.$inferSelect;
export type NewWeatherSnapshot = typeof weatherSnapshots.$inferInsert;
