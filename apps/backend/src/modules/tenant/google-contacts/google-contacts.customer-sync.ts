import { normalizePhoneNumber, type GoogleContactsConnectionStatus } from "@repo/types";

export type GoogleContactsOutboxStatus = "pending" | "processing" | "completed" | "skipped" | "failed" | "conflict";

export type GoogleContactsOutboxSnapshot = {
  status: GoogleContactsOutboxStatus;
  customerUpdatedAt: number;
};

export const googleContactsCustomerIsEligible = (phone: string | null | undefined): boolean =>
  Boolean(normalizePhoneNumber(phone));

export const googleContactsChangeIsSyncRelevant = (input: {
  previousName: string;
  nextName: string;
  previousPhone: string | null;
  nextPhone: string | null;
}): boolean => input.previousName !== input.nextName || (input.previousPhone ?? null) !== (input.nextPhone ?? null);

export type GoogleContactsScheduleDecision =
  | { action: "noop" }
  | { action: "insert"; customerUpdatedAt: number }
  | {
      action: "coalesce";
      status: GoogleContactsOutboxStatus;
      customerUpdatedAt: number;
      resetForRetry: boolean;
    }
  | { action: "skip"; customerUpdatedAt: number };

export const decideGoogleContactsCustomerSchedule = (input: {
  existing: GoogleContactsOutboxSnapshot | null;
  eligible: boolean;
  customerUpdatedAt: number;
  connectionStatus: GoogleContactsConnectionStatus | null;
}): GoogleContactsScheduleDecision => {
  if (!input.eligible) {
    if (!input.existing) return { action: "noop" };
    if (input.existing.status === "processing") {
      return {
        action: "coalesce",
        status: "processing",
        customerUpdatedAt: Math.max(input.existing.customerUpdatedAt, input.customerUpdatedAt),
        resetForRetry: false,
      };
    }
    if (
      input.existing.status === "pending" ||
      input.existing.status === "failed" ||
      input.existing.status === "conflict"
    ) {
      return { action: "skip", customerUpdatedAt: input.customerUpdatedAt };
    }
    return { action: "noop" };
  }

  if (input.connectionStatus !== "connected" && input.connectionStatus !== "reconnect_required") {
    return { action: "noop" };
  }

  if (!input.existing) {
    return { action: "insert", customerUpdatedAt: input.customerUpdatedAt };
  }

  if (input.existing.status === "processing") {
    return {
      action: "coalesce",
      status: "processing",
      customerUpdatedAt: Math.max(input.existing.customerUpdatedAt, input.customerUpdatedAt),
      resetForRetry: false,
    };
  }

  if (input.existing.status === "pending" && input.customerUpdatedAt < input.existing.customerUpdatedAt) {
    return { action: "noop" };
  }

  return {
    action: "coalesce",
    status: "pending",
    customerUpdatedAt: Math.max(input.existing.customerUpdatedAt, input.customerUpdatedAt),
    resetForRetry: true,
  };
};

export type GoogleContactsCompletionDecision = { action: "requeue" } | { action: "skip" } | { action: "apply" };

export const decideGoogleContactsOutboxCompletion = (input: {
  claimedCustomerUpdatedAt: number;
  outboxCustomerUpdatedAt: number;
  currentCustomerUpdatedAt: number;
  currentEligible: boolean;
}): GoogleContactsCompletionDecision => {
  const superseded =
    input.outboxCustomerUpdatedAt > input.claimedCustomerUpdatedAt ||
    input.currentCustomerUpdatedAt > input.claimedCustomerUpdatedAt;
  if (superseded) {
    return input.currentEligible ? { action: "requeue" } : { action: "skip" };
  }
  if (!input.currentEligible) return { action: "skip" };
  return { action: "apply" };
};
