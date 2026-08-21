import { describe, expect, test } from "bun:test";
import {
  assertCloudAccessToken,
  CloudCredentialError,
  isCloudCredentialBinding,
  normalizeCloudCredentialBinding,
} from "./cloud-credentials";

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

});
