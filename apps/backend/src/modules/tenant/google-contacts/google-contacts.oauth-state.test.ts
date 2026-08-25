import { describe, expect, test } from "bun:test";
import {
  consumeGoogleContactsOAuthState,
  createGoogleContactsOAuthState,
  verifyGoogleContactsOAuthState,
  GoogleContactsOAuthStateError,
} from "./google-contacts.oauth-state";

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";
const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";
const SECRET = "local-test-secret-that-is-long-enough-32";
const now = () => Date.UTC(2026, 7, 26, 6, 0, 0);

const create = () =>
  createGoogleContactsOAuthState({
    organizationId: ORGANIZATION_ID,
    userId: USER_ID,
    secret: SECRET,
    now,
    nonce: () => "a".repeat(32),
  });

describe("Google Contacts OAuth state", () => {
  test("creates and verifies an Organization/user-bound state", () => {
    const state = create();
    const claims = verifyGoogleContactsOAuthState({
      token: state.token,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      now,
    });

    expect(claims.organizationId).toBe(ORGANIZATION_ID);
    expect(claims.userId).toBe(USER_ID);
    expect(claims.nonce).toBe("a".repeat(32));
    expect(state.expiresAt).toBe("2026-08-26T06:10:00.000Z");
  });

  test("rejects tampering and a different signing secret", () => {
    const state = create();
    const [payload, signature] = state.token.split(".");
    expect(() =>
      verifyGoogleContactsOAuthState({
        token: `${payload}x.${signature}`,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
      }),
    ).toThrow(GoogleContactsOAuthStateError);
    expect(() =>
      verifyGoogleContactsOAuthState({
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
      verifyGoogleContactsOAuthState({
        token: state.token,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now: () => now() + 10 * 60 * 1_000,
      }),
    ).toThrow("has expired");
    expect(() =>
      verifyGoogleContactsOAuthState({
        token: state.token,
        organizationId: "651d3470-af47-47c6-9153-8f00ac45b12f",
        userId: USER_ID,
        secret: SECRET,
        now,
      }),
    ).toThrow("does not belong to this user");
  });

  test("consumes a nonce once and rejects replay", async () => {
    const state = create();
    const seen = new Set<string>();
    const replayStore = {
      consume: (nonce: string) => {
        if (seen.has(nonce)) return false;
        seen.add(nonce);
        return true;
      },
    };

    await consumeGoogleContactsOAuthState(
      {
        token: state.token,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
      },
      replayStore,
    );
    await expect(
      consumeGoogleContactsOAuthState(
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

  test("rejects a weak signing secret without creating a usable token", () => {
    expect(() =>
      createGoogleContactsOAuthState({
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: "too-short",
        now,
      }),
    ).toThrow("not configured");
  });
});
