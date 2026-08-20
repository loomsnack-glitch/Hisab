import { describe, expect, test } from "bun:test";
import { hashCloudOnboardingNonce } from "./cloud-onboarding.repository";

describe("Cloud onboarding persistence helpers", () => {
  test("stores a deterministic SHA-256 hex digest rather than the raw nonce", () => {
    const nonce = "nonce-that-must-not-be-stored";
    const hash = hashCloudOnboardingNonce(nonce);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(hash).not.toContain(nonce);
    expect(hashCloudOnboardingNonce(nonce)).toBe(hash);
  });
});
