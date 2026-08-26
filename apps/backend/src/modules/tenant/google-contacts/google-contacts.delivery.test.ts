import { describe, expect, test } from "bun:test";
import {
  decideGoogleContactsDelivery,
  googleContactsBackoffSeconds,
  googleContactsLeaseShouldRecover,
  GOOGLE_CONTACTS_MAX_ATTEMPTS,
} from "./google-contacts.delivery";

describe("Google Contacts bounded delivery", () => {
  test("uses bounded exponential backoff for retryable Google failures", () => {
    expect(googleContactsBackoffSeconds(1)).toBe(30);
    expect(googleContactsBackoffSeconds(2)).toBe(60);
    expect(googleContactsBackoffSeconds(3)).toBe(120);
    expect(googleContactsBackoffSeconds(8)).toBe(900);
    expect(googleContactsBackoffSeconds(12)).toBe(900);
  });

  test("retries transient failures until the attempt bound, then they become permanent", () => {
    expect(
      decideGoogleContactsDelivery({
        outcome: {
          status: "retryable",
          code: "google_unavailable",
          message: "Google Contacts is temporarily unavailable",
        },
        attemptCount: 1,
      }),
    ).toEqual({
      kind: "retry",
      delaySeconds: 30,
      errorCode: "google_unavailable",
      errorMessage: "Google Contacts is temporarily unavailable",
    });
    expect(
      decideGoogleContactsDelivery({
        outcome: {
          status: "retryable",
          code: "google_unavailable",
          message: "Google Contacts is temporarily unavailable",
        },
        attemptCount: GOOGLE_CONTACTS_MAX_ATTEMPTS,
      }),
    ).toEqual({
      kind: "complete",
      outboxStatus: "failed",
      errorCode: "google_unavailable",
      errorMessage: "Google Contacts is temporarily unavailable",
    });
  });

  test("keeps reconnect-required, conflict, and permanent outcomes distinct", () => {
    expect(
      decideGoogleContactsDelivery({
        outcome: {
          status: "reconnect_required",
          code: "google_reconnect_required",
          message: "Google Contacts authorization is no longer valid",
        },
        attemptCount: 1,
      }),
    ).toEqual({
      kind: "reconnect_required",
      errorCode: "google_reconnect_required",
      errorMessage: "Google Contacts authorization is no longer valid",
    });
    expect(
      decideGoogleContactsDelivery({
        outcome: { status: "conflict", reason: "phone_collision" },
        attemptCount: 1,
      }),
    ).toEqual({
      kind: "complete",
      outboxStatus: "conflict",
      errorCode: "phone_collision",
      errorMessage: "This Google Contact phone number matches another Contact",
    });
    expect(
      decideGoogleContactsDelivery({
        outcome: {
          status: "failed",
          code: "google_write_failed",
          message: "Google Contacts could not be updated",
        },
        attemptCount: 1,
      }),
    ).toEqual({
      kind: "complete",
      outboxStatus: "failed",
      errorCode: "google_write_failed",
      errorMessage: "Google Contacts could not be updated",
    });
    expect(
      decideGoogleContactsDelivery({
        outcome: { status: "updated", googleResourceName: "people/dev" },
        attemptCount: 2,
      }),
    ).toEqual({
      kind: "complete",
      outboxStatus: "completed",
      errorCode: null,
      errorMessage: null,
    });
  });

  test("recovers an expired or missing worker lease so the job can be claimed again", () => {
    const now = Date.UTC(2026, 7, 26, 12, 0, 0);
    expect(
      googleContactsLeaseShouldRecover({
        status: "processing",
        leaseExpiresAtMs: Date.UTC(2026, 7, 26, 11, 59, 0),
        nowMs: now,
      }),
    ).toBe(true);
    expect(
      googleContactsLeaseShouldRecover({
        status: "processing",
        leaseExpiresAtMs: null,
        nowMs: now,
      }),
    ).toBe(true);
    expect(
      googleContactsLeaseShouldRecover({
        status: "processing",
        leaseExpiresAtMs: Date.UTC(2026, 7, 26, 12, 1, 0),
        nowMs: now,
      }),
    ).toBe(false);
    expect(
      googleContactsLeaseShouldRecover({
        status: "pending",
        leaseExpiresAtMs: Date.UTC(2026, 7, 26, 11, 59, 0),
        nowMs: now,
      }),
    ).toBe(false);
  });
});
