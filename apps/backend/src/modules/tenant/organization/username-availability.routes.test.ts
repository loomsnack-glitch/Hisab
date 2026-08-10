import { beforeEach, describe, expect, mock, test } from "bun:test";

const checkOrganizationUsernameAvailability = mock(
  async (username: string) => ({
    status: "success" as const,
    data: { username, available: username !== "taken_business" },
    message: "Organization username availability checked successfully",
    code: 200 as const,
  }),
);

mock.module("@/middlewares/auth.middleware", () => ({
  authMiddleware: async (
    context: { set: (key: string, value: unknown) => void },
    next: () => Promise<void>,
  ) => {
    context.set("authUser", { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
    await next();
  },
}));

mock.module("./organization.service", () => ({
  checkOrganizationUsernameAvailability,
}));

const { default: organizationRoutes } = await import("./organization.routes");

describe("Organization username availability route", () => {
  beforeEach(() => {
    checkOrganizationUsernameAvailability.mockClear();
  });

  test("normalizes a valid username before checking availability", async () => {
    const response = await organizationRoutes.request(
      "http://localhost/username-availability?username=Demo_Business",
    );

    expect(response.status).toBe(200);
    expect(checkOrganizationUsernameAvailability).toHaveBeenCalledWith(
      "demo_business",
    );
    expect(await response.json()).toMatchObject({
      status: "success",
      data: { username: "demo_business", available: true },
    });
  });

  test("rejects invalid usernames before reaching the service", async () => {
    const response = await organizationRoutes.request(
      "http://localhost/username-availability?username=x",
    );

    expect(response.status).toBe(400);
    expect(checkOrganizationUsernameAvailability).not.toHaveBeenCalled();
  });

  test("returns taken status from the service", async () => {
    const response = await organizationRoutes.request(
      "http://localhost/username-availability?username=taken_business",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "success",
      data: { username: "taken_business", available: false },
    });
  });
});
