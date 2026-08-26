import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = "test-only-key-do-not-use-in-prod";
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext value", () => {
    const plaintext = "42686bb9de2c17c5183213bb7b9fe8dd";
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-input");
    const b = encryptSecret("same-input");
    expect(a).not.toBe(b);
  });

  it("throws on a tampered ciphertext", () => {
    const encrypted = encryptSecret("sensitive-value");
    const [iv, tag, data] = encrypted.split(".");
    const tampered = [iv, tag, data.slice(0, -2) + "aa"].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws on a malformed value", () => {
    expect(() => decryptSecret("not-a-valid-encoded-secret")).toThrow();
  });
});
