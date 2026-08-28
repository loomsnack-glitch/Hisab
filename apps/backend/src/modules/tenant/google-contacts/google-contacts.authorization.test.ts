import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Hono, type MiddlewareHandler } from "hono";
import type { AppVariables } from "@/types/hono";
import { createGoogleContactsRoutes } from "./google-contacts.routes";

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";
const posRoutesPath = join(import.meta.dir, "..", "..", "pos", "pos.routes.ts");

const getStatus = mock(async () => ({
  status: "success" as const,
  message: "Google Contacts Sync Status",
  data: {
    connectionStatus: "disconnected" as const,
    googleAccountEmail: null,
    connectedAt: null,
    initialSyncStatus: "not_started" as const,
    lastSuccessfulSyncAt: null,
    pendingCount: 0,
    retryingCount: 0,
    errorCount: 0,
    conflictCount: 0,
    contactNamePrefix: "",
    contactNamePostfix: "",
  },
  code: 200 as const,
}));

const start = mock(async () => ({
  status: "success" as const,
  message: "Google Contacts authorization started",
  data: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=signed-state",
    expiresAt: "2026-08-26T06:10:00.000Z",
  },
  code: 201 as const,
}));

const complete = mock(async () => ({
  status: "success" as const,
  message: "Google Contacts connected",
  data: {
    connectionStatus: "connected" as const,
    googleAccountEmail: "owner@example.com",
    connectedAt: "2026-08-26T06:00:00.000Z",
    initialSyncStatus: "not_started" as const,
    lastSuccessfulSyncAt: null,
    pendingCount: 0,
    retryingCount: 0,
    errorCount: 0,
    conflictCount: 0,
    contactNamePrefix: "",
    contactNamePostfix: "",
  },
  code: 200 as const,
}));

const startInitialSync = mock(async () => ({
  status: "success" as const,
  message: "Google Contacts initial sync scheduled",
  data: {
    connectionStatus: "connected" as const,
    googleAccountEmail: "owner@example.com",
    connectedAt: "2026-08-26T06:00:00.000Z",
    initialSyncStatus: "pending" as const,
    lastSuccessfulSyncAt: null,
    pendingCount: 3,
    retryingCount: 0,
    errorCount: 0,
    conflictCount: 0,
    contactNamePrefix: "",
    contactNamePostfix: "",
  },
  code: 202 as const,
}));

const replace = mock(async () => ({
  status: "success" as const,
  message: "Google Contacts replacement started",
  data: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=signed-state",
    expiresAt: "2026-08-26T06:10:00.000Z",
  },
  code: 201 as const,
}));

const disconnect = mock(async () => ({
  status: "success" as const,
  message: "Google Contacts disconnected",
  data: {
    connectionStatus: "disconnected" as const,
    googleAccountEmail: null,
    connectedAt: null,
    initialSyncStatus: "not_started" as const,
    lastSuccessfulSyncAt: null,
    pendingCount: 0,
    retryingCount: 0,
    errorCount: 0,
    conflictCount: 0,
    contactNamePrefix: "",
    contactNamePostfix: "",
  },
  code: 200 as const,
}));

const updateNameAffix = mock(async () => ({
  status: "success" as const,
  message: "Google Contact Name Affix saved",
  data: {
    connectionStatus: "connected" as const,
    googleAccountEmail: "owner@example.com",
    connectedAt: "2026-08-26T06:00:00.000Z",
    initialSyncStatus: "completed" as const,
    lastSuccessfulSyncAt: "2026-08-26T07:15:00.000Z",
    pendingCount: 0,
    retryingCount: 0,
    errorCount: 0,
    conflictCount: 0,
    contactNamePrefix: "",
    contactNamePostfix: "@ph",
  },
  code: 200 as const,
}));

const rejectUnauthenticatedUser: MiddlewareHandler<{
  Variables: AppVariables;
}> = async (context) => context.json({ status: "error", message: "Unauthorized" }, 401);

const app = new Hono<{ Variables: AppVariables }>();
app.route(
  "/organizations",
  createGoogleContactsRoutes(
    { getStatus, start, complete, startInitialSync, replace, disconnect, updateNameAffix },
    rejectUnauthenticatedUser,
  ),
);

describe("Google Contacts connection authorization", () => {
  test("rejects unauthenticated status and OAuth requests", async () => {
    const statusResponse = await app.request(`/organizations/${ORGANIZATION_ID}/google-contacts`);
    const startResponse = await app.request(`/organizations/${ORGANIZATION_ID}/google-contacts/oauth/start`, {
      method: "POST",
    });
    const completeResponse = await app.request(`/organizations/${ORGANIZATION_ID}/google-contacts/oauth/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        state: "signed-state",
        code: "authorization-code",
      }),
    });
    const syncResponse = await app.request(`/organizations/${ORGANIZATION_ID}/google-contacts/sync`, {
      method: "POST",
    });
    const replaceResponse = await app.request(`/organizations/${ORGANIZATION_ID}/google-contacts/oauth/replace`, {
      method: "POST",
    });
    const disconnectResponse = await app.request(`/organizations/${ORGANIZATION_ID}/google-contacts/disconnect`, {
      method: "POST",
    });
    const affixResponse = await app.request(`/organizations/${ORGANIZATION_ID}/google-contacts/name-affix`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contactNamePrefix: "",
        contactNamePostfix: "@ph",
      }),
    });

    expect(statusResponse.status).toBe(401);
    expect(startResponse.status).toBe(401);
    expect(completeResponse.status).toBe(401);
    expect(syncResponse.status).toBe(401);
    expect(replaceResponse.status).toBe(401);
    expect(disconnectResponse.status).toBe(401);
    expect(affixResponse.status).toBe(401);
    expect(getStatus).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(startInitialSync).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
    expect(updateNameAffix).not.toHaveBeenCalled();
  });

  test("does not register Google Contacts management on Store Device POS routes", () => {
    const posRoutes = readFileSync(posRoutesPath, "utf8");

    expect(posRoutes).not.toContain("google-contacts");
    expect(posRoutes).not.toContain("Google Contacts");
    expect(posRoutes).not.toContain("google-contacts/sync");
    expect(posRoutes).not.toContain("google-contacts/disconnect");
    expect(posRoutes).not.toContain("google-contacts/oauth/replace");
    expect(posRoutes).not.toContain("google-contacts/name-affix");
  });
});
