import "dotenv/config";
import { addDays, nextFriday, subDays } from "date-fns";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { computeNextOccurrence } from "@/lib/tasks/recurrence";

const SEED_EMAIL = "alex@example.com";
const SEED_PASSWORD = "lifeos-dev";
const TIMEZONE = "America/Chicago";

async function main() {
  const now = new Date();

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, SEED_EMAIL)).limit(1);
  if (existing) {
    console.log(`Removing existing seed user (${SEED_EMAIL}) to reseed cleanly…`);
    await db.delete(schema.users).where(eq(schema.users.id, existing.id)); // cascades to owned rows
  }

  const [user] = await db
    .insert(schema.users)
    .values({
      email: SEED_EMAIL,
      passwordHash: await hashPassword(SEED_PASSWORD),
      displayName: "Alex",
      timezone: TIMEZONE,
      unitsSystem: "imperial",
    })
    .returning();

  // --- Tasks (one-off) ---
  await db.insert(schema.tasks).values([
    {
      userId: user.id,
      title: "Replace refrigerator water filter",
      status: "todo",
      dueAt: addDays(now, 2),
      category: "Maintenance",
    },
    {
      userId: user.id,
      title: "Clean upstairs bathroom",
      status: "todo",
      dueAt: subDays(now, 2), // overdue, to exercise the overdue path
      category: "Cleaning",
    },
  ]);

  // --- Routines ---
  const hvacConfig = { type: "interval" as const, days: 90 };
  const plantsConfig = { type: "interval" as const, days: 7 };

  await db.insert(schema.routines).values([
    {
      userId: user.id,
      name: "Change HVAC filter",
      category: "Maintenance",
      recurrenceType: "interval",
      recurrenceConfig: hvacConfig,
      lastCompletedAt: subDays(now, 35),
      nextDueAt: computeNextOccurrence(hvacConfig, subDays(now, 35), TIMEZONE),
    },
    {
      userId: user.id,
      name: "Water indoor plants",
      category: "Garden",
      recurrenceType: "interval",
      recurrenceConfig: plantsConfig,
      lastCompletedAt: subDays(now, 6),
      nextDueAt: computeNextOccurrence(plantsConfig, subDays(now, 6), TIMEZONE),
    },
  ]);

  // --- Lists ---
  const [groceries] = await db
    .insert(schema.lists)
    .values({ userId: user.id, name: "Groceries", listType: "shopping" })
    .returning();
  await db.insert(schema.listItems).values(
    ["milk", "eggs", "chicken", "paper towels"].map((name) => ({
      userId: user.id,
      listId: groceries.id,
      name,
    })),
  );

  const [homeDepot] = await db
    .insert(schema.lists)
    .values({ userId: user.id, name: "Home Depot", listType: "shopping" })
    .returning();
  await db.insert(schema.listItems).values(
    ["fertilizer", "furnace filters"].map((name) => ({
      userId: user.id,
      listId: homeDepot.id,
      name,
    })),
  );

  // --- Pets ---
  const [milo] = await db
    .insert(schema.pets)
    .values({ userId: user.id, name: "Milo", species: "dog" })
    .returning();
  const [luna] = await db
    .insert(schema.pets)
    .values({ userId: user.id, name: "Luna", species: "cat" })
    .returning();

  await db.insert(schema.petEvents).values([
    {
      userId: user.id,
      petId: milo.id,
      eventType: "medication",
      title: "Heartworm medication",
      scheduledAt: nextFriday(now),
    },
    {
      userId: user.id,
      petId: luna.id,
      eventType: "vet_appointment",
      title: "Vet appointment",
      scheduledAt: addDays(now, 23),
    },
  ]);

  // --- Finances ---
  const [chase] = await db
    .insert(schema.financialAccounts)
    .values({
      userId: user.id,
      name: "Chase Sapphire",
      accountType: "credit_card",
      statementCloseDay: 10,
      nextStatementCloseAt: computeNextOccurrence({ type: "monthly_day", day: 10 }, now, TIMEZONE),
    })
    .returning();
  const [amex] = await db
    .insert(schema.financialAccounts)
    .values({ userId: user.id, name: "Amex", accountType: "credit_card" })
    .returning();

  await db.insert(schema.financialReminders).values([
    {
      userId: user.id,
      financialAccountId: chase.id,
      name: "Chase Sapphire",
      dueRule: { type: "monthly_day", day: 18 },
      nextDueAt: computeNextOccurrence({ type: "monthly_day", day: 18 }, now, TIMEZONE),
      autopay: true,
    },
    {
      userId: user.id,
      financialAccountId: amex.id,
      name: "Amex",
      dueRule: { type: "monthly_day", day: 24 },
      nextDueAt: computeNextOccurrence({ type: "monthly_day", day: 24 }, now, TIMEZONE),
      autopay: false,
    },
  ]);

  // --- Measurements ---
  await db.insert(schema.measurements).values({
    userId: user.id,
    type: "weight",
    value: "184.2",
    unit: "lb",
    measuredAt: subDays(now, 1),
  });

  console.log("Seed complete.");
  console.log(`  Login: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
