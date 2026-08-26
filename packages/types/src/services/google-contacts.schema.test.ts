import { describe, expect, test } from "bun:test";
import {
    GoogleContactsOAuthCompleteSchema,
    GoogleContactsOAuthStartResponseSchema,
    GoogleContactsSyncStatusSchema,
} from "./google-contacts.schema";

describe("Google Contacts Synchronization contracts", () => {
    test("accepts a disconnected status without account identity", () => {
        const result = GoogleContactsSyncStatusSchema.safeParse({
            connectionStatus: "disconnected",
            googleAccountEmail: null,
            connectedAt: null,
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.connectionStatus).toBe("disconnected");
            expect("refreshToken" in result.data).toBe(false);
            expect("accessToken" in result.data).toBe(false);
            expect("credentialReference" in result.data).toBe(false);
        }
    });

    test("accepts connecting, connected, and reconnect-required statuses", () => {
        expect(
            GoogleContactsSyncStatusSchema.safeParse({
                connectionStatus: "connecting",
                googleAccountEmail: null,
                connectedAt: null,
            }).success,
        ).toBe(true);

        expect(
            GoogleContactsSyncStatusSchema.safeParse({
                connectionStatus: "connected",
                googleAccountEmail: "owner@example.com",
                connectedAt: "2026-08-26T06:00:00.000Z",
            }).success,
        ).toBe(true);

        expect(
            GoogleContactsSyncStatusSchema.safeParse({
                connectionStatus: "reconnect_required",
                googleAccountEmail: "owner@example.com",
                connectedAt: "2026-08-26T06:00:00.000Z",
            }).success,
        ).toBe(true);
    });

    test("defaults catch-up fields so a ticket-01 status payload remains valid", () => {
        const parsed = GoogleContactsSyncStatusSchema.parse({
            connectionStatus: "connected",
            googleAccountEmail: "owner@example.com",
            connectedAt: "2026-08-26T06:00:00.000Z",
        });

        expect(parsed.initialSyncStatus).toBe("not_started");
        expect(parsed.lastSuccessfulSyncAt).toBeNull();
        expect(parsed.pendingCount).toBe(0);
        expect(parsed.retryingCount).toBe(0);
        expect(parsed.errorCount).toBe(0);
        expect(parsed.conflictCount).toBe(0);
    });

    test("accepts pending and completed initial-sync status with compact counts", () => {
        expect(
            GoogleContactsSyncStatusSchema.safeParse({
                connectionStatus: "connected",
                googleAccountEmail: "owner@example.com",
                connectedAt: "2026-08-26T06:00:00.000Z",
                initialSyncStatus: "pending",
                lastSuccessfulSyncAt: null,
                pendingCount: 12,
                retryingCount: 3,
                errorCount: 0,
                conflictCount: 0,
            }).success,
        ).toBe(true);

        const completed = GoogleContactsSyncStatusSchema.parse({
            connectionStatus: "connected",
            googleAccountEmail: "owner@example.com",
            connectedAt: "2026-08-26T06:00:00.000Z",
            initialSyncStatus: "completed",
            lastSuccessfulSyncAt: "2026-08-26T07:00:00.000Z",
            pendingCount: 0,
            retryingCount: 0,
            errorCount: 1,
            conflictCount: 2,
        });
        expect(completed.initialSyncStatus).toBe("completed");
        expect(completed.lastSuccessfulSyncAt).toBe("2026-08-26T07:00:00.000Z");
        expect(completed.pendingCount).toBe(0);
        expect(completed.retryingCount).toBe(0);
        expect(completed.errorCount).toBe(1);
        expect(completed.conflictCount).toBe(2);
    });

    test("rejects credential material on the public status contract", () => {
        expect(
            GoogleContactsSyncStatusSchema.safeParse({
                connectionStatus: "connected",
                googleAccountEmail: "owner@example.com",
                connectedAt: "2026-08-26T06:00:00.000Z",
                refreshToken: "must-not-be-accepted",
            }).success,
        ).toBe(true);

        const parsed = GoogleContactsSyncStatusSchema.parse({
            connectionStatus: "connected",
            googleAccountEmail: "owner@example.com",
            connectedAt: "2026-08-26T06:00:00.000Z",
            refreshToken: "must-not-be-accepted",
            accessToken: "must-not-be-accepted",
            credentialReference: "db-secret:secret",
        });
        expect("refreshToken" in parsed).toBe(false);
        expect("accessToken" in parsed).toBe(false);
        expect("credentialReference" in parsed).toBe(false);
    });

    test("accepts an authorization URL without exposing a client secret", () => {
        const result = GoogleContactsOAuthStartResponseSchema.safeParse({
            authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?client_id=public-id&state=signed",
            expiresAt: "2026-08-26T06:10:00.000Z",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect("clientSecret" in result.data).toBe(false);
        }
    });

    test("accepts a code or a denied-consent error, but not credential fields", () => {
        expect(
            GoogleContactsOAuthCompleteSchema.safeParse({
                state: "signed-state",
                code: "authorization-code",
            }).success,
        ).toBe(true);
        expect(
            GoogleContactsOAuthCompleteSchema.safeParse({
                state: "signed-state",
                error: "access_denied",
            }).success,
        ).toBe(true);
        expect(
            GoogleContactsOAuthCompleteSchema.safeParse({
                state: "signed-state",
                code: "authorization-code",
                refreshToken: "must-not-be-accepted",
            }).success,
        ).toBe(false);
        expect(
            GoogleContactsOAuthCompleteSchema.safeParse({
                state: "signed-state",
            }).success,
        ).toBe(false);
    });
});
