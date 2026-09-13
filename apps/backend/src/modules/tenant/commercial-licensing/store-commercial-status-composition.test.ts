import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { STATUS_CODES } from "@repo/types";
import type { AppVariables } from "@/types/hono";

mock.module("@/middlewares/auth.middleware", () => ({
    authMiddleware: async (
        context: { set: (key: string, value: unknown) => void },
        next: () => Promise<void>,
    ) => {
        context.set("authUser", { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
        await next();
    },
}));

const catalogHarness = await import("../catalog/catalog.service.test-harness");
const { resolveFeatureEntitlement } = await import("./feature-entitlement.test-harness");
const { default: catalogRoutes } = await import("../catalog/catalog.routes");
const { createCommercialLicensingRoutes } = await import("./commercial-licensing.routes");
const {
    createMemoryCommercialLicensing,
    organizationId,
    storeId,
    userId,
} = await import("./commercial-licensing.test-harness");

const authenticateAs = (id: string): MiddlewareHandler<{ Variables: AppVariables }> =>
    async (context, next) => {
        context.set("authUser", { id } as AppVariables["authUser"]);
        await next();
    };

const composeOrganizationRoutes = () => {
    const memory = createMemoryCommercialLicensing();
    const app = new Hono();
    app.route("/organizations", catalogRoutes);
    app.route("/organizations", createCommercialLicensingRoutes(authenticateAs(userId), memory.service));
    return app;
};

describe("Store commercial status among composed organization routes", () => {
    beforeEach(() => {
        resolveFeatureEntitlement.mockClear();
        catalogHarness.getStoresByOrganizationId.mockClear();
        catalogHarness.getStoresByOrganizationId.mockResolvedValue([catalogHarness.store]);
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: false,
            featureKey,
            evidence: [],
        }));
    });

    test("loads commercial status for a new Store that has no Catalog Products entitlement", async () => {
        const app = composeOrganizationRoutes();

        const response = await app.request(
            `http://localhost/organizations/${organizationId}/stores/${storeId}/commercial`,
        );
        const body = (await response.json()) as {
            data?: { commercialStatus?: { trial?: { eligible: boolean } } };
        };

        expect(response.status).toBe(STATUS_CODES.SUCCESS);
        expect(body.data?.commercialStatus?.trial?.eligible).toBe(true);
    });

    test("allows Organization Catalog setup when no Store is entitled", async () => {
        const app = composeOrganizationRoutes();

        const responses = await Promise.all(
            ["categories", "products", "add-ons"].map((resource) =>
                app.request(`http://localhost/organizations/${organizationId}/${resource}`),
            ),
        );

        expect(responses.map((response) => response.status)).toEqual([
            STATUS_CODES.SUCCESS,
            STATUS_CODES.SUCCESS,
            STATUS_CODES.SUCCESS,
        ]);

        const createResponse = await app.request(
            `http://localhost/organizations/${organizationId}/categories`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Prepared before activation" }),
            },
        );

        expect(createResponse.status).toBe(STATUS_CODES.CREATED);
    });

    test("keeps Label Templates gated when no Store is entitled", async () => {
        const app = composeOrganizationRoutes();

        const response = await app.request(`http://localhost/organizations/${organizationId}/label-templates`);

        expect(response.status).toBe(STATUS_CODES.FORBIDDEN);
    });
});
