import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { CreateOwnerUserREPO, OwnerUserDTO, OwnerUserRecord, ServiceResponse } from "@repo/types";

import { createOwnerAuthService, createOwnerTokenProvider } from "./owner-auth.service";
import { createOwnerUserService } from "./owner-user.service";
import { createPlatformRoutes } from "./platform.routes";

const ashaId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const raviId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const createdId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ownerSecret = "owner-secret-that-is-isolated-from-other-auth-channels";
const ashaPassword = "correct horse battery staple";
const raviPassword = "ravi horse battery staple";
const createdPassword = "created horse battery";

const timestamp = "2026-08-20T00:00:00.000Z";

const createHarness = async (seed: Array<Partial<OwnerUserRecord> & Pick<OwnerUserRecord, "id" | "firstName" | "lastName" | "phone" | "passwordHash" | "isActive">>) => {
    const records: OwnerUserRecord[] = seed.map((owner) => ({
        createdAt: timestamp,
        updatedAt: timestamp,
        ...owner,
    }));
    const otpValues = new Map<string, string>();
    let nextCreatedId = createdId;

    const repository = {
        getOwnerUserById: async (id: string) => records.find((owner) => owner.id === id) ?? null,
        getOwnerUserByPhone: async (phone: string) => records.find((owner) => owner.phone === phone) ?? null,
        listOwnerUsers: async (): Promise<OwnerUserDTO[]> =>
            [...records]
                .sort((left, right) =>
                    String(left.createdAt).localeCompare(String(right.createdAt))
                    || left.firstName.localeCompare(right.firstName)
                    || left.id.localeCompare(right.id)
                )
                .map(({ passwordHash: _passwordHash, ...ownerUser }) => ownerUser),
        countActiveOwnerUsers: async () => records.filter((owner) => owner.isActive).length,
        createOwnerUser: async (data: CreateOwnerUserREPO) => {
            if (records.some((owner) => owner.phone === data.phone)) {
                return { status: "duplicate-phone" as const };
            }
            const ownerUser: OwnerUserRecord = {
                ...data,
                id: nextCreatedId,
                createdAt: timestamp,
                updatedAt: timestamp,
            };
            records.push(ownerUser);
            return { status: "created" as const, ownerUser };
        },
        updateOwnerUserActiveState: async (ownerUserId: string, isActive: boolean) => {
            const index = records.findIndex((owner) => owner.id === ownerUserId);
            const current = index >= 0 ? records[index] : undefined;
            if (!current) {
                return { status: "not-found" as const };
            }
            if (current.isActive === isActive) {
                return { status: "unchanged" as const, ownerUser: current };
            }
            if (!isActive && current.isActive && records.filter((owner) => owner.isActive).length <= 1) {
                return { status: "last-active" as const };
            }
            const ownerUser = { ...current, isActive, updatedAt: "2026-08-21T00:00:00.000Z" };
            records[index] = ownerUser;
            return { status: "updated" as const, ownerUser };
        },
    };

    const authService = createOwnerAuthService({
        repository,
        otpStore: {
            set: async (key, value) => {
                otpValues.set(key, value);
            },
            get: async (key) => otpValues.get(key) ?? null,
            delete: async (key) => {
                otpValues.delete(key);
            },
        },
        sendOtp: async () => ({ ok: true }),
        createOtp: () => "482951",
        verifyPassword: Bun.password.verify,
        tokenProvider: createOwnerTokenProvider(ownerSecret),
    });
    const ownerUserService = createOwnerUserService({
        repository,
        hashPassword: Bun.password.hash,
        createId: () => nextCreatedId,
    });
    const app = new Hono().route("/platform", createPlatformRoutes(authService, ownerUserService));

    return {
        app,
        records,
    };
};

const cookieFrom = (response: Response) => response.headers.get("set-cookie")?.split(";")[0] ?? "";

const passwordLogin = (app: Hono, phone: string, password: string) =>
    app.request("/platform/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-device-id": "browser-1" },
        body: JSON.stringify({ requestType: "user-info", phone, password }),
    });

const twoActiveOwners = async () => {
    const ashaHash = await Bun.password.hash(ashaPassword);
    const raviHash = await Bun.password.hash(raviPassword);
    return createHarness([
        {
            id: ashaId,
            firstName: "Asha",
            lastName: "Shah",
            phone: "+919876543210",
            passwordHash: ashaHash,
            isActive: true,
        },
        {
            id: raviId,
            firstName: "Ravi",
            lastName: "Mehta",
            phone: "+919111111111",
            passwordHash: raviHash,
            isActive: true,
            createdAt: "2026-08-20T01:00:00.000Z",
            updatedAt: "2026-08-20T01:00:00.000Z",
        },
    ]);
};

describe("Owner User management API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("lists Owner Users with identity and active status and never returns password hashes", async () => {
        const { app } = await twoActiveOwners();
        const login = await passwordLogin(app, "+919876543210", ashaPassword);

        const response = await app.request("/platform/owner-users", {
            headers: { cookie: cookieFrom(login) },
        });
        const body = await response.json() as ServiceResponse<{ ownerUsers: Array<Record<string, unknown>> }>;

        expect(response.status).toBe(200);
        expect(body.data?.ownerUsers).toEqual([
            {
                id: ashaId,
                firstName: "Asha",
                lastName: "Shah",
                phone: "+919876543210",
                isActive: true,
                createdAt: timestamp,
                updatedAt: timestamp,
            },
            {
                id: raviId,
                firstName: "Ravi",
                lastName: "Mehta",
                phone: "+919111111111",
                isActive: true,
                createdAt: "2026-08-20T01:00:00.000Z",
                updatedAt: "2026-08-20T01:00:00.000Z",
            },
        ]);
        expect(body.data?.ownerUsers.every((owner) => owner.passwordHash === undefined)).toBe(true);
    });

    test("creates an active Owner User with a hashed password and rejects a duplicate phone", async () => {
        const { app, records } = await twoActiveOwners();
        const cookie = cookieFrom(await passwordLogin(app, "+919876543210", ashaPassword));

        const created = await app.request("/platform/owner-users", {
            method: "POST",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({
                firstName: "  Neel ",
                lastName: "  Iyer ",
                phone: "92222 22222",
                password: createdPassword,
            }),
        });
        const createdBody = await created.json() as ServiceResponse<{ ownerUser: Record<string, unknown> }>;

        expect(created.status).toBe(201);
        expect(createdBody.data?.ownerUser).toMatchObject({
            id: createdId,
            firstName: "Neel",
            lastName: "Iyer",
            phone: "+919222222222",
            isActive: true,
        });
        expect(createdBody.data?.ownerUser.passwordHash).toBeUndefined();
        expect(records.at(-1)?.passwordHash).not.toBe(createdPassword);
        expect(await Bun.password.verify(createdPassword, records.at(-1)?.passwordHash ?? "")).toBe(true);

        const createdLogin = await passwordLogin(app, "+919222222222", createdPassword);
        expect(createdLogin.status).toBe(200);

        const duplicate = await app.request("/platform/owner-users", {
            method: "POST",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({
                firstName: "Copy",
                lastName: "Cat",
                phone: "+919876543210",
                password: createdPassword,
            }),
        });
        expect(duplicate.status).toBe(409);
        expect((await duplicate.json() as { message: string }).message).toBe("An Owner User with that phone already exists");
        expect(records.filter((owner) => owner.phone === "+919876543210")).toHaveLength(1);
    });

    test("deactivating another Owner User denies that person's existing session on the next request", async () => {
        const { app } = await twoActiveOwners();
        const ashaCookie = cookieFrom(await passwordLogin(app, "+919876543210", ashaPassword));
        const raviLogin = await passwordLogin(app, "+919111111111", raviPassword);
        const raviCookie = cookieFrom(raviLogin);

        expect((await app.request("/platform/entry", { headers: { cookie: raviCookie } })).status).toBe(200);

        const deactivated = await app.request(`/platform/owner-users/${raviId}/active-state`, {
            method: "PATCH",
            headers: { "content-type": "application/json", cookie: ashaCookie },
            body: JSON.stringify({ isActive: false }),
        });
        const deactivatedBody = await deactivated.json() as ServiceResponse<{ ownerUser: { isActive: boolean } }>;

        expect(deactivated.status).toBe(200);
        expect(deactivatedBody.data?.ownerUser.isActive).toBe(false);
        expect((await app.request("/platform/entry", { headers: { cookie: raviCookie } })).status).toBe(401);
        expect((await passwordLogin(app, "+919111111111", raviPassword)).status).toBe(401);
        expect((await app.request("/platform/entry", { headers: { cookie: ashaCookie } })).status).toBe(200);
    });

    test("reactivating an Owner User restores login", async () => {
        const { app } = await twoActiveOwners();
        const ashaCookie = cookieFrom(await passwordLogin(app, "+919876543210", ashaPassword));
        await app.request(`/platform/owner-users/${raviId}/active-state`, {
            method: "PATCH",
            headers: { "content-type": "application/json", cookie: ashaCookie },
            body: JSON.stringify({ isActive: false }),
        });
        expect((await passwordLogin(app, "+919111111111", raviPassword)).status).toBe(401);

        const reactivated = await app.request(`/platform/owner-users/${raviId}/active-state`, {
            method: "PATCH",
            headers: { "content-type": "application/json", cookie: ashaCookie },
            body: JSON.stringify({ isActive: true }),
        });
        expect(reactivated.status).toBe(200);
        expect((await passwordLogin(app, "+919111111111", raviPassword)).status).toBe(200);
    });

    test("rejects self-deactivation when another Active Owner User remains", async () => {
        const { app, records } = await twoActiveOwners();
        const cookie = cookieFrom(await passwordLogin(app, "+919876543210", ashaPassword));

        const response = await app.request(`/platform/owner-users/${ashaId}/active-state`, {
            method: "PATCH",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({ isActive: false }),
        });

        expect(response.status).toBe(403);
        expect((await response.json() as { message: string }).message).toBe("Owner Users cannot deactivate themselves");
        expect(records.find((owner) => owner.id === ashaId)?.isActive).toBe(true);
    });

    test("rejects deactivating the final active Owner User", async () => {
        const ashaHash = await Bun.password.hash(ashaPassword);
        const { app, records } = await createHarness([
            {
                id: ashaId,
                firstName: "Asha",
                lastName: "Shah",
                phone: "+919876543210",
                passwordHash: ashaHash,
                isActive: true,
            },
            {
                id: raviId,
                firstName: "Ravi",
                lastName: "Mehta",
                phone: "+919111111111",
                passwordHash: await Bun.password.hash(raviPassword),
                isActive: false,
            },
        ]);
        const cookie = cookieFrom(await passwordLogin(app, "+919876543210", ashaPassword));

        const response = await app.request(`/platform/owner-users/${ashaId}/active-state`, {
            method: "PATCH",
            headers: { "content-type": "application/json", cookie },
            body: JSON.stringify({ isActive: false }),
        });

        expect(response.status).toBe(409);
        expect((await response.json() as { message: string }).message).toBe("The final active Owner User cannot be deactivated");
        expect(records.find((owner) => owner.id === ashaId)?.isActive).toBe(true);
    });

    test("owner-management routes stay owner-authenticated and do not expose tenant mutation", async () => {
        const { app } = await twoActiveOwners();
        const customerToken = await sign(
            { id: ashaId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );

        const unauthenticated = await app.request("/platform/owner-users");
        const customer = await app.request("/platform/owner-users", {
            headers: { authorization: `Bearer ${customerToken}` },
        });
        const tenantCreate = await app.request("/platform/organizations", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: cookieFrom(await passwordLogin(app, "+919876543210", ashaPassword)),
            },
            body: JSON.stringify({ name: "Acme" }),
        });

        expect(unauthenticated.status).toBe(401);
        expect(customer.status).toBe(401);
        expect(tenantCreate.status).toBe(404);
    });
});
