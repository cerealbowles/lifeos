import "server-only";

export class ImmichError extends Error {}
export class InvalidImmichCredentialsError extends ImmichError {
  constructor() {
    super("Immich rejected the API key — check the key and instance URL.");
  }
}
export class ImmichAlbumNotFoundError extends ImmichError {
  constructor(albumId: string) {
    super(`Immich album "${albumId}" was not found — check the album ID.`);
  }
}

export type ImmichUploadResult = { assetId: string; duplicate: boolean };

/**
 * DECISIONS.md ADR-096. Thin wrapper around Immich's REST API — LifeOS stores only
 * `immich_asset_id` references (lib/db/schema/log.ts), never the photo bytes themselves, so
 * this client's job is just: validate credentials, upload a photo, add it to the configured
 * album, and fetch a thumbnail back through our own server (so the API key never reaches the
 * browser — see app/api/moments/[id]/image/route.ts).
 *
 * Written against Immich's current API shape (x-api-key header; POST /api/assets multipart
 * upload; PUT /api/albums/{id}/assets to link; GET /api/assets/{id}/thumbnail for images).
 * Immich's API has changed across versions before — if the user's instance is on an older or
 * newer release and a call here 404s unexpectedly, this is the one file that needs adjusting.
 */
export class ImmichClient {
  constructor(
    private readonly instanceUrl: string,
    private readonly apiKey: string,
  ) {}

  private headers(extra?: Record<string, string>): Record<string, string> {
    return { "x-api-key": this.apiKey, Accept: "application/json", ...extra };
  }

  private url(path: string): string {
    return new URL(path, this.instanceUrl.replace(/\/$/, "") + "/").toString();
  }

  /** Validates the key by calling an authenticated endpoint. Throws on a bad key/URL. */
  async validateCredentials(): Promise<void> {
    const res = await fetch(this.url("/api/users/me"), { headers: this.headers() });
    if (res.status === 401) throw new InvalidImmichCredentialsError();
    if (!res.ok) throw new ImmichError(`Could not reach Immich at ${this.instanceUrl} (status ${res.status}).`);
  }

  /** Confirms the configured album actually exists and is reachable with this key. */
  async validateAlbum(albumId: string): Promise<void> {
    const res = await fetch(this.url(`/api/albums/${albumId}`), { headers: this.headers() });
    if (res.status === 401) throw new InvalidImmichCredentialsError();
    if (res.status === 404) throw new ImmichAlbumNotFoundError(albumId);
    if (!res.ok) throw new ImmichError(`Could not verify the Immich album (status ${res.status}).`);
  }

  /** Uploads a photo and returns its Immich asset id. Does not add it to any album yet. */
  async uploadAsset(file: Blob, filename: string, takenAt: Date): Promise<ImmichUploadResult> {
    const form = new FormData();
    // Immich dedupes uploads per (deviceId, deviceAssetId) — a stable-per-LifeOS deviceId with
    // a random per-upload assetId is enough to avoid accidental de-dupe against unrelated
    // uploads from other tools sharing this Immich instance.
    form.set("deviceAssetId", `lifeos-${crypto.randomUUID()}`);
    form.set("deviceId", "lifeos");
    form.set("fileCreatedAt", takenAt.toISOString());
    form.set("fileModifiedAt", takenAt.toISOString());
    form.set("assetData", file, filename);

    const res = await fetch(this.url("/api/assets"), {
      method: "POST",
      headers: this.headers(),
      body: form,
    });
    if (res.status === 401) throw new InvalidImmichCredentialsError();
    if (!res.ok) throw new ImmichError(`Immich upload failed with status ${res.status}.`);

    const data = (await res.json()) as { id: string; status?: string };
    return { assetId: data.id, duplicate: data.status === "duplicate" };
  }

  /** Links an already-uploaded asset into the configured album. */
  async addToAlbum(albumId: string, assetId: string): Promise<void> {
    const res = await fetch(this.url(`/api/albums/${albumId}/assets`), {
      method: "PUT",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ids: [assetId] }),
    });
    if (res.status === 401) throw new InvalidImmichCredentialsError();
    if (!res.ok) throw new ImmichError(`Could not add the photo to the Immich album (status ${res.status}).`);
  }

  /**
   * Streams a display-quality image back — used by the server-side proxy routes, never called
   * from the browser. `size=preview` (Immich's ~1440px JPEG), not `size=thumbnail` (~250px,
   * heavily compressed) — the latter looked visibly blurry/blocky once displayed at real card
   * size in Moments/Grow photo galleries rather than as an actual small thumbnail. `preview`
   * is still far short of the original asset, so this stays fast without looking garbled.
   */
  async fetchPreview(assetId: string): Promise<Response> {
    const res = await fetch(this.url(`/api/assets/${assetId}/thumbnail?size=preview`), {
      headers: this.headers(),
    });
    if (!res.ok) throw new ImmichError(`Could not fetch image (status ${res.status}).`);
    return res;
  }
}
