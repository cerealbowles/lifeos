import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";

export async function listLists(userId: string) {
  return db
    .select()
    .from(schema.lists)
    .where(and(eq(schema.lists.userId, userId), eq(schema.lists.archived, false)))
    .orderBy(asc(schema.lists.name));
}

export async function getListWithItems(userId: string, listId: string) {
  const [list] = await db
    .select()
    .from(schema.lists)
    .where(and(eq(schema.lists.id, listId), eq(schema.lists.userId, userId)))
    .limit(1);

  if (!list) return null;

  const items = await db
    .select()
    .from(schema.listItems)
    .where(eq(schema.listItems.listId, listId))
    .orderBy(asc(schema.listItems.checked), asc(schema.listItems.position), asc(schema.listItems.createdAt));

  return { list, items };
}

export async function renameList(userId: string, listId: string, name: string) {
  const [list] = await db
    .update(schema.lists)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(schema.lists.id, listId), eq(schema.lists.userId, userId)))
    .returning();
  if (!list) return null;

  await logActivity({
    userId,
    domain: "lists",
    eventType: "list.renamed",
    entityType: "list",
    entityId: list.id,
    summary: `Renamed list to "${list.name}"`,
  });

  return list;
}

/**
 * Soft delete via the `archived` flag, not a hard `db.delete()`. `list_items.list_id` has
 * `onDelete: cascade` — a real delete would permanently destroy every item ever added to the
 * list along with it. `archived` already existed in the schema for exactly this (see
 * `listLists`'s filter) but nothing wrote to it yet — fixed here rather than left as a
 * footgun once a delete button actually existed in the UI to trigger it (same issue as
 * pets' `active` flag, see lib/pets/service.ts `retirePet`).
 */
export async function archiveList(userId: string, listId: string) {
  const [list] = await db
    .update(schema.lists)
    .set({ archived: true, updatedAt: new Date() })
    .where(and(eq(schema.lists.id, listId), eq(schema.lists.userId, userId)))
    .returning();
  if (!list) return null;

  await logActivity({
    userId,
    domain: "lists",
    eventType: "list.archived",
    entityType: "list",
    entityId: list.id,
    summary: `Removed list "${list.name}"`,
  });

  return list;
}

export async function createList(userId: string, name: string, listType = "general") {
  const [list] = await db.insert(schema.lists).values({ userId, name, listType }).returning();

  await logActivity({
    userId,
    domain: "lists",
    eventType: "list.created",
    entityType: "list",
    entityId: list.id,
    summary: `Created list "${list.name}"`,
  });

  return list;
}

export async function addListItem(
  userId: string,
  listId: string,
  input: { name: string; quantity?: string; unit?: string; notes?: string },
) {
  const [item] = await db
    .insert(schema.listItems)
    .values({ userId, listId, ...input })
    .returning();

  await logActivity({
    userId,
    domain: "lists",
    eventType: "list_item.added",
    entityType: "list_item",
    entityId: item.id,
    summary: `Added "${item.name}" to list`,
  });

  return item;
}

export async function setListItemChecked(userId: string, itemId: string, checked: boolean) {
  const [item] = await db
    .update(schema.listItems)
    .set({ checked, checkedAt: checked ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(schema.listItems.id, itemId), eq(schema.listItems.userId, userId)))
    .returning();

  if (!item) return null;

  await logActivity({
    userId,
    domain: "lists",
    eventType: checked ? "list_item.checked" : "list_item.unchecked",
    entityType: "list_item",
    entityId: item.id,
    summary: `${checked ? "Checked off" : "Unchecked"} "${item.name}"`,
  });

  return item;
}

export async function removeListItem(userId: string, itemId: string) {
  await db.delete(schema.listItems).where(and(eq(schema.listItems.id, itemId), eq(schema.listItems.userId, userId)));
}
