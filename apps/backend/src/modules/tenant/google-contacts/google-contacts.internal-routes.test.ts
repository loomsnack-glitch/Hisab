import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono, type MiddlewareHandler } from "hono";
import { createGoogleContactsInternalRoutes } from "./google-contacts.internal-routes";

describe("Google Contacts internal worker routes", () => {
  const processNext = mock(async () => ({ processed: true }));
  const authenticate: MiddlewareHandler = async (_context, next) => {
    await next();
  };
  const app = new Hono();
  app.route(
    "/internal/google-contacts",
    createGoogleContactsInternalRoutes(processNext, authenticate),
  );

  beforeEach(() => {
    processNext.mockClear();
  });

  test("processes the next Google Contacts Sync Outbox job for a dedicated worker", async () => {
    const response = await app.request("/internal/google-contacts/outbox/process-next", {
      method: "POST",
      headers: { "x-google-contacts-worker-id": "google-contacts-worker-1" },
    });

    expect(response.status).toBe(200);
    expect(processNext).toHaveBeenCalledWith("google-contacts-worker-1");
    expect(await response.json()).toEqual({ status: "success", processed: true });
  });

  test("rejects an invalid worker identity", async () => {
    const response = await app.request("/internal/google-contacts/outbox/process-next", {
      method: "POST",
      headers: { "x-google-contacts-worker-id": "bad worker" },
    });

    expect(response.status).toBe(400);
    expect(processNext).not.toHaveBeenCalled();
  });
});
