import { describe, expect, test } from "bun:test";
import {
  assertGoogleContactsCredentialPayload,
  GoogleContactsCredentialError,
  isGoogleContactsCredentialBinding,
  normalizeGoogleContactsCredentialBinding,
  parseGoogleContactsCredentialPayload,
  serializeGoogleContactsCredentialPayload,
} from "./google-contacts.credentials";
import {
  decryptGoogleContactsCredentialPayload,
  encryptGoogleContactsCredentialPayload,
} from "./google-contacts.database-credentials";

const payload = {
  refreshToken: "  google-refresh-token  ",
  accessToken: "google-access-token",
  expiresAt: Date.UTC(2026, 7, 26, 7, 0, 0),
  tokenType: "Bearer",
  scope: "https://www.googleapis.com/auth/contacts",
};

describe("Google Contacts credential boundary", () => {
  test("normalizes an opaque reference and key version", () => {
    expect(
      normalizeGoogleContactsCredentialBinding({
        reference: "  db-secret:11111111-1111-4111-8111-111111111111  ",
        keyVersion: "  v1  ",
      }),
    ).toEqual({
      reference: "db-secret:11111111-1111-4111-8111-111111111111",
      keyVersion: "v1",
    });
  });

  test("rejects values that could corrupt logs or database bindings", () => {
    expect(() =>
      normalizeGoogleContactsCredentialBinding({
        reference: "secret://account\nforged-log-line",
        keyVersion: "v1",
      }),
    ).toThrow(GoogleContactsCredentialError);
    expect(() =>
      assertGoogleContactsCredentialPayload({
        ...payload,
        refreshToken: "token\nforged-log-line",
      }),
    ).toThrow(GoogleContactsCredentialError);
  });

  test("recognizes only the shape needed by the vault port", () => {
    expect(
      isGoogleContactsCredentialBinding({
        reference: "db-secret:one",
        keyVersion: "v1",
      }),
    ).toBe(true);
    expect(
      isGoogleContactsCredentialBinding({ refreshToken: "must-not-be-a-binding" }),
    ).toBe(false);
  });

  test("encrypts and decrypts credentials without storing plaintext", async () => {
    const key = new Uint8Array(32).fill(7);
    const encrypted = await encryptGoogleContactsCredentialPayload(payload, key);
    const serialized = serializeGoogleContactsCredentialPayload(payload);

    expect(encrypted).not.toContain("google-refresh-token");
    expect(encrypted).not.toContain("google-access-token");
    expect(serialized).toContain("google-refresh-token");
    expect(await decryptGoogleContactsCredentialPayload(encrypted, key)).toEqual({
      refreshToken: "google-refresh-token",
      accessToken: "google-access-token",
      expiresAt: payload.expiresAt,
      tokenType: "Bearer",
      scope: "https://www.googleapis.com/auth/contacts",
    });
  });

  test("rejects tampered ciphertext", async () => {
    const key = new Uint8Array(32).fill(9);
    const encrypted = await encryptGoogleContactsCredentialPayload(
      assertGoogleContactsCredentialPayload(payload),
      key,
    );
    const [iv, ciphertext] = encrypted.split(":");
    if (!iv || !ciphertext) throw new Error("Test encryption format is invalid");
    const tamperedBytes = Buffer.from(ciphertext, "base64");
    tamperedBytes[0] = (tamperedBytes[0] ?? 0) ^ 1;
    const tampered = `${iv}:${tamperedBytes.toString("base64")}`;

    await expect(decryptGoogleContactsCredentialPayload(tampered, key)).rejects.toMatchObject({
      name: "GoogleContactsCredentialError",
      code: "credential_not_found",
    });
  });

  test("does not parse credential JSON that is not a protected payload", () => {
    expect(() => parseGoogleContactsCredentialPayload("not-json")).toThrow(
      GoogleContactsCredentialError,
    );
    expect(() =>
      parseGoogleContactsCredentialPayload(JSON.stringify({ accessToken: "only-access" })),
    ).toThrow(GoogleContactsCredentialError);
  });
});
