import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono, type MiddlewareHandler } from "hono";
import type { AppVariables } from "@/types/hono";
import { createGoogleContactsRoutes } from "./google-contacts.routes";

const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";
const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";

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
    errorCount: 0,
    conflictCount: 0,
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
    errorCount: 0,
    conflictCount: 0,
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
    errorCount: 0,
    conflictCount: 0,
  },
  code: 202 as const,
}));

const authenticatedUser: MiddlewareHandler<{ Variables: AppVariables }> = async (context, next) => {
  context.set("authUser", { id: USER_ID } as AppVariables["authUser"]);
  await next();
};

const router = createGoogleContactsRoutes(
  { getStatus, start, complete, startInitialSync },
  authenticatedUser,
);
const app = new Hono<{ Variables: AppVariables }>();
app.route("/organizations", router);

describe("Google Contacts connection routes", () => {
  beforeEach(() => {
    getStatus.mockClear();
    start.mockClear();
    complete.mockClear();
    startInitialSync.mockClear();
  });

  test("reads status for an authorized Organization", async () => {
    const response = await app.request(
      `/organizations/${ORGANIZATION_ID}/google-contacts`,
    );

    expect(response.status).toBe(200);
    expect(getStatus).toHaveBeenCalledWith(USER_ID, ORGANIZATION_ID);
    expect(await response.json()).toMatchObject({
      status: "success",
      data: { connectionStatus: "disconnected" },
    });
  });

  test("starts OAuth for an authorized Organization", async () => {
    const response = await app.request(
      `/organizations/${ORGANIZATION_ID}/google-contacts/oauth/start`,
      { method: "POST" },
    );

    expect(response.status).toBe(201);
    expect(start).toHaveBeenCalledWith(USER_ID, ORGANIZATION_ID);
    const body = (await response.json()) as {
      data: { authorizationUrl: string };
    };
    expect(body.data.authorizationUrl).toContain("accounts.google.com");
    expect(JSON.stringify(body)).not.toContain("refresh_token");
    expect(JSON.stringify(body)).not.toContain("client_secret");
  });

  test("completes OAuth for an authorized Organization", async () => {
    const response = await app.request(
      `/organizations/${ORGANIZATION_ID}/google-contacts/oauth/complete`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: "signed-state", code: "authorization-code" }),
      },
    );

    expect(response.status).toBe(200);
    expect(complete).toHaveBeenCalledWith(USER_ID, ORGANIZATION_ID, {
      state: "signed-state",
      code: "authorization-code",
    });
  });

  test("rejects credential material in the OAuth completion body", async () => {
    const response = await app.request(
      `/organizations/${ORGANIZATION_ID}/google-contacts/oauth/complete`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          state: "signed-state",
          code: "authorization-code",
          refreshToken: "must-not-be-accepted",
        }),
      },
    );

    expect(response.status).toBe(400);
    expect(complete).not.toHaveBeenCalled();
  });

  test("rejects an invalid organization id before service access", async () => {
    const response = await app.request(
      "/organizations/not-an-id/google-contacts/oauth/start",
      { method: "POST" },
    );

    expect(response.status).toBe(400);
    expect(start).not.toHaveBeenCalled();
  });

  test("schedules initial catch-up for an authorized Organization without exposing credentials", async () => {
    const response = await app.request(
      `/organizations/${ORGANIZATION_ID}/google-contacts/sync`,
      { method: "POST" },
    );

    expect(response.status).toBe(202);
    expect(startInitialSync).toHaveBeenCalledWith(USER_ID, ORGANIZATION_ID);
    const body = await response.json();
    expect(body).toMatchObject({
      status: "success",
      data: { initialSyncStatus: "pending", pendingCount: 3 },
    });
    expect(JSON.stringify(body)).not.toContain("refresh_token");
    expect(JSON.stringify(body)).not.toContain("access_token");
  });
});
