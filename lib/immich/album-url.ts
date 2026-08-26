const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALBUM_URL_RE = /\/albums\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/**
 * DECISIONS.md ADR-097. Immich's Settings connection form (ADR-096) asks for a bare album id
 * — but per-plant album entry happens far more often (one per Grow plant, ongoing) and the
 * thing Geoff actually has on hand each time is the album's share URL, not its id in
 * isolation. Accepts either: a bare UUID, or a full share URL like
 * `http://host:2283/albums/<uuid>` (with or without a trailing path/query). Returns null for
 * anything that's neither — the caller decides how to surface that as a validation error.
 */
export function parseImmichAlbumId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (UUID_RE.test(trimmed)) return trimmed.toLowerCase();
  const match = trimmed.match(ALBUM_URL_RE);
  return match ? match[1].toLowerCase() : null;
}
