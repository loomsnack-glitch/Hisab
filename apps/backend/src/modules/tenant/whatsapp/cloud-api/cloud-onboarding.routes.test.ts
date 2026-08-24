import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import { authMiddleware } from "@/middlewares/auth.middleware";
import type { AppVariables } from "@/types/hono";
import { registerCloudOnboardingRoutes } from "./cloud-onboarding.routes";

const startCloudOnboarding = mock(async () => ({
  status: "success" as const,
  message: "WhatsApp Cloud onboarding started",
  data: {
    state: "signed-state",
    expiresAt: "2026-08-21T12:10:00.000Z",
  },
  code: 201 as const,
}));

mock.module("@/middlewares/auth.middleware", () => ({
  authMiddleware: async (
    context: { set: (key: string, value: unknown) => void },
    next: () => Promise<void>,
  ) => {
    context.set("authUser", {
      id: "17268fe9-9f75-4ebe-9997-9d73b2a3e996",
    });
    await next();
  },
}));

const router = new Hono<{ Variables: AppVariables }>();
router.use("*", authMiddleware);
registerCloudOnboardingRoutes(router, startCloudOnboarding);
const app = new Hono<{ Variables: AppVariables }>();
app.route("/organizations", router);

const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";

describe("Cloud onboarding route", () => {
  beforeEach(() => {
    startCloudOnboarding.mockClear();
  });

  test("starts onboarding for an authorized organization", async () => {
    const response = await app.request(
      `/organizations/${ORGANIZATION_ID}/whatsapp/cloud/onboarding/start`,
      { method: "POST" },
    );

    expect(response.status).toBe(201);
    expect(startCloudOnboarding).toHaveBeenCalledWith(
      "17268fe9-9f75-4ebe-9997-9d73b2a3e996",
      ORGANIZATION_ID,
    );
    expect(await response.json()).toMatchObject({
      status: "success",
      data: { state: "signed-state" },
    });
  });

  test("rejects an invalid organization id before service access", async () => {
    const response = await app.request(
      "/organizations/not-an-id/whatsapp/cloud/onboarding/start",
      { method: "POST" },
    );

    expect(response.status).toBe(400);
    expect(startCloudOnboarding).not.toHaveBeenCalled();
  });
});
