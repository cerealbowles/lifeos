import { describe, expect, it } from "vitest";
import { parseImmichAlbumId } from "./album-url";

describe("parseImmichAlbumId", () => {
  it("accepts a bare UUID", () => {
    expect(parseImmichAlbumId("ea79d265-9115-4e2a-8b9a-270012f69f88")).toBe(
      "ea79d265-9115-4e2a-8b9a-270012f69f88",
    );
  });

  it("extracts the id from a full share URL", () => {
    expect(parseImmichAlbumId("http://192.168.1.23:2283/albums/ea79d265-9115-4e2a-8b9a-270012f69f88")).toBe(
      "ea79d265-9115-4e2a-8b9a-270012f69f88",
    );
  });

  it("extracts the id from a share URL with trailing query params", () => {
    expect(
      parseImmichAlbumId("https://photos.example.com/albums/ea79d265-9115-4e2a-8b9a-270012f69f88?key=abc"),
    ).toBe("ea79d265-9115-4e2a-8b9a-270012f69f88");
  });

  it("lowercases a mixed-case id", () => {
    expect(parseImmichAlbumId("EA79D265-9115-4E2A-8B9A-270012F69F88")).toBe(
      "ea79d265-9115-4e2a-8b9a-270012f69f88",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(parseImmichAlbumId("  ea79d265-9115-4e2a-8b9a-270012f69f88  ")).toBe(
      "ea79d265-9115-4e2a-8b9a-270012f69f88",
    );
  });

  it("returns null for empty input", () => {
    expect(parseImmichAlbumId("")).toBeNull();
    expect(parseImmichAlbumId("   ")).toBeNull();
  });

  it("returns null for a URL that isn't an album share link", () => {
    expect(parseImmichAlbumId("http://192.168.1.23:2283/photos/ea79d265-9115-4e2a-8b9a-270012f69f88")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseImmichAlbumId("not a url or an id")).toBeNull();
  });
});
