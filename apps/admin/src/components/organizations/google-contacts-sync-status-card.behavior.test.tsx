import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { GoogleContactsSyncStatus } from "@repo/types";

import { GoogleContactsSyncStatusCardView } from "@/components/organizations/google-contacts-sync-status-card";
import {
    googleContactsOAuthResultFromSearch,
    settleGoogleContactsOAuthCallback,
} from "@/lib/google-contacts-oauth";

const renderCard = (status: GoogleContactsSyncStatus | null) =>
    renderToStaticMarkup(
        <GoogleContactsSyncStatusCardView status={status} onConnect={() => undefined} />,
    );

describe("Google Contacts Sync Status card", () => {
    test("shows a disconnected Organization with a connect action", () => {
        const markup = renderCard({
            connectionStatus: "disconnected",
            googleAccountEmail: null,
            connectedAt: null,
        });

        expect(markup).toContain("Google Contacts Synchronization");
        expect(markup).toContain("Disconnected");
        expect(markup).toContain("Connect Google");
        expect(markup).toContain("No Google account is connected yet.");
        expect(markup).not.toContain("refresh");
        expect(markup).not.toContain("access_token");
    });

    test("shows connecting, connected, and reconnect-required states", () => {
        const connecting = renderCard({
            connectionStatus: "connecting",
            googleAccountEmail: null,
            connectedAt: null,
        });
        const connected = renderCard({
            connectionStatus: "connected",
            googleAccountEmail: "owner@example.com",
            connectedAt: "2026-08-26T06:00:00.000Z",
        });
        const reconnectRequired = renderCard({
            connectionStatus: "reconnect_required",
            googleAccountEmail: "owner@example.com",
            connectedAt: "2026-08-26T06:00:00.000Z",
        });

        expect(connecting).toContain("Connecting");
        expect(connecting).toContain("Continue with Google");
        expect(connected).toContain("Connected");
        expect(connected).toContain("owner@example.com");
        expect(connected).not.toContain("Connect Google");
        expect(connected).not.toContain("Disconnect");
        expect(reconnectRequired).toContain("Reconnect required");
        expect(reconnectRequired).toContain("Reconnect Google");
        expect(reconnectRequired).toContain("owner@example.com");
    });

    test("does not render Google credentials in any status", () => {
        const markup = renderCard({
            connectionStatus: "connected",
            googleAccountEmail: "owner@example.com",
            connectedAt: "2026-08-26T06:00:00.000Z",
        });

        expect(markup).not.toContain("refresh_token");
        expect(markup).not.toContain("access_token");
        expect(markup).not.toContain("client_secret");
        expect(markup).not.toContain("db-secret");
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
                    data: {
                        connectionStatus: "connected",
                        googleAccountEmail: "owner@example.com",
                        connectedAt: "2026-08-26T06:00:00.000Z",
                    },
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
