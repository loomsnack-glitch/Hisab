import { describe, expect, test } from "bun:test";
import type { MiddlewareHandler } from "hono";
import { STATUS_CODES } from "@repo/types";
import type { AppVariables } from "@/types/hono";
import { authMiddleware } from "@/middlewares/auth.middleware";

import { createCommercialLicensingRoutes } from "./commercial-licensing.routes";
import {
    createMemoryCommercialLicensing,
    organizationId,
    otherStoreId,
    outsiderId,
    storeId,
    trialEnd,
    trialStart,
    userId,
} from "./commercial-licensing.test-harness";

const authenticateAs = (id: string): MiddlewareHandler<{ Variables: AppVariables }> =>
    async (context, next) => {
        context.set("authUser", { id } as AppVariables["authUser"]);
        await next();
    };

type CommercialRouteBody = {
    message?: string;
    data?: {
        commercialStatus?: {
            timezone?: string;
            trial?: { eligible: boolean };
            baseAccess?: { planKey: string; startsAt: string | Date; endsAt: string | Date } | null;
            entitlements?: { features: Array<{ key: string }> };
        };
    };
};

const readJson = async (response: { json: () => Promise<unknown> }): Promise<CommercialRouteBody> =>
    (await response.json()) as CommercialRouteBody;

const createApp = (user = userId) => {
    const memory = createMemoryCommercialLicensing();
    return {
        memory,
        routes: createCommercialLicensingRoutes(authenticateAs(user), memory.service),
        unauthenticated: createCommercialLicensingRoutes(authMiddleware, memory.service),
    };
};

describe("Store commercial licensing routes", () => {
    test("rejects unauthenticated commercial status and trial start", async () => {
        const { unauthenticated } = createApp();

        const status = await unauthenticated.request(
            `http://localhost/${organizationId}/stores/${storeId}/commercial`,
        );
        const trial = await unauthenticated.request(
            `http://localhost/${organizationId}/stores/${storeId}/commercial/trial`,
            { method: "POST" },
        );

        expect(status.status).toBe(401);
        expect(trial.status).toBe(401);
        expect((await readJson(status)).message).toBe("Authentication is required");
    });

    test("shows an eligible Store with no Features until the standard Trial is started", async () => {
        const { routes } = createApp();

        const response = await routes.request(
            `http://localhost/${organizationId}/stores/${storeId}/commercial`,
        );
        const body = await readJson(response);

        expect(response.status).toBe(200);
        expect(body.data?.commercialStatus?.trial?.eligible).toBe(true);
        expect(body.data?.commercialStatus?.baseAccess).toBeNull();
        expect(body.data?.commercialStatus?.entitlements?.features).toEqual([]);
        expect(body.data?.commercialStatus?.timezone).toBe("Asia/Kolkata");
    });

    test("starts a Trial through the Organization administrator route and snapshots Features", async () => {
        const { routes } = createApp();

        const response = await routes.request(
            `http://localhost/${organizationId}/stores/${storeId}/commercial/trial`,
            { method: "POST" },
        );
        const body = await readJson(response);

        expect(response.status).toBe(201);
        expect(body.message).toBe("Standard Trial Plan started successfully");
        expect(body.data?.commercialStatus?.baseAccess?.planKey).toBe("trial");
        expect(new Date(body.data?.commercialStatus?.baseAccess?.startsAt ?? "").toISOString()).toBe(trialStart.toISOString());
        expect(new Date(body.data?.commercialStatus?.baseAccess?.endsAt ?? "").toISOString()).toBe(trialEnd.toISOString());
        expect(body.data?.commercialStatus?.entitlements?.features.map((feature) => feature.key).sort())
            .toEqual(["billing", "reports", "whatsapp"]);
    });

    test("rejects a repeat Trial on the same Store while another Store remains independently eligible", async () => {
        const { routes } = createApp();
        await routes.request(
            `http://localhost/${organizationId}/stores/${storeId}/commercial/trial`,
            { method: "POST" },
        );

        const repeat = await routes.request(
            `http://localhost/${organizationId}/stores/${storeId}/commercial/trial`,
            { method: "POST" },
        );
        const other = await routes.request(
            `http://localhost/${organizationId}/stores/${otherStoreId}/commercial`,
        );

        expect(repeat.status).toBe(409);
        expect((await readJson(repeat)).message).toBe("This Store has already used its standard Trial Plan.");
        expect((await readJson(other)).data?.commercialStatus?.trial?.eligible).toBe(true);
    });

    test("does not start a Trial for a user who is not an Organization administrator", async () => {
        const { routes } = createApp(outsiderId);

        const response = await routes.request(
            `http://localhost/${organizationId}/stores/${storeId}/commercial/trial`,
            { method: "POST" },
        );

        expect(response.status).toBe(404);
        expect((await readJson(response)).message).toBe("Organization not found");
    });

    test("rejects invalid Store ids before calling Commercial Licensing", async () => {
        const { routes } = createApp();

        const response = await routes.request(
            `http://localhost/${organizationId}/stores/not-a-uuid/commercial`,
        );

        expect(response.status).toBe(STATUS_CODES.BAD_REQUEST);
        expect((await readJson(response)).message).toBe("Invalid store id");
    });
});
