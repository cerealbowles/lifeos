import { boolean, date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const GROW_STAGES = ["seedling", "veg", "flower", "flush", "harvest"] as const;
export type GrowStage = (typeof GROW_STAGES)[number];

export const TRICHOME_STATUSES = ["clear", "cloudy", "amber"] as const;
export type TrichomeStatus = (typeof TRICHOME_STATUSES)[number];

/**
 * DECISIONS.md ADR-094. Not a Postgres enum for either `stage` or `trichome_status` — plain
 * text columns validated at the API boundary, same open-ended reasoning as
 * `tasks.category`/`activity_sessions.activity_type`.
 */
export const growPlants = pgTable(
  "grow_plants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    strain: text("strain").notNull(),
    stage: text("stage", { enum: GROW_STAGES }).notNull().default("seedling"),
    datePlanted: date("date_planted").notNull(),
    // Only meaningful once flowering — null until then. Drives harvest timing, per the
    // planning doc, so it's the one field a check-in most often exists to update.
    trichomeStatus: text("trichome_status", { enum: TRICHOME_STATUSES }),
    // Source of truth for "is a check due" (lib/growing/day.ts's nextCheckDue) — null means
    // never checked since planting, so the first check is due immediately.
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    notes: text("notes"),
    // Soft "retired" flag, same reasoning as pets.active (DECISIONS.md ADR-081/082) — a
    // harvested plant's grow history has real value to look back on, so this isn't a hard
    // delete. listPlants() (active only, feeds Today's check reminders) vs. listAllPlants()
    // (everyone, for the /grow page) mirrors lib/pets/service.ts exactly.
    active: boolean("active").notNull().default(true),
    // DECISIONS.md ADR-097. Nullable — a plant this photo log has nothing to do with (an
    // Immich album this specific plant's photos get uploaded/linked into), separate from the
    // global "Moments" album used by lib/moments (ADR-096). One Immich instance connection
    // (Settings, lib/db/schema/immich.ts) is shared across every plant; only the destination
    // album differs per plant. Set via lib/immich/album-url.ts's parseImmichAlbumId, which
    // accepts either a bare album id or a pasted share URL.
    immichAlbumId: text("immich_album_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("grow_plants_user_id_idx").on(table.userId)],
);

export type GrowPlant = typeof growPlants.$inferSelect;
export type NewGrowPlant = typeof growPlants.$inferInsert;

/**
 * DECISIONS.md ADR-097. One row per uploaded photo — stores only the Immich asset reference
 * (never the photo bytes, same reasoning as lib/db/schema/log.ts's log_entries), scoped to a
 * plant. `user_id` is denormalized alongside `plant_id` so every query can filter by user
 * directly without a join, same convention as pet_events (lib/db/schema/pets.ts).
 */
export const growPlantPhotos = pgTable(
  "grow_plant_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plantId: uuid("plant_id")
      .notNull()
      .references(() => growPlants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    immichAssetId: text("immich_asset_id").notNull(),
    caption: text("caption"),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("grow_plant_photos_plant_id_taken_at_idx").on(table.plantId, table.takenAt),
    index("grow_plant_photos_user_id_idx").on(table.userId),
  ],
);

export type GrowPlantPhoto = typeof growPlantPhotos.$inferSelect;
export type NewGrowPlantPhoto = typeof growPlantPhotos.$inferInsert;

/**
 * One row per check-in — the history `checkInPlant` previously discarded by overwriting
 * `grow_plants.notes`/`stage`/`trichome_status` in place on every submit (a user checking in
 * "Nutrients on 8/24" had no way to see that note again once they checked in again on 8/31).
 * `grow_plants`' own stage/trichome_status/notes/last_checked_at columns are unchanged and
 * still drive the dropdowns' current values and Today's check-due reminder (lib/growing/day.ts)
 * — this table is purely additive, an audit trail alongside the current-state fields, same
 * relationship activity_events (lib/db/schema/activity.ts) has to the domain tables it logs.
 */
export const growPlantCheckIns = pgTable(
  "grow_plant_checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plantId: uuid("plant_id")
      .notNull()
      .references(() => growPlants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stage: text("stage", { enum: GROW_STAGES }),
    trichomeStatus: text("trichome_status", { enum: TRICHOME_STATUSES }),
    notes: text("notes"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("grow_plant_checkins_plant_id_checked_at_idx").on(table.plantId, table.checkedAt),
    index("grow_plant_checkins_user_id_idx").on(table.userId),
  ],
);

export type GrowPlantCheckIn = typeof growPlantCheckIns.$inferSelect;
export type NewGrowPlantCheckIn = typeof growPlantCheckIns.$inferInsert;
