import { describe, expect, test } from "bun:test";
import {
  createCloudOnboardingState,
  CloudOnboardingStateError,
} from "./cloud-onboarding";
import {
  CloudOnboardingResultError,
  parseCloudOnboardingResult,
  verifyCloudOnboardingResult,
} from "./cloud-onboarding-result";

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";
const OTHER_ORGANIZATION_ID = "651d3470-af47-47c6-9153-8f00ac45b12f";
const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";
const OTHER_USER_ID = "8c2f9d29-f29e-4d8e-b9cf-6b5a0c637ccb";
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

describe("Cloud Embedded Signup result intake", () => {
  test("normalizes a valid callback result and verifies its state binding", () => {
    const result = verifyCloudOnboardingResult({
      result: {
        ...createResult(),
        code: "  authorization-code  ",
        wabaId: " 123456789012345 ",
        phoneNumberId: " 987654321098765 ",
      },
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      secret: SECRET,
      now,
    });

    expect(result).toMatchObject({
      code: "authorization-code",
      wabaId: "123456789012345",
      phoneNumberId: "987654321098765",
    });
    expect(result.claims).toMatchObject({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
    });
  });

  test("rejects missing, malformed, oversized, and unknown callback fields", () => {
    const result = createResult();
    const invalidResults: unknown[] = [
      null,
      { ...result, code: "" },
      { ...result, wabaId: "waba-1" },
      { ...result, phoneNumberId: "" },
      { ...result, state: "s".repeat(4_097) },
      { ...result, code: "c".repeat(4_097) },
      { ...result, extra: "must be rejected" },
    ];

    for (const invalidResult of invalidResults) {
      expect(() => parseCloudOnboardingResult(invalidResult)).toThrow(
        CloudOnboardingResultError,
      );
    }
  });

  test("rejects a result whose state belongs to another Organization or user", () => {
    const result = createResult();

    expect(() =>
      verifyCloudOnboardingResult({
        result,
        organizationId: OTHER_ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
      }),
    ).toThrow(CloudOnboardingStateError);
    expect(() =>
      verifyCloudOnboardingResult({
        result,
        organizationId: ORGANIZATION_ID,
        userId: OTHER_USER_ID,
        secret: SECRET,
        now,
      }),
    ).toThrow("does not belong to this user");
  });

  test("does not consume a valid state", () => {
    const result = createResult();

    expect(() =>
      verifyCloudOnboardingResult({
        result,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
      }),
    ).not.toThrow();
    expect(() =>
      verifyCloudOnboardingResult({
        result,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
      }),
    ).not.toThrow();
  });

  test("preserves state expiry and tamper protection", () => {
    const result = createResult();
    const [payload, signature] = result.state.split(".");

    expect(() =>
      verifyCloudOnboardingResult({
        result: { ...result, state: `${payload}x.${signature}` },
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now,
      }),
    ).toThrow("signature is invalid");
    expect(() =>
      verifyCloudOnboardingResult({
        result,
        organizationId: ORGANIZATION_ID,
        userId: USER_ID,
        secret: SECRET,
        now: () => now() + 10 * 60 * 1_000,
      }),
    ).toThrow("has expired");
  });
});
