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
  },
  code: 200 as const,
}));

const rejectUnauthenticatedUser: MiddlewareHandler<{ Variables: AppVariables }> = (context) =>
  context.json({ status: "error", message: "Unauthorized" }, 401);

const app = new Hono<{ Variables: AppVariables }>();
app.route(
  "/organizations",
  createGoogleContactsRoutes({ getStatus, start, complete }, rejectUnauthenticatedUser),
);

describe("Google Contacts connection authorization", () => {
  test("rejects unauthenticated status and OAuth requests", async () => {
    const statusResponse = await app.request(
      `/organizations/${ORGANIZATION_ID}/google-contacts`,
    );
    const startResponse = await app.request(
      `/organizations/${ORGANIZATION_ID}/google-contacts/oauth/start`,
      { method: "POST" },
    );
    const completeResponse = await app.request(
      `/organizations/${ORGANIZATION_ID}/google-contacts/oauth/complete`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: "signed-state", code: "authorization-code" }),
      },
    );

    expect(statusResponse.status).toBe(401);
    expect(startResponse.status).toBe(401);
    expect(completeResponse.status).toBe(401);
    expect(getStatus).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  test("does not register Google Contacts management on Store Device POS routes", () => {
    const posRoutes = readFileSync(posRoutesPath, "utf8");

    expect(posRoutes).not.toContain("google-contacts");
    expect(posRoutes).not.toContain("Google Contacts");
  });
});
