import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { logActivity } from "@/lib/activity/log";
import { getImmichClientForUser, ImmichNotConnectedError } from "@/lib/immich/service";
import type { GrowStage, TrichomeStatus } from "@/lib/db/schema";

export { ImmichNotConnectedError };

export class PlantAlbumNotSetError extends Error {
  constructor() {
    super("Set an Immich album for this plant first.");
  }
}

/** Active plants only — feeds Today's check reminders. Mirrors lib/pets/service.ts's listPets. */
export async function listPlants(userId: string) {
  return db
    .select()
    .from(schema.growPlants)
    .where(and(eq(schema.growPlants.userId, userId), eq(schema.growPlants.active, true)))
    .orderBy(asc(schema.growPlants.datePlanted));
}

/** Active + harvested/retired — for the /grow page, which shows everyone regardless of stage. */
export async function listAllPlants(userId: string) {
  return db
    .select()
    .from(schema.growPlants)
    .where(eq(schema.growPlants.userId, userId))
    .orderBy(desc(schema.growPlants.active), asc(schema.growPlants.datePlanted));
}

export async function getPlant(userId: string, plantId: string) {
  const [plant] = await db
    .select()
    .from(schema.growPlants)
    .where(and(eq(schema.growPlants.id, plantId), eq(schema.growPlants.userId, userId)))
    .limit(1);
  return plant ?? null;
}

export async function createPlant(
  userId: string,
  input: { strain: string; datePlanted: string; stage?: GrowStage },
) {
  const [plant] = await db
    .insert(schema.growPlants)
    .values({ userId, strain: input.strain, datePlanted: input.datePlanted, stage: input.stage ?? "seedling" })
    .returning();

  await logActivity({
    userId,
    domain: "growing",
    eventType: "plant.created",
    entityType: "grow_plant",
    entityId: plant.id,
    summary: `Started tracking "${plant.strain}"`,
  });

  return plant;
}

export async function updatePlant(
  userId: string,
  plantId: string,
  input: Partial<{
    strain: string;
    stage: GrowStage;
    trichomeStatus: TrichomeStatus | null;
    notes: string | null;
    active: boolean;
    immichAlbumId: string | null;
  }>,
) {
  const [plant] = await db
    .update(schema.growPlants)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(schema.growPlants.id, plantId), eq(schema.growPlants.userId, userId)))
    .returning();
  return plant ?? null;
}

/**
 * The "due to check" action — distinct from a general edit (updatePlant) because it always
 * advances `last_checked_at`, which is what actually clears the Today reminder (ADR-094).
 * Stage/trichome status updates are optional here since a quick check-in might just be
 * "yep, still fine" with nothing to change.
 *
 * Checking a plant into "harvest" stage also retires it (active: false) in the same action —
 * one check-in that says "this grow is done" rather than a separate archive button, since
 * reaching harvest and being done are the same real-world moment. Still reversible via
 * updatePlant's `active: true` (the /grow "Restore" action), same as pets.
 *
 * `immich_album_id` is set via `updatePlant` (its own "Save" button, DECISIONS.md ADR-097),
 * not here — an earlier version bundled it into this same submit, but a check-in button isn't
 * an obvious save affordance for an unrelated config field, which was confusing in practice.
 */
export async function checkInPlant(
  userId: string,
  plantId: string,
  input: { stage?: GrowStage; trichomeStatus?: TrichomeStatus | null; notes?: string | null },
  now: Date = new Date(),
) {
  const [plant] = await db
    .update(schema.growPlants)
    .set({ ...input, active: input.stage === "harvest" ? false : undefined, lastCheckedAt: now, updatedAt: now })
    .where(and(eq(schema.growPlants.id, plantId), eq(schema.growPlants.userId, userId)))
    .returning();
  if (!plant) return null;

  // The history row a plain overwrite of grow_plants.stage/trichome_status/notes used to
  // discard entirely — a check-in noting "Nutrients on 8/24" had no trace left once the next
  // check-in on 8/31 overwrote the same columns. grow_plants' own fields are untouched above
  // (still drive the dropdowns' current values + Today's check-due reminder); this is purely
  // additive.
  await db.insert(schema.growPlantCheckIns).values({
    plantId: plant.id,
    userId,
    stage: input.stage,
    trichomeStatus: input.trichomeStatus,
    notes: input.notes,
    checkedAt: now,
  });

  await logActivity({
    userId,
    domain: "growing",
    eventType: "plant.checked",
    entityType: "grow_plant",
    entityId: plant.id,
    summary: `Checked "${plant.strain}"${input.stage ? ` — now ${input.stage}` : ""}`,
  });

  return plant;
}

/** Check-in history for a plant, most recent first — the record of past check-ins. */
export async function listPlantCheckIns(userId: string, plantId: string) {
  return db
    .select()
    .from(schema.growPlantCheckIns)
    .where(and(eq(schema.growPlantCheckIns.plantId, plantId), eq(schema.growPlantCheckIns.userId, userId)))
    .orderBy(desc(schema.growPlantCheckIns.checkedAt));
}

export async function deletePlant(userId: string, plantId: string) {
  await db.delete(schema.growPlants).where(and(eq(schema.growPlants.id, plantId), eq(schema.growPlants.userId, userId)));
}

export async function listPlantPhotos(userId: string, plantId: string) {
  return db
    .select()
    .from(schema.growPlantPhotos)
    .where(and(eq(schema.growPlantPhotos.plantId, plantId), eq(schema.growPlantPhotos.userId, userId)))
    .orderBy(desc(schema.growPlantPhotos.takenAt));
}

/**
 * DECISIONS.md ADR-097. Uploads through the one shared per-user Immich connection (Settings,
 * same as Moments/ADR-096) but into *this plant's own* album rather than the global Moments
 * album — every plant can have its own Immich folder. Throws PlantAlbumNotSetError if the
 * plant has no `immich_album_id` yet (set via the check-in form), ImmichNotConnectedError if
 * Immich itself isn't connected at all, and null if the plant doesn't exist/isn't the user's
 * — same "let the route decide the status code" shape as every other service function here.
 */
export async function addPlantPhoto(
  userId: string,
  plantId: string,
  input: { file: Blob; filename: string; caption?: string; takenAt?: Date },
) {
  const plant = await getPlant(userId, plantId);
  if (!plant) return null;
  if (!plant.immichAlbumId) throw new PlantAlbumNotSetError();

  const connection = await getImmichClientForUser(userId);
  if (!connection) throw new ImmichNotConnectedError();

  const takenAt = input.takenAt ?? new Date();
  const upload = await connection.client.uploadAsset(input.file, input.filename, takenAt);
  await connection.client.addToAlbum(plant.immichAlbumId, upload.assetId);

  const [photo] = await db
    .insert(schema.growPlantPhotos)
    .values({ plantId, userId, immichAssetId: upload.assetId, caption: input.caption, takenAt })
    .returning();

  await logActivity({
    userId,
    domain: "growing",
    eventType: "plant.photo_added",
    entityType: "grow_plant",
    entityId: plantId,
    summary: `Added a photo of "${plant.strain}"`,
  });

  return photo;
}

export async function deletePlantPhoto(userId: string, plantId: string, photoId: string) {
  await db
    .delete(schema.growPlantPhotos)
    .where(
      and(
        eq(schema.growPlantPhotos.id, photoId),
        eq(schema.growPlantPhotos.plantId, plantId),
        eq(schema.growPlantPhotos.userId, userId),
      ),
    );
}

/** For the thumbnail proxy route — looks up which Immich asset to fetch for a given photo. */
export async function getPlantPhotoAsset(userId: string, plantId: string, photoId: string) {
  const [photo] = await db
    .select()
    .from(schema.growPlantPhotos)
    .where(
      and(
        eq(schema.growPlantPhotos.id, photoId),
        eq(schema.growPlantPhotos.plantId, plantId),
        eq(schema.growPlantPhotos.userId, userId),
      ),
    );
  if (!photo) return null;

  const connection = await getImmichClientForUser(userId);
  if (!connection) throw new ImmichNotConnectedError();

  return { client: connection.client, assetId: photo.immichAssetId };
}
