import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import {
    FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE,
    type OwnerUserRecord,
    type PlatformDashboardResponse,
    type ServiceResponse,
} from "@repo/types";

import { createOwnerAuthService, createOwnerTokenProvider } from "./owner-auth.service";
import { createPlatformReportingService } from "./platform-reporting.service";
import type { PlatformDashboardMetrics, PlatformDashboardMetricsQuery } from "./platform-reporting.repository";
import { createPlatformRoutes } from "./platform.routes";

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerSecret = "owner-secret-that-is-isolated-from-other-auth-channels";
const now = new Date("2026-08-21T07:11:00.000Z");

const orgActive = "11111111-1111-4111-8111-111111111111";
const orgInactive = "22222222-2222-4222-8222-222222222222";
const orgMixed = "33333333-3333-4333-8333-333333333333";
const orgNoStores = "44444444-4444-4444-8444-444444444444";

const storeActive = "55555555-5555-4555-8555-555555555555";
const storeQuiet = "66666666-6666-4666-8666-666666666666";
const storeMixedActive = "77777777-7777-4777-8777-777777777777";
const storeMixedQuiet = "88888888-8888-4888-8888-888888888888";

type SaleStatus = "draft" | "completed" | "voided";

type ReportingSale = {
    organizationId: string;
    storeId: string;
    status: SaleStatus;
    grandTotal: number;
    committedAt: Date | null;
};

type ReportingCustomer = {
    isActive: boolean;
    createdAt: Date;
};

type ReportingPayment = {
    amount: number;
};

const inWindow = (value: Date | null, startAt: Date | null, endAt: Date | null) => {
    if (!value) return false;
    if (startAt && value.getTime() < startAt.getTime()) return false;
    if (endAt && value.getTime() >= endAt.getTime()) return false;
    return true;
};

const createReportingMetrics = (
    organizations: string[],
    stores: Array<{ id: string; organizationId: string }>,
    customers: ReportingCustomer[],
    sales: ReportingSale[],
    _payments: ReportingPayment[],
) =>
    async (query: PlatformDashboardMetricsQuery): Promise<PlatformDashboardMetrics> => {
        const completedSales = sales.filter((sale) => sale.status === "completed");
        const periodCompletedSales = completedSales.filter((sale) =>
            inWindow(sale.committedAt, query.periodStartAt, query.periodEndAt),
        );
        const activeStoreIds = new Set(
            completedSales
                .filter((sale) => inWindow(sale.committedAt, query.activityStartAt, query.activityEndAt))
                .map((sale) => sale.storeId),
        );
        const activeOrganizationIds = new Set(
            stores.filter((store) => activeStoreIds.has(store.id)).map((store) => store.organizationId),
        );

        return {
            organizationCount: organizations.length,
            storeCount: stores.length,
            customerCount: customers.length,
            completedSaleCount: completedSales.length,
            activeOrganizationCount: activeOrganizationIds.size,
            activeStoreCount: activeStoreIds.size,
            periodCompletedSaleCount: periodCompletedSales.length,
            periodCompletedSalesValue: periodCompletedSales.reduce((sum, sale) => sum + sale.grandTotal, 0),
            periodCustomerCount: customers.filter((customer) =>
                inWindow(customer.createdAt, query.periodStartAt, query.periodEndAt),
            ).length,
        };
    };

const platformFacts = () => {
    const organizations = [orgActive, orgInactive, orgMixed, orgNoStores];
    const stores = [
        { id: storeActive, organizationId: orgActive },
        { id: storeQuiet, organizationId: orgInactive },
        { id: storeMixedActive, organizationId: orgMixed },
        { id: storeMixedQuiet, organizationId: orgMixed },
    ];
    const customers: ReportingCustomer[] = [
        { isActive: true, createdAt: new Date("2026-01-15T10:00:00.000Z") },
        { isActive: false, createdAt: new Date("2026-08-20T10:00:00.000Z") },
    ];
    const sales: ReportingSale[] = [
        {
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            grandTotal: 10,
            committedAt: new Date("2026-08-14T18:30:00.000Z"),
        },
        {
            organizationId: orgInactive,
            storeId: storeQuiet,
            status: "completed",
            grandTotal: 12,
            committedAt: new Date("2026-08-14T18:29:59.000Z"),
        },
        {
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            grandTotal: 11,
            committedAt: new Date("2026-08-21T18:30:00.000Z"),
        },
        {
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            grandTotal: 15,
            committedAt: new Date("2026-08-21T18:29:59.000Z"),
        },
        {
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            grandTotal: 100,
            committedAt: new Date("2026-08-18T10:00:00.000Z"),
        },
        {
            organizationId: orgMixed,
            storeId: storeMixedActive,
            status: "completed",
            grandTotal: 50.5,
            committedAt: new Date("2026-08-19T10:00:00.000Z"),
        },
        {
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            grandTotal: 25.25,
            committedAt: new Date("2026-08-20T10:00:00.000Z"),
        },
        {
            organizationId: orgInactive,
            storeId: storeQuiet,
            status: "completed",
            grandTotal: 40,
            committedAt: new Date("2026-08-01T10:00:00.000Z"),
        },
        {
            organizationId: orgActive,
            storeId: storeActive,
            status: "draft",
            grandTotal: 999,
            committedAt: null,
        },
        {
            organizationId: orgInactive,
            storeId: storeQuiet,
            status: "voided",
            grandTotal: 888,
            committedAt: new Date("2026-08-20T10:00:00.000Z"),
        },
    ];
    const payments: ReportingPayment[] = [
        { amount: 100 },
        { amount: 20 },
        { amount: 40 },
    ];

    return { organizations, stores, customers, sales, payments };
};

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
    const facts = platformFacts();
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
    const reportingService = createPlatformReportingService({
        repository: {
            getDashboardMetrics: createReportingMetrics(
                facts.organizations,
                facts.stores,
                facts.customers,
                facts.sales,
                facts.payments,
            ),
            listOrganizations: async () => ({ organizations: [], totalCount: 0 }),
        },
        now: () => now,
    });
    const app = new Hono().route("/platform", createPlatformRoutes(authService, undefined, reportingService));

    return {
        app,
        setOwnerActive: (isActive: boolean) => {
            owner = { ...owner, isActive, updatedAt: new Date().toISOString() };
        },
    };
};

const cookieFrom = (response: Response) => response.headers.get("set-cookie")?.split(";")[0] ?? "";

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

const dashboard = (app: Hono, cookie: string, query = "") =>
    app.request(`/platform/dashboard${query}`, { headers: { cookie } });

describe("Platform dashboard metrics API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns reporting data only to an active Owner User", async () => {
        const { app, setOwnerActive } = await createHarness();
        const customerToken = await sign(
            { id: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const deviceToken = await sign(
            { deviceId: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 },
            "customer-and-device-secret",
        );
        const ownerCookie = cookieFrom(await passwordLogin(app));

        expect((await app.request("/platform/dashboard")).status).toBe(401);
        expect((await app.request("/platform/dashboard", { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);
        expect((await app.request("/platform/dashboard", { headers: { authorization: `Bearer ${deviceToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await dashboard(app, ownerCookie)).status).toBe(401);
    });

    test("counts all-time Organizations, Stores, Customer records, and completed Sales only", async () => {
        const { app } = await createHarness();
        const response = await dashboard(app, cookieFrom(await passwordLogin(app)));
        const body = await response.json() as ServiceResponse<PlatformDashboardResponse>;

        expect(response.status).toBe(200);
        expect(body.data?.allTime).toEqual({
            organizationCount: 4,
            storeCount: 4,
            customerCount: 2,
            completedSaleCount: 8,
        });
    });

    test("treats Active Store and Active Organization from completed Sales in the preceding seven Asia/Kolkata days", async () => {
        const { app } = await createHarness();
        const sevenDay = await dashboard(app, cookieFrom(await passwordLogin(app)), "?period=7d");
        const ninetyDay = await dashboard(app, cookieFrom(await passwordLogin(app)), "?period=90d");
        const sevenDayBody = await sevenDay.json() as ServiceResponse<PlatformDashboardResponse>;
        const ninetyDayBody = await ninetyDay.json() as ServiceResponse<PlatformDashboardResponse>;

        expect(sevenDayBody.data?.activity).toEqual({
            activeOrganizationCount: 2,
            activeStoreCount: 2,
        });
        expect(ninetyDayBody.data?.activity).toEqual(sevenDayBody.data?.activity);
        expect(sevenDayBody.data?.reportingPeriod.selection).toBe("7d");
        expect(ninetyDayBody.data?.reportingPeriodMetrics.completedSaleCount).not.toBe(
            sevenDayBody.data?.reportingPeriodMetrics.completedSaleCount,
        );
    });

    test("uses completed-Sale grand_total for Completed Sales Value and ignores drafts, voids, and Payments", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const sevenDay = await dashboard(app, cookie, "?period=7d");
        const allTime = await dashboard(app, cookie, "?period=all-time");
        const sevenDayBody = await sevenDay.json() as ServiceResponse<PlatformDashboardResponse>;
        const allTimeBody = await allTime.json() as ServiceResponse<PlatformDashboardResponse>;

        expect(sevenDayBody.data?.reportingPeriodMetrics).toEqual({
            completedSaleCount: 5,
            completedSalesValue: 200.75,
            customerCount: 1,
        });
        expect(allTimeBody.data?.reportingPeriodMetrics).toEqual({
            completedSaleCount: 8,
            completedSalesValue: 263.75,
            customerCount: 2,
        });
        expect(sevenDayBody.data?.reportingPeriodMetrics.completedSalesValue).not.toBe(160);
    });

    test("includes a completed Sale at the inclusive Asia/Kolkata start and excludes the exclusive end", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const startDay = await dashboard(app, cookie, "?period=custom&startDate=2026-08-15&endDate=2026-08-15");
        const beforeStart = await dashboard(app, cookie, "?period=custom&startDate=2026-08-14&endDate=2026-08-14");
        const startDayBody = await startDay.json() as ServiceResponse<PlatformDashboardResponse>;
        const beforeStartBody = await beforeStart.json() as ServiceResponse<PlatformDashboardResponse>;

        expect(startDay.status).toBe(200);
        expect(startDayBody.data?.reportingPeriodMetrics).toEqual({
            completedSaleCount: 1,
            completedSalesValue: 10,
            customerCount: 0,
        });
        expect(beforeStartBody.data?.reportingPeriodMetrics).toEqual({
            completedSaleCount: 1,
            completedSalesValue: 12,
            customerCount: 0,
        });
    });

    test("returns zeros for an empty Platform Reporting Period without error", async () => {
        const { app } = await createHarness();
        const response = await dashboard(
            app,
            cookieFrom(await passwordLogin(app)),
            "?period=custom&startDate=2026-08-02&endDate=2026-08-03",
        );
        const body = await response.json() as ServiceResponse<PlatformDashboardResponse>;

        expect(response.status).toBe(200);
        expect(body.data?.reportingPeriodMetrics).toEqual({
            completedSaleCount: 0,
            completedSalesValue: 0,
            customerCount: 0,
        });
        expect(body.data?.allTime.organizationCount).toBe(4);
        expect(body.data?.activity.activeStoreCount).toBe(2);
    });

    test("rejects malformed, inverted, and future-invalid custom Platform Reporting Periods", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));

        const malformed = await dashboard(app, cookie, "?period=custom&startDate=21-08-2026&endDate=2026-08-21");
        const inverted = await dashboard(app, cookie, "?period=custom&startDate=2026-08-21&endDate=2026-08-01");
        const future = await dashboard(app, cookie, "?period=custom&startDate=2026-08-21&endDate=2026-08-22");
        const futureBody = await future.json() as { message: string };

        expect(malformed.status).toBe(400);
        expect(inverted.status).toBe(400);
        expect(future.status).toBe(400);
        expect(futureBody.message).toBe(FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE);
    });
});
