import { describe, expect, test } from "bun:test";
import {
  decideGoogleContactsCustomerSchedule,
  decideGoogleContactsOutboxCompletion,
  googleContactsChangeIsSyncRelevant,
  googleContactsCustomerIsEligible,
} from "./google-contacts.customer-sync";

const T1 = Date.UTC(2026, 7, 26, 12, 0, 0);
const T2 = Date.UTC(2026, 7, 26, 12, 0, 5);

describe("Google Contacts Customer change scheduling", () => {
  test("an eligible Customer with a phone can be synchronized", () => {
    expect(googleContactsCustomerIsEligible("+919876543210")).toBe(true);
    expect(googleContactsCustomerIsEligible(null)).toBe(false);
    expect(googleContactsCustomerIsEligible("")).toBe(false);
  });

  test("only name and phone changes are relevant for synchronization", () => {
    expect(
      googleContactsChangeIsSyncRelevant({
        previousName: "Dev",
        nextName: "Dev Jariwala",
        previousPhone: "+919876543210",
        nextPhone: "+919876543210",
      }),
    ).toBe(true);
    expect(
      googleContactsChangeIsSyncRelevant({
        previousName: "Dev Jariwala",
        nextName: "Dev Jariwala",
        previousPhone: "+919876543210",
        nextPhone: "+911234567890",
      }),
    ).toBe(true);
    expect(
      googleContactsChangeIsSyncRelevant({
        previousName: "Dev Jariwala",
        nextName: "Dev Jariwala",
        previousPhone: "+919876543210",
        nextPhone: null,
      }),
    ).toBe(true);
    expect(
      googleContactsChangeIsSyncRelevant({
        previousName: "Dev Jariwala",
        nextName: "Dev Jariwala",
        previousPhone: "+919876543210",
        nextPhone: "+919876543210",
      }),
    ).toBe(false);
  });

  test("schedules new pending work for an eligible Customer on a connected account", () => {
    expect(
      decideGoogleContactsCustomerSchedule({
        existing: null,
        eligible: true,
        customerUpdatedAt: T1,
        connectionStatus: "connected",
      }),
    ).toEqual({ action: "insert", customerUpdatedAt: T1 });
  });

  test("preserves eligible Customer changes while Google Contacts needs reconnection", () => {
    expect(
      decideGoogleContactsCustomerSchedule({
        existing: null,
        eligible: true,
        customerUpdatedAt: T1,
        connectionStatus: "reconnect_required",
      }),
    ).toEqual({ action: "insert", customerUpdatedAt: T1 });
  });

  test("does not schedule when Google Contacts is disconnected", () => {
    expect(
      decideGoogleContactsCustomerSchedule({
        existing: null,
        eligible: true,
        customerUpdatedAt: T1,
        connectionStatus: "disconnected",
      }),
    ).toEqual({ action: "noop" });
  });

  test("rapid eligible changes coalesce onto one pending job with the latest Customer state", () => {
    expect(
      decideGoogleContactsCustomerSchedule({
        existing: { status: "pending", customerUpdatedAt: T1 },
        eligible: true,
        customerUpdatedAt: T2,
        connectionStatus: "connected",
      }),
    ).toEqual({
      action: "coalesce",
      status: "pending",
      customerUpdatedAt: T2,
      resetForRetry: true,
    });
  });

  test("older pending work cannot overwrite a newer Customer snapshot", () => {
    expect(
      decideGoogleContactsCustomerSchedule({
        existing: { status: "pending", customerUpdatedAt: T2 },
        eligible: true,
        customerUpdatedAt: T1,
        connectionStatus: "connected",
      }),
    ).toEqual({ action: "noop" });
  });

  test("a later edit while work is processing bumps the snapshot without stealing the lease", () => {
    expect(
      decideGoogleContactsCustomerSchedule({
        existing: { status: "processing", customerUpdatedAt: T1 },
        eligible: true,
        customerUpdatedAt: T2,
        connectionStatus: "connected",
      }),
    ).toEqual({
      action: "coalesce",
      status: "processing",
      customerUpdatedAt: T2,
      resetForRetry: false,
    });
  });

  test("removing a Customer phone skips pending work and does not create new work", () => {
    expect(
      decideGoogleContactsCustomerSchedule({
        existing: null,
        eligible: false,
        customerUpdatedAt: T1,
        connectionStatus: "connected",
      }),
    ).toEqual({ action: "noop" });
    expect(
      decideGoogleContactsCustomerSchedule({
        existing: { status: "pending", customerUpdatedAt: T1 },
        eligible: false,
        customerUpdatedAt: T2,
        connectionStatus: "connected",
      }),
    ).toEqual({ action: "skip", customerUpdatedAt: T2 });
  });

  test("a newer Customer state supersedes in-flight work so the latest snapshot is retried", () => {
    expect(
      decideGoogleContactsOutboxCompletion({
        claimedCustomerUpdatedAt: T1,
        outboxCustomerUpdatedAt: T2,
        currentCustomerUpdatedAt: T2,
        currentEligible: true,
      }),
    ).toEqual({ action: "requeue" });
  });

  test("phone removal after a job is claimed skips remaining work", () => {
    expect(
      decideGoogleContactsOutboxCompletion({
        claimedCustomerUpdatedAt: T1,
        outboxCustomerUpdatedAt: T2,
        currentCustomerUpdatedAt: T2,
        currentEligible: false,
      }),
    ).toEqual({ action: "skip" });
  });
});
