import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { OwnerAuthResponse, OwnerUserRecord, ServiceResponse } from "@repo/types";

import { createOwnerAuthService, createOwnerTokenProvider } from "./owner-auth.service";
import { createPlatformRoutes } from "./platform.routes";

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerSecret = "owner-secret-that-is-isolated-from-other-auth-channels";
const customerAndDeviceSecret = "customer-and-device-secret";

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

const createHarness = async (options: { otpDeliveryOk?: boolean; repositoryFails?: boolean } = {}) => {
    let owner = await activeOwner();
    const otpValues = new Map<string, string>();
    let sentOtp: string | null = null;

    const service = createOwnerAuthService({
        repository: {
            getOwnerUserById: async (id) => {
                if (options.repositoryFails) throw new Error("database unavailable");
                return id === owner.id ? owner : null;
            },
            getOwnerUserByPhone: async (phone) => {
                if (options.repositoryFails) throw new Error("database unavailable");
                return phone === owner.phone ? owner : null;
            },
        },
        otpStore: {
            set: async (key, value) => {
                otpValues.set(key, value);
            },
            get: async (key) => otpValues.get(key) ?? null,
            delete: async (key) => {
                otpValues.delete(key);
            },
        },
        sendOtp: async ({ otp }) => {
            sentOtp = otp;
            return { ok: options.otpDeliveryOk ?? true };
        },
        createOtp: () => "482951",
        verifyPassword: Bun.password.verify,
        tokenProvider: createOwnerTokenProvider(ownerSecret),
    });

    const app = new Hono().route("/platform", createPlatformRoutes(service));

    return {
        app,
        getSentOtp: () => sentOtp,
        getOtpKeys: () => [...otpValues.keys()],
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

describe("Owner User authentication API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("password login establishes only the isolated owner session", async () => {
        const { app } = await createHarness();
        const loginResponse = await passwordLogin(app);
        const body = await loginResponse.json() as {
            data: { ownerUser: Record<string, unknown> };
        };

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.headers.get("set-cookie")).toContain("ganatri_console_token=");
        expect(loginResponse.headers.get("set-cookie")).not.toContain("device_token=");
        expect(body.data.ownerUser).toMatchObject({ id: ownerId, phone: "+919876543210", isActive: true });
        expect(body.data.ownerUser.passwordHash).toBeUndefined();

        const entryResponse = await app.request("/platform/entry", {
            headers: { cookie: cookieFrom(loginResponse) },
        });
        expect(entryResponse.status).toBe(200);
    });

    test("WhatsApp OTP login uses the owner flow and establishes an owner session", async () => {
        const { app, getOtpKeys, getSentOtp } = await createHarness();
        const otpRequest = await app.request("/platform/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json", "x-device-id": "browser-otp" },
            body: JSON.stringify({ requestType: "otp-info", phone: "+919876543210" }),
        });

        expect(otpRequest.status).toBe(200);
        const otpRequestBody = await otpRequest.json() as { data: { nextRequestType: string } };
        expect(otpRequestBody.data.nextRequestType).toBe("otp-verification");
        await Promise.resolve();
        expect(getSentOtp()).toBe("482951");
        expect(getOtpKeys()).toEqual(["console:owner-auth:login:browser-otp:+919876543210"]);

        const verification = await app.request("/platform/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json", "x-device-id": "browser-otp" },
            body: JSON.stringify({
                requestType: "otp-verification",
                phone: "+919876543210",
                otp: "482951",
            }),
        });

        expect(verification.status).toBe(200);
        expect(verification.headers.get("set-cookie")).toContain("ganatri_console_token=");
    });

    test("OTP initiation does not reveal account or delivery status", async () => {
        const active = await createHarness({ otpDeliveryOk: false });
        const unknown = await createHarness();
        const responses = await Promise.all([
            active.app.request("/platform/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ requestType: "otp-info", phone: "+919876543210" }),
            }),
            unknown.app.request("/platform/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ requestType: "otp-info", phone: "+919111111111" }),
            }),
        ]);
        const outcomes = await Promise.all(responses.map(async (response) => ({
            status: response.status,
            body: await response.json() as ServiceResponse<OwnerAuthResponse | null>,
        })));

        expect(outcomes).toEqual([
            { status: 200, body: { status: "success", data: { nextRequestType: "otp-verification" }, message: "If the Owner User is active, an OTP has been sent", code: 200 } },
            { status: 200, body: { status: "success", data: { nextRequestType: "otp-verification" }, message: "If the Owner User is active, an OTP has been sent", code: 200 } },
        ]);
    });

    test("invalid Owner User OTP is denied without establishing a session", async () => {
        const { app } = await createHarness();
        await app.request("/platform/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json", "x-device-id": "browser-invalid-otp" },
            body: JSON.stringify({ requestType: "otp-info", phone: "+919876543210" }),
        });

        const response = await app.request("/platform/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json", "x-device-id": "browser-invalid-otp" },
            body: JSON.stringify({ requestType: "otp-verification", phone: "+919876543210", otp: "111111" }),
        });

        expect(response.status).toBe(401);
        expect(response.headers.get("set-cookie")).toBeNull();
        expect((await response.json() as { message: string }).message).toBe("Invalid credentials");
    });

    test("unknown, inactive, and incorrect credentials share one access-denied outcome", async () => {
        const { app, setOwnerActive } = await createHarness();
        const attempts = [
            { requestType: "user-info", phone: "+919111111111", password: "incorrect password" },
            { requestType: "user-info", phone: "+919876543210", password: "incorrect password" },
        ];
        setOwnerActive(false);
        attempts.push({ requestType: "user-info", phone: "+919876543210", password: "correct horse battery staple" });

        const outcomes = [];
        for (const attempt of attempts) {
            const response = await app.request("/platform/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(attempt),
            });
            outcomes.push({
                status: response.status,
                body: await response.json() as { message: string },
            });
        }

        expect(outcomes.map(({ status }) => status)).toEqual([401, 401, 401]);
        expect(outcomes.map(({ body }) => body.message)).toEqual([
            "Invalid credentials",
            "Invalid credentials",
            "Invalid credentials",
        ]);
    });

    test("customer User and Store Device tokens cannot enter Platform APIs", async () => {
        const { app } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            customerAndDeviceSecret,
        );
        const deviceToken = await sign(
            { deviceId: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            customerAndDeviceSecret,
        );

        for (const token of [customerToken, deviceToken]) {
            const response = await app.request("/platform/entry", {
                headers: { authorization: `Bearer ${token}` },
            });
            expect(response.status).toBe(401);
        }
    });

    test("an inactive Owner User loses an existing session on the next request", async () => {
        const { app, setOwnerActive } = await createHarness();
        const loginResponse = await passwordLogin(app);
        const cookie = cookieFrom(loginResponse);

        expect((await app.request("/platform/entry", { headers: { cookie } })).status).toBe(200);
        setOwnerActive(false);
        expect((await app.request("/platform/entry", { headers: { cookie } })).status).toBe(401);
    });

    test("expired and invalid owner tokens are denied", async () => {
        const { app } = await createHarness();
        const expired = await sign(
            {
                ownerUserId: ownerId,
                tokenType: "owner",
                audience: "ganatri-console",
                exp: Math.floor(Date.now() / 1000) - 1,
            },
            ownerSecret,
        );

        for (const token of [expired, "not-a-jwt"]) {
            const response = await app.request("/platform/entry", {
                headers: { authorization: `Bearer ${token}` },
            });
            expect(response.status).toBe(401);
        }
    });

    test("there is no public Owner User registration route", async () => {
        const { app } = await createHarness();
        const response = await app.request("/platform/auth/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{}",
        });

        expect(response.status).toBe(404);
    });

    test("unexpected platform failures keep the shared response envelope", async () => {
        const { app } = await createHarness({ repositoryFails: true });
        const response = await passwordLogin(app);
        const body = await response.json() as { status: string; message: string; code: number };

        expect(response.status).toBe(500);
        expect(body).toMatchObject({ status: "error", message: "database unavailable", code: 500 });
    });
});
