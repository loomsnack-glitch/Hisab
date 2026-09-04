import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import type { OwnerUserRecord } from "@repo/types";

import { createOwnerAuthService, createOwnerTokenProvider } from "@/modules/platform/owner-auth.service";
import { createPlatformRoutes } from "@/modules/platform/platform.routes";
import {
    createMemoryCommercialLicensing,
    organizationId,
    storeId,
    trialEnd,
} from "@/modules/tenant/commercial-licensing/commercial-licensing.test-harness";

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerSecret = "owner-secret-that-is-isolated-from-other-auth-channels";

const activeOwner = async (): Promise<OwnerUserRecord> => ({
    id: ownerId,
    firstName: "Asha",
    lastName: "Shah",
    phone: "+919876543210",
    passwordHash: await Bun.password.hash("correct horse battery staple"),
    isActive: true,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
});

const createHarness = async () => {
    let owner = await activeOwner();
    const authService = createOwnerAuthService({
        repository: {
            getOwnerUserById: async (id) => (id === owner.id ? owner : null),
            getOwnerUserByPhone: async (phone) => (phone === owner.phone ? owner : null),
        },
        otpStore: {
            set: async () => {},
            get: async () => null,
            delete: async () => {},
        },
        sendOtp: async () => ({ ok: true }),
        createOtp: () => "482951",
        verifyPassword: Bun.password.verify,
        tokenProvider: createOwnerTokenProvider(ownerSecret),
    });
    const memory = createMemoryCommercialLicensing();
    const app = new Hono().route(
        "/platform",
        createPlatformRoutes(authService, undefined, undefined, undefined, memory.service),
    );
    return {
        app,
        memory,
        setOwnerActive: (isActive: boolean) => {
            owner = { ...owner, isActive, updatedAt: new Date().toISOString() };
        },
    };
};

const passwordLogin = (app: Hono) =>
    app.request("/platform/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-device-id": "browser-1" },
        body: JSON.stringify({
            requestType: "user-info",
            phone: "98765 43210",
            password: "correct horse battery staple",
        }),
    });

const cookieFrom = (response: Response) => response.headers.get("set-cookie")?.split(";")[0] ?? "";

type CommercialBody = {
    message?: string;
    data?: {
        commercialStatus?: {
            accessGrants?: Array<{ origin: string; label: string; termKind: string }>;
            entitlements?: { features: Array<{ key: string }> };
            baseAccess?: { planKey: string } | null;
        };
        grantableAccess?: {
            plans: Array<{ key: string }>;
            modules: Array<{ key: string }>;
        };
    };
};

const readJson = async (response: { json: () => Promise<unknown> }): Promise<CommercialBody> =>
    (await response.json()) as CommercialBody;

describe("Console Store Access Grant routes", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("rejects unauthenticated commercial inspection and grant creation", async () => {
        const { app } = await createHarness();
        const status = await app.request(
            `/platform/organizations/${organizationId}/stores/${storeId}/commercial`,
        );
        const grant = await app.request(
            `/platform/organizations/${organizationId}/stores/${storeId}/commercial/grants`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    termKind: "seven_day",
                    selection: { kind: "plan", planKey: "trial" },
                }),
            },
        );

        expect(status.status).toBe(401);
        expect(grant.status).toBe(401);
        expect((await readJson(status)).message).toBe("Owner authentication is required");
    });

    test("lets an Owner User inspect Store access sources and create a snapshotted grant", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));

        const inspection = await app.request(
            `/platform/organizations/${organizationId}/stores/${storeId}/commercial`,
            { headers: { cookie } },
        );
        const body = await readJson(inspection);
        const created = await app.request(
            `/platform/organizations/${organizationId}/stores/${storeId}/commercial/grants`,
            {
                method: "POST",
                headers: { "content-type": "application/json", cookie },
                body: JSON.stringify({
                    termKind: "seven_day",
                    selection: { kind: "module", moduleKey: "integrations" },
                }),
            },
        );
        const createdBody = await readJson(created);

        expect(inspection.status).toBe(200);
        expect(body.data?.grantableAccess?.plans.map((plan) => plan.key).sort()).toEqual(["core", "trial"]);
        expect(created.status).toBe(201);
        expect(createdBody.message).toBe("Store Access Grant created successfully");
        expect(createdBody.data?.commercialStatus?.accessGrants).toEqual([
            expect.objectContaining({
                origin: "administrator",
                termKind: "seven_day",
                label: "Seven-day Store Access Grant",
            }),
        ]);
        expect(createdBody.data?.commercialStatus?.entitlements?.features.map((feature) => feature.key))
            .toContain("whatsapp");
        expect(new Date(
            (createdBody.data?.commercialStatus?.accessGrants?.[0] as { endsAt?: string })?.endsAt ?? "",
        ).toISOString()).toBe(trialEnd.toISOString());
        expect(JSON.stringify(createdBody)).not.toContain("razorpay");
        expect(JSON.stringify(createdBody)).not.toContain("device secret");
    });

    test("keeps a Console complimentary grant distinct from the legacy migration grant", async () => {
        const { app, memory } = await createHarness();
        await memory.service.applyLegacyStoreMigrationGrants();
        const cookie = cookieFrom(await passwordLogin(app));

        const created = await app.request(
            `/platform/organizations/${organizationId}/stores/${storeId}/commercial/grants`,
            {
                method: "POST",
                headers: { "content-type": "application/json", cookie },
                body: JSON.stringify({
                    termKind: "complimentary",
                    selection: { kind: "plan", planKey: "core" },
                    term: { count: 30, unit: "day" },
                }),
            },
        );
        const body = await readJson(created);
        const origins = body.data?.commercialStatus?.accessGrants?.map((grant) => grant.origin).sort();
        const labels = body.data?.commercialStatus?.accessGrants?.map((grant) => grant.label).sort();

        expect(created.status).toBe(201);
        expect(origins).toEqual(["administrator", "legacy_migration"]);
        expect(labels).toEqual(["Complimentary Store Access Grant", "Legacy migration grant"]);
        expect(body.data?.commercialStatus?.baseAccess).toBeNull();
    });

    test("does not let an inactive Owner User inspect or grant Store access", async () => {
        const { app, setOwnerActive } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        setOwnerActive(false);

        const inspection = await app.request(
            `/platform/organizations/${organizationId}/stores/${storeId}/commercial`,
            { headers: { cookie } },
        );
        const grant = await app.request(
            `/platform/organizations/${organizationId}/stores/${storeId}/commercial/grants`,
            {
                method: "POST",
                headers: { "content-type": "application/json", cookie },
                body: JSON.stringify({
                    termKind: "seven_day",
                    selection: { kind: "plan", planKey: "trial" },
                }),
            },
        );

        expect(inspection.status).toBe(401);
        expect(grant.status).toBe(401);
    });
});
