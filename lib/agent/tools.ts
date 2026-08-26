import "server-only";

import { getTodayOverview } from "@/lib/today/service";
import { listTasks, listRoutines } from "@/lib/tasks/service";
import { listLists, getListWithItems } from "@/lib/lists/service";
import { listPets, listPetEvents } from "@/lib/pets/service";
import { nextBirthday } from "@/lib/pets/birthday";
import { listReminders, listAccounts } from "@/lib/finance/service";
import { getCurrentWeather } from "@/lib/weather/service";
import { listEvents as listCalendarEvents } from "@/lib/calendar/service";
import type { ToolParameterSchema } from "./providers/interface";
import type { User } from "@/lib/db/schema";

export type ToolPermissionLevel = "read" | "suggest" | "act";

export type ToolDefinition = {
  name: string;
  description: string;
  domain: string;
  permissionLevel: ToolPermissionLevel;
  parameters: ToolParameterSchema;
  handler: (user: User, args: Record<string, unknown>) => Promise<unknown>;
};

const NO_ARGS: ToolParameterSchema = { type: "object", properties: {}, required: [] };

/**
 * Milestone 7 scope: read-only tools only (permissionLevel "read", auto-allowed per
 * DECISIONS.md ADR-005 / spec §24 Level 1). Write tools ("suggest"/"act") are Milestone 8.
 *
 * Every handler returns a lean, hand-picked shape — never the raw service/DB row. Spec §22
 * ("do not send the entire database to the LLM") applies just as much to a single tool's
 * output as to overall context: raw rows carry internal ids, audit timestamps, and
 * unrelated columns that bloat the prompt for no benefit. This turned out to matter in
 * practice, not just in principle — see DECISIONS.md ADR-035.
 *
 * Several tools also return richer, nested data (e.g. get_lists includes each list's items,
 * get_pets includes upcoming events) rather than mirroring the spec's more granular
 * get_X/get_X_items pairing 1:1 — a 3B local model does more reliable tool orchestration
 * with fewer required round trips.
 */
export const TOOLS: ToolDefinition[] = [
  {
    name: "get_today_overview",
    description:
      "Get the ranked overview of what's relevant right now and today: top-priority items (NOW), " +
      "grouped items for today (TODAY) by domain, list summaries, weather, and health stats. " +
      "Use this for broad questions like 'what's going on today' or 'what should I worry about'.",
    domain: "today",
    permissionLevel: "read",
    parameters: NO_ARGS,
    handler: async (user) => {
      const overview = await getTodayOverview(user);
      return {
        now: overview.now.map(leanRankedItem),
        today: Object.fromEntries(
          Object.entries(overview.today).map(([domain, items]) => [domain, items?.map(leanRankedItem) ?? []]),
        ),
        lists: overview.lists.map((l) => ({ name: l.name, openItemCount: l.openItemCount })),
        weather: overview.weather,
        glanceSummary: overview.glanceSummary,
        latestMeasurement: overview.latestMeasurement,
        pulse: overview.pulse,
        additionalItemsNotShown: overview.overflow,
      };
    },
  },
  {
    name: "get_tasks",
    description: "List all open (not yet completed) one-off tasks, regardless of due date.",
    domain: "tasks",
    permissionLevel: "read",
    parameters: NO_ARGS,
    handler: async (user) => {
      const tasks = await listTasks(user.id);
      return tasks.map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueAt: t.dueAt,
        category: t.category,
      }));
    },
  },
  {
    name: "get_routines",
    description: "List active recurring household routines (e.g. chores, maintenance) and when each is next due.",
    domain: "tasks",
    permissionLevel: "read",
    parameters: NO_ARGS,
    handler: async (user) => {
      const routines = await listRoutines(user.id);
      return routines.map((r) => ({
        name: r.name,
        category: r.category,
        recurrence: r.recurrenceConfig,
        nextDueAt: r.nextDueAt,
        lastCompletedAt: r.lastCompletedAt,
      }));
    },
  },
  {
    name: "get_lists",
    description:
      "Get all of the user's lists (e.g. Groceries, Home Depot) along with every item on each list, " +
      "including which items are already checked off.",
    domain: "lists",
    permissionLevel: "read",
    parameters: NO_ARGS,
    handler: async (user) => {
      const lists = await listLists(user.id);
      return Promise.all(
        lists.map(async (list) => {
          const result = await getListWithItems(user.id, list.id);
          return {
            name: list.name,
            items: (result?.items ?? []).map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              checked: i.checked,
            })),
          };
        }),
      );
    },
  },
  {
    name: "get_pets",
    description:
      "Get all active (not retired) pets, each pet's next birthday, and upcoming (not yet completed) " +
      "events — vet visits, medication, etc.",
    domain: "pets",
    permissionLevel: "read",
    parameters: NO_ARGS,
    handler: async (user) => {
      const pets = await listPets(user.id);
      return Promise.all(
        pets.map(async (pet) => {
          const events = await listPetEvents(user.id, pet.id);
          const birthday = pet.birthDate ? nextBirthday(pet.birthDate, new Date()) : null;
          return {
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            nextBirthday: birthday ? { date: birthday.date, turningAge: birthday.age } : null,
            upcomingEvents: events
              .filter((e) => !e.completedAt)
              .map((e) => ({ type: e.eventType, title: e.title, scheduledAt: e.scheduledAt })),
          };
        }),
      );
    },
  },
  {
    name: "get_financial_reminders",
    description:
      "Get upcoming bill payment reminders and financial accounts, including credit card statement close " +
      "dates (distinct from payment due dates).",
    domain: "money",
    permissionLevel: "read",
    parameters: NO_ARGS,
    handler: async (user) => {
      const [reminders, accounts] = await Promise.all([
        listReminders(user.id, user.timezone),
        listAccounts(user.id, user.timezone),
      ]);
      return {
        reminders: reminders.map((r) => ({
          name: r.name,
          amount: r.amount,
          nextDueAt: r.nextDueAt,
          autopay: r.autopay,
        })),
        accounts: accounts.map((a) => ({
          name: a.name,
          accountType: a.accountType,
          lastFour: a.lastFour,
          nextStatementCloseAt: a.nextStatementCloseAt,
        })),
      };
    },
  },
  {
    name: "get_weather",
    description:
      "Get current weather conditions and same-day forecast for the user's home location, if weather is connected.",
    domain: "weather",
    permissionLevel: "read",
    parameters: NO_ARGS,
    handler: async (user) => {
      const units = user.unitsSystem === "imperial" ? "imperial" : "metric";
      const weather = await getCurrentWeather(user.id, units);
      return weather ?? { connected: false, message: "Weather is not connected yet." };
    },
  },
  {
    name: "get_calendar_events",
    description: "Get upcoming calendar events (from iCloud sync and manually-added events).",
    domain: "calendar",
    permissionLevel: "read",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "How many days ahead to look. Defaults to 14 if not specified.",
        },
      },
      required: [],
    },
    handler: async (user, args) => {
      const days = typeof args.days === "number" && args.days > 0 ? args.days : 14;
      const now = new Date();
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const events = await listCalendarEvents(user.id, { start: now, end }, now);
      return events
        .filter((e) => e.status !== "cancelled")
        .map((e) => ({
          title: e.title,
          startAt: e.startAt,
          endAt: e.endAt,
          allDay: e.allDay,
          location: e.location,
        }));
    },
  },
];

function leanRankedItem(item: { domain: string; title: string; subtitle?: string; dueAt: Date | null }) {
  return { domain: item.domain, title: item.title, subtitle: item.subtitle, dueAt: item.dueAt };
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.name === name);
}
