import { describe, expect, test } from "bun:test";
import {
  createCloudOnboardingState,
  CloudOnboardingStateError,
} from "./cloud-onboarding";
import { completeCloudOnboardingExchange } from "./cloud-onboarding-exchange";

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";
const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";
const SECRET = "local-test-secret-that-is-long-enough-32";
const now = () => Date.UTC(2026, 7, 21, 12, 0, 0);

const createResult = () => {
  const state = createCloudOnboardingState({
    organizationId: ORGANIZATION_ID,
    userId: USER_ID,
    secret: SECRET,
    now,
    nonce: () => "a".repeat(32),
  });
  return {
    state: state.token,
    code: "authorization-code",
    wabaId: "123456789012345",
    phoneNumberId: "987654321098765",
  };
};

const createReplayStore = (
  consume: (nonce: string, expiresAt: number) => boolean,
) => ({
  consume,
});

describe("Cloud Embedded Signup exchange orchestration", () => {
  test("exchanges first and consumes the state only after a valid token", async () => {
    const calls: string[] = [];
    const consumed: Array<{ nonce: string; expiresAt: number }> = [];

    const result = await completeCloudOnboardingExchange({
      result: createResult(),
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      now,
      exchange: {
        exchange: async (authorizationValue) => {
          calls.push(authorizationValue);
          return "  provider-access-token  ";
        },
      },
      replayStore: createReplayStore((nonce, expiresAt) => {
        consumed.push({ nonce, expiresAt });
        return true;
      }),
    });

    expect(calls).toEqual(["authorization-code"]);
    expect(result.accessToken).toBe("provider-access-token");
    expect(result.claims.organizationId).toBe(ORGANIZATION_ID);
    expect(consumed).toEqual([
      {
        nonce: "a".repeat(32),
        expiresAt: Date.UTC(2026, 7, 21, 12, 10, 0),
      },
    ]);
  });

  test("keeps the state available when the provider exchange fails", async () => {
    let consumeCalls = 0;

    await expect(
      completeCloudOnboardingExchange({
        result: createResult(),
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
        exchange: {
          exchange: async () => {
            throw new Error("provider details must not escape");
          },
        },
        replayStore: createReplayStore(() => {
          consumeCalls += 1;
          return true;
        }),
      }),
    ).rejects.toMatchObject({
      name: "CloudOnboardingExchangeError",
      code: "exchange_failed",
      message: "WhatsApp Cloud authorization exchange failed",
    });
    expect(consumeCalls).toBe(0);
  });

  test("rejects an invalid provider token without consuming state", async () => {
    let consumeCalls = 0;

    await expect(
      completeCloudOnboardingExchange({
        result: createResult(),
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
        exchange: { exchange: async () => "  " },
        replayStore: createReplayStore(() => {
          consumeCalls += 1;
          return true;
        }),
      }),
    ).rejects.toMatchObject({ code: "invalid_provider_token" });
    expect(consumeCalls).toBe(0);
  });

  test("does not call the provider when the callback state is not for the caller", async () => {
    let exchangeCalls = 0;

    await expect(
      completeCloudOnboardingExchange({
        result: createResult(),
        organizationId: "651d3470-af47-47c6-9153-8f00ac45b12f",
        userId: USER_ID,
        secret: SECRET,
        now,
        exchange: {
          exchange: async () => {
            exchangeCalls += 1;
            return "provider-access-token";
          },
        },
        replayStore: createReplayStore(() => true),
      }),
    ).rejects.toThrow(CloudOnboardingStateError);
    expect(exchangeCalls).toBe(0);
  });

  test("surfaces a replay race after a successful exchange without retrying consumption", async () => {
    let exchangeCalls = 0;
    let consumeCalls = 0;

    await expect(
      completeCloudOnboardingExchange({
        result: createResult(),
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
        exchange: {
          exchange: async () => {
            exchangeCalls += 1;
            return "provider-access-token";
          },
        },
        replayStore: createReplayStore(() => {
          consumeCalls += 1;
          return false;
        }),
      }),
    ).rejects.toThrow("already been used");
    expect(exchangeCalls).toBe(1);
    expect(consumeCalls).toBe(1);
  });
});
