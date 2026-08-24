import { describe, expect, test } from "bun:test";
import {
  assertCloudAccessToken,
  CloudCredentialError,
  isCloudCredentialBinding,
  normalizeCloudCredentialBinding,
} from "./cloud-credentials";
import {
  decryptCloudCredentialToken,
  encryptCloudCredentialToken,
} from "./database-cloud-credentials";

describe("WhatsApp Cloud credential boundary", () => {
  test("normalizes an opaque reference and key version", () => {
    expect(
      normalizeCloudCredentialBinding({
        reference: "  secret://hisab/cloud/account-1  ",
        keyVersion: "  kms-2026-08  ",
      }),
    ).toEqual({
      reference: "secret://hisab/cloud/account-1",
      keyVersion: "kms-2026-08",
    });
  });

  test("rejects values that could corrupt logs or database bindings", () => {
    expect(() =>
      normalizeCloudCredentialBinding({
        reference: "secret://account\nforged-log-line",
        keyVersion: "v1",
      }),
    ).toThrow(CloudCredentialError);
    expect(() => assertCloudAccessToken("token\nforged-log-line")).toThrow(
      CloudCredentialError,
    );
  });

  test("recognizes only the shape needed by the vault port", () => {
    expect(
      isCloudCredentialBinding({ reference: "secret://one", keyVersion: "v1" }),
    ).toBe(true);
    expect(isCloudCredentialBinding({ reference: "", keyVersion: "v1" })).toBe(
      false,
    );
    expect(isCloudCredentialBinding({ accessToken: "must-not-be-a-binding" })).toBe(
      false,
    );
  });

  test("encrypts and decrypts tokens without storing plaintext", async () => {
    const key = new Uint8Array(32).fill(7);
    const encrypted = await encryptCloudCredentialToken("  EAAG-test-token  ", key);

    expect(encrypted).not.toContain("EAAG-test-token");
    expect(await decryptCloudCredentialToken(encrypted, key)).toBe("EAAG-test-token");
  });

  test("rejects tampered ciphertext", async () => {
    const key = new Uint8Array(32).fill(9);
    const encrypted = await encryptCloudCredentialToken("EAAG-test-token", key);
    const [iv, ciphertext] = encrypted.split(":");
    if (!iv || !ciphertext) throw new Error("Test encryption format is invalid");
    const tamperedBytes = Buffer.from(ciphertext, "base64");
    tamperedBytes[0] = (tamperedBytes[0] ?? 0) ^ 1;
    const tampered = `${iv}:${tamperedBytes.toString("base64")}`;

    await expect(decryptCloudCredentialToken(tampered, key)).rejects.toMatchObject({
      name: "CloudCredentialError",
      code: "credential_not_found",
    });
  });

});
