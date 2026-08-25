import { describe, expect, test } from "bun:test";
import { createGoogleContactsOAuthState } from "./google-contacts.oauth-state";
import { completeGoogleContactsOAuthExchange } from "./google-contacts.oauth-exchange";
import { GOOGLE_CONTACTS_WRITE_SCOPE, GoogleContactsOAuthError } from "./google-contacts.oauth";

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";
const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";
const SECRET = "local-test-secret-that-is-long-enough-32";
const now = () => Date.UTC(2026, 7, 26, 6, 0, 0);

const createResult = () => {
  const state = createGoogleContactsOAuthState({
    organizationId: ORGANIZATION_ID,
    userId: USER_ID,
    secret: SECRET,
    now,
    nonce: () => "a".repeat(32),
  });
  return {
    state: state.token,
    code: "authorization-code",
  };
};

describe("Google Contacts OAuth exchange orchestration", () => {
  test("exchanges first and consumes the state only after a valid token and identity", async () => {
    const calls: string[] = [];
    const consumed: Array<{ nonce: string; expiresAt: number }> = [];

    const result = await completeGoogleContactsOAuthExchange({
      result: createResult(),
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      now,
      oauth: {
        exchangeAuthorizationCode: async (code) => {
          calls.push(code);
          return {
            accessToken: "access-token",
            refreshToken: "refresh-token",
            expiresAt: Date.UTC(2026, 7, 26, 7, 0, 0),
            tokenType: "Bearer",
            scope: GOOGLE_CONTACTS_WRITE_SCOPE,
          };
        },
        getAccountIdentity: async () => ({
          subject: "google-subject-1",
          email: "owner@example.com",
        }),
      },
      replayStore: {
        consume: (nonce, expiresAt) => {
          consumed.push({ nonce, expiresAt });
          return true;
        },
      },
    });

    expect(calls).toEqual(["authorization-code"]);
    expect(result.credentials.refreshToken).toBe("refresh-token");
    expect(result.identity.email).toBe("owner@example.com");
    expect(consumed).toEqual([
      {
        nonce: "a".repeat(32),
        expiresAt: Date.UTC(2026, 7, 26, 6, 10, 0),
      },
    ]);
  });

  test("keeps the state available when the provider exchange fails", async () => {
    let consumeCalls = 0;

    await expect(
      completeGoogleContactsOAuthExchange({
        result: createResult(),
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
        oauth: {
          exchangeAuthorizationCode: async () => {
            throw new Error("provider details must not escape");
          },
          getAccountIdentity: async () => ({
            subject: "google-subject-1",
            email: "owner@example.com",
          }),
        },
        replayStore: {
          consume: () => {
            consumeCalls += 1;
            return true;
          },
        },
      }),
    ).rejects.toMatchObject({
      name: "GoogleContactsOAuthError",
      code: "exchange_failed",
      message: "Google Contacts authorization exchange failed",
    });
    expect(consumeCalls).toBe(0);
  });

  test("does not call Google when the callback state is not for the caller", async () => {
    let exchangeCalls = 0;

    await expect(
      completeGoogleContactsOAuthExchange({
        result: createResult(),
        organizationId: "651d3470-af47-47c6-9153-8f00ac45b12f",
        userId: USER_ID,
        secret: SECRET,
        now,
        oauth: {
          exchangeAuthorizationCode: async () => {
            exchangeCalls += 1;
            return {
              accessToken: "access-token",
              refreshToken: "refresh-token",
              expiresAt: Date.UTC(2026, 7, 26, 7, 0, 0),
              tokenType: "Bearer",
              scope: GOOGLE_CONTACTS_WRITE_SCOPE,
            };
          },
          getAccountIdentity: async () => ({
            subject: "google-subject-1",
            email: "owner@example.com",
          }),
        },
        replayStore: { consume: () => true },
      }),
    ).rejects.toThrow("does not belong to this user");
    expect(exchangeCalls).toBe(0);
  });

  test("consumes denied consent without exchanging a code", async () => {
    const state = createGoogleContactsOAuthState({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      now,
      nonce: () => "a".repeat(32),
    });
    let exchangeCalls = 0;
    let consumeCalls = 0;

    await expect(
      completeGoogleContactsOAuthExchange({
        result: { state: state.token, error: "access_denied" },
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
        oauth: {
          exchangeAuthorizationCode: async () => {
            exchangeCalls += 1;
            throw new Error("should not exchange");
          },
          getAccountIdentity: async () => ({
            subject: "google-subject-1",
            email: "owner@example.com",
          }),
        },
        replayStore: {
          consume: () => {
            consumeCalls += 1;
            return true;
          },
        },
      }),
    ).rejects.toBeInstanceOf(GoogleContactsOAuthError);
    expect(exchangeCalls).toBe(0);
    expect(consumeCalls).toBe(1);
  });
});
