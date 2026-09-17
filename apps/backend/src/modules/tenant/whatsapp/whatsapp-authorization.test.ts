import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { STATUS_CODES } from "@repo/types";
import type { AppVariables } from "@/types/hono";
import {
  authorizeWhatsAppManagement,
  createWhatsAppAdministratorMutationMiddleware,
  isWhatsAppMutationMethod,
} from "./whatsapp-authorization";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const creatorId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherUserId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const organization = { id: organizationId, createdBy: creatorId };

describe("WhatsApp administrator authorization", () => {
  test("recognizes only mutating HTTP methods", () => {
    expect(isWhatsAppMutationMethod("POST")).toBe(true);
    expect(isWhatsAppMutationMethod("patch")).toBe(true);
    expect(isWhatsAppMutationMethod("DELETE")).toBe(true);
    expect(isWhatsAppMutationMethod("GET")).toBe(false);
  });

  test("allows the Organization creator", async () => {
    const lookup = mock(async () => organization);

    await expect(authorizeWhatsAppManagement(creatorId, organizationId, lookup)).resolves.toEqual({
      allowed: true,
    });
    expect(lookup).toHaveBeenCalledWith(organizationId, creatorId);
  });

  test("denies an authenticated user without Organization access", async () => {
    const lookup = mock(async () => null);

    await expect(authorizeWhatsAppManagement(otherUserId, organizationId, lookup)).resolves.toEqual({
      allowed: false,
      code: STATUS_CODES.NOT_FOUND,
      message: "Organization not found",
    });
  });

  test("denies an Organization user who is not the current administrator", async () => {
    const lookup = mock(async () => ({ id: organizationId, createdBy: otherUserId }));

    await expect(authorizeWhatsAppManagement(creatorId, organizationId, lookup)).resolves.toEqual({
      allowed: false,
      code: STATUS_CODES.FORBIDDEN,
      message: "WhatsApp administrator access is required",
    });
  });

  test("guards mutations, preserves reads, and rejects invalid scope before lookup", async () => {
    const lookup = mock(async () => organization);
    const authenticate: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
      c.set("authUser", { id: creatorId } as AppVariables["authUser"]);
      await next();
    };
    const app = new Hono<{ Variables: AppVariables }>();
    app.use("*", authenticate);
    app.use("/:organizationId/*", createWhatsAppAdministratorMutationMiddleware(lookup));
    app.get("/:organizationId/whatsapp/accounts", c => c.json({ route: "read" }));
    app.post("/:organizationId/whatsapp/accounts", c => c.json({ route: "mutation" }));

    const read = await app.request(`/${organizationId}/whatsapp/accounts`);
    expect(read.status).toBe(200);
    expect(await read.json()).toEqual({ route: "read" });

    const mutation = await app.request(`/${organizationId}/whatsapp/accounts`, { method: "POST" });
    expect(mutation.status).toBe(200);
    expect(await mutation.json()).toEqual({ route: "mutation" });

    const invalid = await app.request("/not-an-id/whatsapp/accounts", { method: "POST" });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ message: "Invalid organization id" });
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  test("registers the guard after authentication on the WhatsApp user router", () => {
    const routeSource = readFileSync(join(import.meta.dir, "whatsapp.routes.ts"), "utf8");

    expect(routeSource).toContain('userRouter.use("*", authMiddleware);');
    expect(routeSource).toContain(
      'userRouter.use("/:organizationId/*", whatsappAdministratorMutationMiddleware);',
    );
  });
});
