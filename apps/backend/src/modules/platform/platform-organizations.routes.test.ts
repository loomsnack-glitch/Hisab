import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import {
    FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE,
    type OwnerUserRecord,
    type PlatformOrganizationListItemDTO,
    type PlatformOrganizationListResponse,
    type ServiceResponse,
} from "@repo/types";

import { createOwnerAuthService, createOwnerTokenProvider } from "./owner-auth.service";
import { createPlatformReportingService } from "./platform-reporting.service";
import type {
    PlatformDashboardMetrics,
    PlatformDashboardMetricsQuery,
    PlatformOrganizationListMetrics,
    PlatformOrganizationListMetricsQuery,
} from "./platform-reporting.repository";
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

type ReportingOrganization = {
    id: string;
    name: string;
    username: string;
    creator: { firstName: string; lastName: string; phone: string };
};

type ReportingSale = {
    organizationId: string;
    storeId: string;
    status: SaleStatus;
    grandTotal: number;
    committedAt: Date | null;
};

type ReportingCustomer = {
    organizationId: string;
    isActive: boolean;
    createdAt: Date;
};

const inWindow = (value: Date | null, startAt: Date | null, endAt: Date | null) => {
    if (!value) return false;
    if (startAt && value.getTime() < startAt.getTime()) return false;
    if (endAt && value.getTime() >= endAt.getTime()) return false;
    return true;
};

const byNameThenUsernameThenId = (left: ReportingOrganization, right: ReportingOrganization) =>
    left.name.localeCompare(right.name) || left.username.localeCompare(right.username) || left.id.localeCompare(right.id);

const createReportingMetrics = (
    organizations: ReportingOrganization[],
    stores: Array<{ id: string; organizationId: string }>,
    customers: ReportingCustomer[],
    sales: ReportingSale[],
) => {
    const listOrganizations = async (
        query: PlatformOrganizationListMetricsQuery,
    ): Promise<PlatformOrganizationListMetrics> => {
        const completedSales = sales.filter((sale) => sale.status === "completed");
        const activeStoreIds = new Set(
            completedSales
                .filter((sale) => inWindow(sale.committedAt, query.activityStartAt, query.activityEndAt))
                .map((sale) => sale.storeId),
        );
        const search = query.search.trim().toLowerCase();
        const rows = [...organizations]
            .sort(byNameThenUsernameThenId)
            .map((organization) => {
                const organizationStores = stores.filter((store) => store.organizationId === organization.id);
                const organizationSales = completedSales.filter((sale) => sale.organizationId === organization.id);
                const periodSales = organizationSales.filter((sale) =>
                    inWindow(sale.committedAt, query.periodStartAt, query.periodEndAt),
                );
                const lastCompletedSale = organizationSales.reduce<Date | null>((latest, sale) => {
                    if (!sale.committedAt) return latest;
                    if (!latest || sale.committedAt.getTime() > latest.getTime()) return sale.committedAt;
                    return latest;
                }, null);
                const activeStoreCount = organizationStores.filter((store) => activeStoreIds.has(store.id)).length;
                return {
                    id: organization.id,
                    name: organization.name,
                    username: organization.username,
                    isActive: activeStoreCount > 0,
                    creatorFirstName: organization.creator.firstName,
                    creatorLastName: organization.creator.lastName,
                    creatorPhone: organization.creator.phone,
                    storeCount: organizationStores.length,
                    activeStoreCount,
                    customerCount: customers.filter((customer) => customer.organizationId === organization.id).length,
                    completedSaleCount: periodSales.length,
                    completedSalesValue: periodSales.reduce((sum, sale) => sum + sale.grandTotal, 0),
                    lastCompletedSaleAt: lastCompletedSale?.toISOString() ?? null,
                };
            })
            .filter((organization) => {
                if (search && !organization.name.toLowerCase().includes(search) && !organization.username.toLowerCase().includes(search)) {
                    return false;
                }
                if (query.activity === "active") return organization.isActive;
                if (query.activity === "inactive") return !organization.isActive;
                return true;
            });

        const start = (query.page - 1) * query.limit;
        return {
            totalCount: rows.length,
            organizations: rows.slice(start, start + query.limit),
        };
    };

    const getDashboardMetrics = async (query: PlatformDashboardMetricsQuery): Promise<PlatformDashboardMetrics> => {
        const listed = await listOrganizations({
            ...query,
            search: "",
            activity: "all",
            page: 1,
            limit: organizations.length || 1,
        });
        return {
            organizationCount: listed.totalCount,
            storeCount: stores.length,
            customerCount: customers.length,
            completedSaleCount: sales.filter((sale) => sale.status === "completed").length,
            activeOrganizationCount: listed.organizations.filter((organization) => organization.isActive).length,
            activeStoreCount: listed.organizations.reduce((sum, organization) => sum + organization.activeStoreCount, 0),
            periodCompletedSaleCount: listed.organizations.reduce((sum, organization) => sum + organization.completedSaleCount, 0),
            periodCompletedSalesValue: listed.organizations.reduce((sum, organization) => sum + organization.completedSalesValue, 0),
            periodCustomerCount: customers.filter((customer) => inWindow(customer.createdAt, query.periodStartAt, query.periodEndAt)).length,
        };
    };

    return { getDashboardMetrics, listOrganizations };
};

const platformFacts = () => {
    const organizations: ReportingOrganization[] = [
        {
            id: orgActive,
            name: "Active Cafe",
            username: "active-cafe",
            creator: { firstName: "Kiran", lastName: "Patel", phone: "+919800000001" },
        },
        {
            id: orgInactive,
            name: "Quiet Mart",
            username: "quiet-mart",
            creator: { firstName: "Leela", lastName: "Nair", phone: "+919800000002" },
        },
        {
            id: orgMixed,
            name: "Mixed Bistro",
            username: "mixed-bistro",
            creator: { firstName: "Omar", lastName: "Khan", phone: "+919800000003" },
        },
        {
            id: orgNoStores,
            name: "New Stand",
            username: "new-stand",
            creator: { firstName: "Priya", lastName: "Shah", phone: "+919800000004" },
        },
    ];
    const stores = [
        { id: storeActive, organizationId: orgActive },
        { id: storeQuiet, organizationId: orgInactive },
        { id: storeMixedActive, organizationId: orgMixed },
        { id: storeMixedQuiet, organizationId: orgMixed },
    ];
    const customers: ReportingCustomer[] = [
        { organizationId: orgActive, isActive: true, createdAt: new Date("2026-01-15T10:00:00.000Z") },
        { organizationId: orgActive, isActive: false, createdAt: new Date("2026-08-20T10:00:00.000Z") },
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

    return { organizations, stores, customers, sales };
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
        repository: createReportingMetrics(facts.organizations, facts.stores, facts.customers, facts.sales),
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

const organizations = (app: Hono, cookie: string, query = "") =>
    app.request(`/platform/organizations${query}`, { headers: { cookie } });

const names = (rows: PlatformOrganizationListItemDTO[] | undefined) => rows?.map((row) => row.name);

describe("Platform Organization outreach list API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization adoption data only to an active Owner User", async () => {
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

        expect((await app.request("/platform/organizations")).status).toBe(401);
        expect((await app.request("/platform/organizations", { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);
        expect((await app.request("/platform/organizations", { headers: { authorization: `Bearer ${deviceToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizations(app, ownerCookie)).status).toBe(401);
    });

    test("returns identity, creator contact, adoption counts, and last completed Sale in a stable order", async () => {
        const { app } = await createHarness();
        const response = await organizations(app, cookieFrom(await passwordLogin(app)));
        const body = await response.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const rows = body.data?.organizations ?? [];

        expect(response.status).toBe(200);
        expect(names(rows)).toEqual(["Active Cafe", "Mixed Bistro", "New Stand", "Quiet Mart"]);
        expect(rows.map((row) => ({
            username: row.username,
            isActive: row.isActive,
            creator: row.creator,
            storeCount: row.storeCount,
            activeStoreCount: row.activeStoreCount,
            customerCount: row.customerCount,
            completedSaleCount: row.completedSaleCount,
            completedSalesValue: row.completedSalesValue,
            lastCompletedSaleAt: row.lastCompletedSaleAt,
        }))).toEqual([
            {
                username: "active-cafe",
                isActive: true,
                creator: { firstName: "Kiran", lastName: "Patel", phone: "+919800000001" },
                storeCount: 1,
                activeStoreCount: 1,
                customerCount: 2,
                completedSaleCount: 5,
                completedSalesValue: 161.25,
                lastCompletedSaleAt: "2026-08-21T18:30:00.000Z",
            },
            {
                username: "mixed-bistro",
                isActive: true,
                creator: { firstName: "Omar", lastName: "Khan", phone: "+919800000003" },
                storeCount: 2,
                activeStoreCount: 1,
                customerCount: 0,
                completedSaleCount: 1,
                completedSalesValue: 50.5,
                lastCompletedSaleAt: "2026-08-19T10:00:00.000Z",
            },
            {
                username: "new-stand",
                isActive: false,
                creator: { firstName: "Priya", lastName: "Shah", phone: "+919800000004" },
                storeCount: 0,
                activeStoreCount: 0,
                customerCount: 0,
                completedSaleCount: 0,
                completedSalesValue: 0,
                lastCompletedSaleAt: null,
            },
            {
                username: "quiet-mart",
                isActive: false,
                creator: { firstName: "Leela", lastName: "Nair", phone: "+919800000002" },
                storeCount: 1,
                activeStoreCount: 0,
                customerCount: 0,
                completedSaleCount: 2,
                completedSalesValue: 52,
                lastCompletedSaleAt: "2026-08-14T18:29:59.000Z",
            },
        ]);
        expect(JSON.stringify(body.data)).not.toContain("999");
        expect(JSON.stringify(body.data)).not.toContain("888");
        expect(JSON.stringify(body.data)).not.toContain("deviceSecret");
        expect(body.data?.pagination).toEqual({ page: 1, limit: 20, totalCount: 4 });
    });

    test("keeps Active Organization on the seven-day window while selected-period metrics change", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const allTime = await organizations(app, cookie, "?period=all-time");
        const sevenDay = await organizations(app, cookie, "?period=7d");
        const allTimeBody = await allTime.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const sevenDayBody = await sevenDay.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const allTimeByName = Object.fromEntries((allTimeBody.data?.organizations ?? []).map((row) => [row.name, row]));
        const sevenDayByName = Object.fromEntries((sevenDayBody.data?.organizations ?? []).map((row) => [row.name, row]));

        expect(sevenDayBody.data?.reportingPeriod.selection).toBe("7d");
        expect(sevenDayByName["Active Cafe"]?.isActive).toBe(true);
        expect(sevenDayByName["Quiet Mart"]?.isActive).toBe(false);
        expect(sevenDayByName["New Stand"]?.isActive).toBe(false);
        expect(sevenDayByName["Active Cafe"]?.activeStoreCount).toBe(allTimeByName["Active Cafe"]?.activeStoreCount);
        expect(sevenDayByName["Active Cafe"]?.customerCount).toBe(2);
        expect(sevenDayByName["Active Cafe"]?.completedSaleCount).toBe(4);
        expect(sevenDayByName["Active Cafe"]?.completedSalesValue).toBe(150.25);
        expect(allTimeByName["Active Cafe"]?.completedSaleCount).toBe(5);
        expect(sevenDayByName["Quiet Mart"]?.completedSaleCount).toBe(0);
        expect(allTimeByName["Quiet Mart"]?.completedSaleCount).toBe(2);
        expect(sevenDayByName["Active Cafe"]?.lastCompletedSaleAt).toBe(allTimeByName["Active Cafe"]?.lastCompletedSaleAt);
    });

    test("filters inactive outreach to Organizations with no Store and formerly active Organizations", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const inactive = await organizations(app, cookie, "?activity=inactive&period=90d");
        const active = await organizations(app, cookie, "?activity=active&period=90d");
        const inactiveBody = await inactive.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const activeBody = await active.json() as ServiceResponse<PlatformOrganizationListResponse>;

        expect(names(inactiveBody.data?.organizations)).toEqual(["New Stand", "Quiet Mart"]);
        expect(inactiveBody.data?.organizations.every((row) => row.isActive === false)).toBe(true);
        expect(names(activeBody.data?.organizations)).toEqual(["Active Cafe", "Mixed Bistro"]);
        expect(activeBody.data?.reportingPeriod.selection).toBe("90d");
        expect(inactiveBody.data?.organizations.find((row) => row.name === "Quiet Mart")?.completedSaleCount).toBe(2);
    });

    test("searches by Organization name or username and paginates in the same order", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const byName = await organizations(app, cookie, "?search=Cafe");
        const byUsername = await organizations(app, cookie, "?search=new-stand");
        const pageOne = await organizations(app, cookie, "?limit=2&page=1");
        const pageTwo = await organizations(app, cookie, "?limit=2&page=2");
        const empty = await organizations(app, cookie, "?search=zzzz");
        const byNameBody = await byName.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const byUsernameBody = await byUsername.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const pageOneBody = await pageOne.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const pageTwoBody = await pageTwo.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const emptyBody = await empty.json() as ServiceResponse<PlatformOrganizationListResponse>;

        expect(names(byNameBody.data?.organizations)).toEqual(["Active Cafe"]);
        expect(names(byUsernameBody.data?.organizations)).toEqual(["New Stand"]);
        expect(names(pageOneBody.data?.organizations)).toEqual(["Active Cafe", "Mixed Bistro"]);
        expect(names(pageTwoBody.data?.organizations)).toEqual(["New Stand", "Quiet Mart"]);
        expect(pageOneBody.data?.pagination).toEqual({ page: 1, limit: 2, totalCount: 4 });
        expect(pageTwoBody.data?.pagination).toEqual({ page: 2, limit: 2, totalCount: 4 });
        expect(emptyBody.data?.organizations).toEqual([]);
        expect(emptyBody.data?.pagination.totalCount).toBe(0);
    });

    test("rejects malformed pagination and future-invalid custom Platform Reporting Periods", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));

        const badPage = await organizations(app, cookie, "?page=0");
        const inverted = await organizations(app, cookie, "?period=custom&startDate=2026-08-21&endDate=2026-08-01");
        const future = await organizations(app, cookie, "?period=custom&startDate=2026-08-21&endDate=2026-08-22");
        const futureBody = await future.json() as { message: string };

        expect(badPage.status).toBe(400);
        expect(inverted.status).toBe(400);
        expect(future.status).toBe(400);
        expect(futureBody.message).toBe(FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE);
    });
});
