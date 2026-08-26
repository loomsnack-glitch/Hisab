import type { GoogleContactsSyncOutcome } from "./google-contacts.worker";

export const GOOGLE_CONTACTS_MAX_ATTEMPTS = 8;
export const GOOGLE_CONTACTS_MAX_BACKOFF_SECONDS = 900;
const GOOGLE_CONTACTS_BASE_BACKOFF_SECONDS = 30;

export const googleContactsBackoffSeconds = (attemptCount: number): number =>
  Math.min(
    GOOGLE_CONTACTS_BASE_BACKOFF_SECONDS * 2 ** Math.max(attemptCount - 1, 0),
    GOOGLE_CONTACTS_MAX_BACKOFF_SECONDS,
  );

export const googleContactsLeaseShouldRecover = (input: {
  status: string;
  leaseExpiresAtMs: number | null;
  nowMs: number;
}): boolean =>
  input.status === "processing" &&
  (input.leaseExpiresAtMs === null || input.leaseExpiresAtMs < input.nowMs);

export type GoogleContactsDeliveryPlan =
  | {
      kind: "retry";
      delaySeconds: number;
      errorCode: string;
      errorMessage: string;
    }
  | {
      kind: "reconnect_required";
      errorCode: string;
      errorMessage: string;
    }
  | {
      kind: "complete";
      outboxStatus: "completed" | "skipped" | "conflict" | "failed";
      errorCode: string | null;
      errorMessage: string | null;
    };

const conflictMessage = (reason: "multiple_matches" | "phone_collision"): string =>
  reason === "phone_collision"
    ? "This Google Contact phone number matches another Contact"
    : "More than one Google Contact has this phone number";

export const decideGoogleContactsDelivery = (input: {
  outcome: GoogleContactsSyncOutcome;
  attemptCount: number;
}): GoogleContactsDeliveryPlan => {
  if (input.outcome.status === "retryable") {
    if (input.attemptCount < GOOGLE_CONTACTS_MAX_ATTEMPTS) {
      return {
        kind: "retry",
        delaySeconds: googleContactsBackoffSeconds(input.attemptCount),
        errorCode: input.outcome.code,
        errorMessage: input.outcome.message,
      };
    }
    return {
      kind: "complete",
      outboxStatus: "failed",
      errorCode: input.outcome.code,
      errorMessage: input.outcome.message,
    };
  }

  if (input.outcome.status === "reconnect_required") {
    return {
      kind: "reconnect_required",
      errorCode: input.outcome.code,
      errorMessage: input.outcome.message,
    };
  }

  if (input.outcome.status === "conflict") {
    return {
      kind: "complete",
      outboxStatus: "conflict",
      errorCode: input.outcome.reason,
      errorMessage: conflictMessage(input.outcome.reason),
    };
  }

  if (input.outcome.status === "failed") {
    return {
      kind: "complete",
      outboxStatus: "failed",
      errorCode: input.outcome.code,
      errorMessage: input.outcome.message,
    };
  }

  if (input.outcome.status === "skipped") {
    return {
      kind: "complete",
      outboxStatus: "skipped",
      errorCode: null,
      errorMessage: null,
    };
  }

  return {
    kind: "complete",
    outboxStatus: "completed",
    errorCode: null,
    errorMessage: null,
  };
};
