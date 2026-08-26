import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { GoogleContactsSyncStatus } from "@repo/types";

import { GoogleContactsSyncStatusCardView } from "@/components/organizations/google-contacts-sync-status-card";
import {
    googleContactsOAuthResultFromSearch,
    settleGoogleContactsOAuthCallback,
} from "@/lib/google-contacts-oauth";

const disconnectedStatus: GoogleContactsSyncStatus = {
    connectionStatus: "disconnected",
    googleAccountEmail: null,
    connectedAt: null,
    initialSyncStatus: "not_started",
    lastSuccessfulSyncAt: null,
    pendingCount: 0,
    errorCount: 0,
    conflictCount: 0,
};

const connectedStatus: GoogleContactsSyncStatus = {
    connectionStatus: "connected",
    googleAccountEmail: "owner@example.com",
    connectedAt: "2026-08-26T06:00:00.000Z",
    initialSyncStatus: "not_started",
    lastSuccessfulSyncAt: null,
    pendingCount: 0,
    errorCount: 0,
    conflictCount: 0,
};

const renderCard = (
    status: GoogleContactsSyncStatus | null,
    extras: {
        onStartInitialSync?: () => void;
        onDisconnect?: () => void;
        onReplace?: () => void;
    } = {},
) =>
    renderToStaticMarkup(
        <GoogleContactsSyncStatusCardView
            status={status}
            onConnect={() => undefined}
            onStartInitialSync={extras.onStartInitialSync}
            onDisconnect={extras.onDisconnect}
            onReplace={extras.onReplace}
        />,
    );

describe("Google Contacts Sync Status card", () => {
    test("shows a disconnected Organization with a connect action", () => {
        const markup = renderCard(disconnectedStatus);

        expect(markup).toContain("Google Contacts Synchronization");
        expect(markup).toContain("Disconnected");
        expect(markup).toContain("Connect Google");
        expect(markup).toContain("No Google account is connected yet.");
        expect(markup).not.toContain("refresh");
        expect(markup).not.toContain("access_token");
    });

    test("shows connecting, connected, and reconnect-required states", () => {
        const connecting = renderCard({
            ...disconnectedStatus,
            connectionStatus: "connecting",
        });
        const connected = renderCard(connectedStatus, {
            onDisconnect: () => undefined,
            onReplace: () => undefined,
        });
        const reconnectRequired = renderCard({
            ...connectedStatus,
            connectionStatus: "reconnect_required",
        }, { onDisconnect: () => undefined });

        expect(connecting).toContain("Connecting");
        expect(connecting).toContain("Continue with Google");
        expect(connected).toContain("Connected");
        expect(connected).toContain("owner@example.com");
        expect(connected).not.toContain("Connect Google");
        expect(connected).toContain("Disconnect");
        expect(connected).toContain("Replace Google account");
        expect(connected).toContain("does not delete Google Contacts");
        expect(reconnectRequired).toContain("Reconnect required");
        expect(reconnectRequired).toContain("Reconnect Google");
        expect(reconnectRequired).toContain("owner@example.com");
        expect(reconnectRequired).toContain("Disconnect");
        expect(reconnectRequired).not.toContain("Replace Google account");
    });

    test("lets a connected Organization run and observe initial catch-up", () => {
        const ready = renderCard(connectedStatus, {
            onStartInitialSync: () => undefined,
            onDisconnect: () => undefined,
            onReplace: () => undefined,
        });
        const pending = renderCard(
            { ...connectedStatus, initialSyncStatus: "pending", pendingCount: 4 },
            {
                onStartInitialSync: () => undefined,
                onDisconnect: () => undefined,
                onReplace: () => undefined,
            },
        );
        const completed = renderCard(
            {
                ...connectedStatus,
                initialSyncStatus: "completed",
                lastSuccessfulSyncAt: "2026-08-26T07:15:00.000Z",
                pendingCount: 0,
                errorCount: 1,
                conflictCount: 2,
            },
            {
                onStartInitialSync: () => undefined,
                onDisconnect: () => undefined,
                onReplace: () => undefined,
            },
        );

        expect(ready).toContain("Run initial sync");
        expect(ready).toContain("Last successful sync: None yet");
        expect(pending).toContain("Initial sync pending");
        expect(pending).toContain("Pending 4, errors 0, conflicts 0");
        expect(pending).not.toContain("Run initial sync");
        expect(completed).toContain("Initial sync completed");
        expect(completed).toContain("2026-08-26T07:15:00.000Z");
        expect(completed).toContain("Pending 0, errors 1, conflicts 2");
        expect(completed).not.toContain("Run initial sync");
        expect(completed).toContain("Disconnect");
        expect(completed).toContain("Replace Google account");
        expect(completed).toContain("does not delete Google Contacts");
    });

    test("distinguishes retryable, permanent, reconnect-required, and conflict outcomes", () => {
        const retrying = renderCard({
            ...connectedStatus,
            initialSyncStatus: "completed",
            lastSuccessfulSyncAt: "2026-08-26T07:15:00.000Z",
            pendingCount: 3,
            errorCount: 0,
            conflictCount: 0,
        });
        const permanent = renderCard({
            ...connectedStatus,
            initialSyncStatus: "completed",
            pendingCount: 0,
            errorCount: 2,
            conflictCount: 0,
        });
        const conflict = renderCard({
            ...connectedStatus,
            initialSyncStatus: "completed",
            pendingCount: 0,
            errorCount: 0,
            conflictCount: 4,
        });
        const reconnectRequired = renderCard({
            ...connectedStatus,
            connectionStatus: "reconnect_required",
            pendingCount: 1,
            errorCount: 2,
            conflictCount: 3,
        });

        expect(retrying).toContain("Pending 3, errors 0, conflicts 0");
        expect(retrying).toContain("Retrying");
        expect(retrying).not.toContain("Reconnect required");
        expect(permanent).toContain("Pending 0, errors 2, conflicts 0");
        expect(permanent).not.toContain("Retrying");
        expect(conflict).toContain("Pending 0, errors 0, conflicts 4");
        expect(reconnectRequired).toContain("Reconnect required");
        expect(reconnectRequired).toContain("Reconnect Google");
        expect(reconnectRequired).toContain("Pending 1, errors 2, conflicts 3");
        expect(reconnectRequired).not.toContain("refresh_token");
    });

    test("does not render Google credentials in any status", () => {
        const markup = renderCard(connectedStatus);

        expect(markup).not.toContain("refresh_token");
        expect(markup).not.toContain("access_token");
        expect(markup).not.toContain("client_secret");
        expect(markup).not.toContain("db-secret");
    });

    test("offers disconnect and replacement without any Google Contact deletion action", () => {
        const markup = renderCard(connectedStatus, {
            onDisconnect: () => undefined,
            onReplace: () => undefined,
        });

        expect(markup).toContain("Disconnect");
        expect(markup).toContain("Replace Google account");
        expect(markup).toContain("does not delete Google Contacts");
        expect(markup.toLowerCase()).not.toContain("delete contact");
        expect(markup).not.toContain("refresh_token");
    });
});

describe("Google Contacts OAuth callback completion", () => {
    test("completes a successful callback without exposing credentials", async () => {
        const searchParams = new URLSearchParams({
            state: "signed-state",
            code: "authorization-code",
        });
        let completed: unknown = null;
        const result = await settleGoogleContactsOAuthCallback({
            organizationId: "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865",
            searchParams,
            completeOAuth: async (organizationId, payload) => {
                completed = { organizationId, payload };
                return {
                    status: "success",
                    message: "Google Contacts connected",
                    data: connectedStatus,
                    code: 200,
                };
            },
        });

        expect(result).toEqual({
            ok: true,
            organizationId: "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865",
        });
        expect(completed).toEqual({
            organizationId: "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865",
            payload: { state: "signed-state", code: "authorization-code" },
        });
        expect(JSON.stringify(completed)).not.toContain("refresh_token");
    });

    test("rejects a callback that has no Organization or OAuth result", async () => {
        expect(googleContactsOAuthResultFromSearch(new URLSearchParams())).toBeNull();
        const result = await settleGoogleContactsOAuthCallback({
            organizationId: null,
            searchParams: new URLSearchParams({ code: "authorization-code" }),
            completeOAuth: async () => {
                throw new Error("must not complete");
            },
        });
        expect(result).toEqual({
            ok: false,
            message: "Google Contacts authorization could not be completed",
        });
    });
});
