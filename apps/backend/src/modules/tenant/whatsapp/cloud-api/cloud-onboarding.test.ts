import { describe, expect, test } from "bun:test";
import {
  consumeCloudOnboardingState,
  createCloudOnboardingState,
  verifyCloudOnboardingState,
  CloudOnboardingStateError,
} from "./cloud-onboarding";

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";
const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";
const SECRET = "local-test-secret-that-is-long-enough-32";
const now = () => Date.UTC(2026, 7, 21, 12, 0, 0);

const create = () =>
  createCloudOnboardingState({
    organizationId: ORGANIZATION_ID,
    userId: USER_ID,
    secret: SECRET,
    now,
    nonce: () => "a".repeat(32),
  });

describe("Cloud Embedded Signup onboarding state", () => {
  test("creates and verifies an Organization/user-bound state", () => {
    const state = create();
    const claims = verifyCloudOnboardingState({
      token: state.token,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      now,
    });

    expect(claims.organizationId).toBe(ORGANIZATION_ID);
    expect(claims.userId).toBe(USER_ID);
    expect(claims.nonce).toBe("a".repeat(32));
    expect(state.expiresAt).toBe("2026-08-21T12:10:00.000Z");
  });

  test("rejects tampering and a different signing secret", () => {
    const state = create();
    const [payload, signature] = state.token.split(".");
    expect(() =>
      verifyCloudOnboardingState({
        token: `${payload}x.${signature}`,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
      }),
    ).toThrow(CloudOnboardingStateError);
    expect(() =>
      verifyCloudOnboardingState({
        token: state.token,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: `${SECRET}-other`,
        now,
      }),
    ).toThrow("signature is invalid");
  });

  test("rejects expiry and audience mismatch", () => {
    const state = create();
    expect(() =>
      verifyCloudOnboardingState({
        token: state.token,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now: () => now() + 10 * 60 * 1_000,
      }),
    ).toThrow("has expired");
    expect(() =>
      verifyCloudOnboardingState({
        token: state.token,
        organizationId: "651d3470-af47-47c6-9153-8f00ac45b12f",
        userId: USER_ID,
        secret: SECRET,
        now,
      }),
    ).toThrow("does not belong to this user");
  });

  test("rejects weak configuration and excessive lifetime", () => {
    expect(() =>
      createCloudOnboardingState({
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: "short",
        now,
      }),
    ).toThrow("not configured");
    expect(() =>
      createCloudOnboardingState({
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        ttlMs: 15 * 60 * 1_000 + 1,
        now,
      }),
    ).toThrow("TTL is invalid");
  });

  test("delegates one-time replay protection to an atomic persistence seam", async () => {
    const state = create();
    const consumed = new Set<string>();
    const replayStore = {
      consume: (nonce: string) => {
        if (consumed.has(nonce)) return false;
        consumed.add(nonce);
        return true;
      },
    };
    await expect(
      consumeCloudOnboardingState(
        {
          token: state.token,
          organizationId: ORGANIZATION_ID,
          userId: USER_ID,
          secret: SECRET,
          now,
        },
        replayStore,
      ),
    ).resolves.toMatchObject({ nonce: "a".repeat(32) });
    await expect(
      consumeCloudOnboardingState(
        {
          token: state.token,
          organizationId: ORGANIZATION_ID,
          userId: USER_ID,
          secret: SECRET,
          now,
        },
        replayStore,
      ),
    ).rejects.toThrow("already been used");
  });
});
