import { boolean, date, index, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

export const pets = pgTable(
  "pets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    species: text("species").notNull(),
    breed: text("breed"),
    birthDate: date("birth_date"),
    weight: numeric("weight"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("pets_user_id_idx").on(table.userId)],
);

export type Pet = typeof pets.$inferSelect;
export type NewPet = typeof pets.$inferInsert;

export const PET_EVENT_TYPES = [
  "vet_appointment",
  "medication",
  "vaccination",
  "grooming",
  "weight",
  "feeding",
  "purchase",
  "other",
] as const;
export type PetEventType = (typeof PET_EVENT_TYPES)[number];

export const petEvents = pgTable(
  "pet_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type", { enum: PET_EVENT_TYPES }).notNull(),
    title: text("title").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    provider: text("provider"),
    notes: text("notes"),
    recurrenceRule: jsonb("recurrence_rule").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pet_events_pet_id_idx").on(table.petId),
    index("pet_events_user_id_idx").on(table.userId),
    index("pet_events_scheduled_at_idx").on(table.scheduledAt),
  ],
);

export type PetEvent = typeof petEvents.$inferSelect;
export type NewPetEvent = typeof petEvents.$inferInsert;
