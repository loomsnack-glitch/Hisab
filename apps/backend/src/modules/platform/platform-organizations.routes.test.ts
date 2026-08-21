import { beforeEach, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import {
    FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE,
    type OwnerUserRecord,
    type PlatformOrganizationDetailResponse,
    type PlatformOrganizationListItemDTO,
    type PlatformOrganizationListResponse,
    type ServiceResponse,
} from "@repo/types";

import { createOwnerAuthService, createOwnerTokenProvider } from "./owner-auth.service";
import { createPlatformReportingService } from "./platform-reporting.service";
import type {
    PlatformDashboardMetrics,
    PlatformDashboardMetricsQuery,
    PlatformOrganizationDetailMetrics,
    PlatformOrganizationDetailMetricsQuery,
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
const missingOrganizationId = "99999999-9999-4999-8999-999999999999";
const saleMixedCompleted = "b1111111-1111-4111-8111-b11111111111";
const saleQuietOld = "b2222222-2222-4222-8222-b22222222222";
const saleQuietRecent = "b3333333-3333-4333-8333-b33333333333";
const saleQuietVoided = "b4444444-4444-4444-8444-b44444444444";
const saleCafeDraft = "b5555555-5555-4555-8555-b55555555555";
const customerCafeActive = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaa1";
const customerCafeInactive = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaa2";

type SaleStatus = "draft" | "completed" | "voided";

type ReportingOrganization = {
    id: string;
    name: string;
    username: string;
    creator: { firstName: string; lastName: string; phone: string };
};

type ReportingSale = {
    id: string;
    organizationId: string;
    storeId: string;
    status: SaleStatus;
    grandTotal: number;
    committedAt: Date | null;
    customerId?: string | null;
    saleNumber?: string | null;
    updatedAt?: Date;
};

type ReportingCustomer = {
    id?: string;
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
    stores: Array<{ id: string; organizationId: string; name: string }>,
    customers: ReportingCustomer[],
    sales: ReportingSale[],
) => {
    const organizationRow = (
        query: PlatformDashboardMetricsQuery,
        organization: ReportingOrganization,
    ) => {
        const completedSales = sales.filter((sale) => sale.status === "completed");
        const activeStoreIds = new Set(
            completedSales
                .filter((sale) => inWindow(sale.committedAt, query.activityStartAt, query.activityEndAt))
                .map((sale) => sale.storeId),
        );
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
    };

    const listOrganizations = async (
        query: PlatformOrganizationListMetricsQuery,
    ): Promise<PlatformOrganizationListMetrics> => {
        const search = query.search.trim().toLowerCase();
        const rows = organizations
            .map((organization) => organizationRow(query, organization))
            .filter((organization) => {
                const haystack = [
                    organization.name,
                    organization.username,
                    organization.creatorFirstName,
                    organization.creatorLastName,
                    `${organization.creatorFirstName} ${organization.creatorLastName}`,
                    organization.creatorPhone,
                ].join(" ").toLowerCase();
                if (search && !haystack.includes(search)) return false;
                if (query.activity === "active") return organization.isActive;
                if (query.activity === "inactive") return !organization.isActive;
                return true;
            })
            .sort((left, right) => {
                const byName = byNameThenUsernameThenId(left, right);
                if (query.sort === "name_asc") return byName;
                if (query.sort === "name_desc") {
                    return right.name.localeCompare(left.name)
                        || left.username.localeCompare(right.username)
                        || left.id.localeCompare(right.id);
                }
                if (query.sort === "sales_value_desc" || query.sort === "sales_value_asc") {
                    const diff = query.sort === "sales_value_desc"
                        ? right.completedSalesValue - left.completedSalesValue
                        : left.completedSalesValue - right.completedSalesValue;
                    return diff !== 0 ? diff : byName;
                }
                const leftSaleAt = left.lastCompletedSaleAt ? Date.parse(left.lastCompletedSaleAt) : Number.NEGATIVE_INFINITY;
                const rightSaleAt = right.lastCompletedSaleAt ? Date.parse(right.lastCompletedSaleAt) : Number.NEGATIVE_INFINITY;
                const diff = rightSaleAt - leftSaleAt;
                return diff !== 0 ? diff : byName;
            });

        const start = (query.page - 1) * query.limit;
        return {
            totalCount: rows.length,
            organizations: rows.slice(start, start + query.limit),
        };
    };

    const getOrganizationDetail = async (
        query: PlatformOrganizationDetailMetricsQuery,
    ): Promise<PlatformOrganizationDetailMetrics | null> => {
        const organization = organizations.find((item) => item.id === query.organizationId);
        if (!organization) return null;

        const completedSales = sales.filter((sale) => sale.status === "completed");
        const activeStoreIds = new Set(
            completedSales
                .filter((sale) => inWindow(sale.committedAt, query.activityStartAt, query.activityEndAt))
                .map((sale) => sale.storeId),
        );
        const organizationStores = stores
            .filter((store) => store.organizationId === organization.id)
            .slice()
            .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
        const recentSales = sales
            .filter((sale) => sale.organizationId === organization.id)
            .map((sale) => {
                const store = stores.find((item) => item.id === sale.storeId);
                const occurredAt = sale.committedAt ?? sale.updatedAt ?? new Date(0);
                return {
                    id: sale.id,
                    saleNumber: sale.saleNumber ?? null,
                    status: sale.status,
                    grandTotal: sale.grandTotal,
                    occurredAt: occurredAt.toISOString(),
                    storeId: sale.storeId,
                    storeName: store?.name ?? "",
                    sortAt: occurredAt.getTime(),
                };
            })
            .sort((left, right) => right.sortAt - left.sortAt || right.id.localeCompare(left.id))
            .slice(0, 10)
            .map(({ sortAt: _sortAt, ...sale }) => sale);

        return {
            ...organizationRow(query, organization),
            stores: organizationStores.map((store) => {
                const storeSales = completedSales.filter((sale) => sale.storeId === store.id);
                const periodSales = storeSales.filter((sale) =>
                    inWindow(sale.committedAt, query.periodStartAt, query.periodEndAt),
                );
                const lastCompletedSale = storeSales.reduce<Date | null>((latest, sale) => {
                    if (!sale.committedAt) return latest;
                    if (!latest || sale.committedAt.getTime() > latest.getTime()) return sale.committedAt;
                    return latest;
                }, null);
                const billedCustomerIds = new Set(
                    storeSales
                        .map((sale) => sale.customerId)
                        .filter((customerId): customerId is string => Boolean(customerId)),
                );
                return {
                    id: store.id,
                    name: store.name,
                    isActive: activeStoreIds.has(store.id),
                    customerCount: billedCustomerIds.size,
                    completedSaleCount: periodSales.length,
                    completedSalesValue: periodSales.reduce((sum, sale) => sum + sale.grandTotal, 0),
                    lastCompletedSaleAt: lastCompletedSale?.toISOString() ?? null,
                };
            }),
            recentSales,
        };
    };

    const getDashboardMetrics = async (query: PlatformDashboardMetricsQuery): Promise<PlatformDashboardMetrics> => {
        const listed = await listOrganizations({
            ...query,
            search: "",
            activity: "all",
            sort: "recent_activity",
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

    return { getDashboardMetrics, listOrganizations, getOrganizationDetail };
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
        { id: storeActive, organizationId: orgActive, name: "Cafe Counter" },
        { id: storeQuiet, organizationId: orgInactive, name: "Quiet Aisle" },
        { id: storeMixedActive, organizationId: orgMixed, name: "Front Hall" },
        { id: storeMixedQuiet, organizationId: orgMixed, name: "Garden Patio" },
    ];
    const customers: ReportingCustomer[] = [
        { id: customerCafeActive, organizationId: orgActive, isActive: true, createdAt: new Date("2026-01-15T10:00:00.000Z") },
        { id: customerCafeInactive, organizationId: orgActive, isActive: false, createdAt: new Date("2026-08-20T10:00:00.000Z") },
    ];
    const sales: ReportingSale[] = [
        {
            id: "c1111111-1111-4111-8111-c11111111111",
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            saleNumber: "1",
            grandTotal: 10,
            committedAt: new Date("2026-08-14T18:30:00.000Z"),
            customerId: customerCafeActive,
        },
        {
            id: saleQuietRecent,
            organizationId: orgInactive,
            storeId: storeQuiet,
            status: "completed",
            saleNumber: "1",
            grandTotal: 12,
            committedAt: new Date("2026-08-14T18:29:59.000Z"),
        },
        {
            id: "c2222222-2222-4222-8222-c22222222222",
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            saleNumber: "2",
            grandTotal: 11,
            committedAt: new Date("2026-08-21T18:30:00.000Z"),
            customerId: customerCafeActive,
        },
        {
            id: "c3333333-3333-4333-8333-c33333333333",
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            saleNumber: "3",
            grandTotal: 15,
            committedAt: new Date("2026-08-21T18:29:59.000Z"),
            customerId: customerCafeInactive,
        },
        {
            id: "c4444444-4444-4444-8444-c44444444444",
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            saleNumber: "4",
            grandTotal: 100,
            committedAt: new Date("2026-08-18T10:00:00.000Z"),
            customerId: customerCafeActive,
        },
        {
            id: saleMixedCompleted,
            organizationId: orgMixed,
            storeId: storeMixedActive,
            status: "completed",
            saleNumber: "12",
            grandTotal: 50.5,
            committedAt: new Date("2026-08-19T10:00:00.000Z"),
        },
        {
            id: "c5555555-5555-4555-8555-c55555555555",
            organizationId: orgActive,
            storeId: storeActive,
            status: "completed",
            saleNumber: "5",
            grandTotal: 25.25,
            committedAt: new Date("2026-08-20T10:00:00.000Z"),
            customerId: customerCafeInactive,
        },
        {
            id: saleQuietOld,
            organizationId: orgInactive,
            storeId: storeQuiet,
            status: "completed",
            saleNumber: "2",
            grandTotal: 40,
            committedAt: new Date("2026-08-01T10:00:00.000Z"),
        },
        {
            id: saleCafeDraft,
            organizationId: orgActive,
            storeId: storeActive,
            status: "draft",
            saleNumber: null,
            grandTotal: 999,
            committedAt: null,
            updatedAt: new Date("2026-08-21T19:00:00.000Z"),
            customerId: customerCafeActive,
        },
        {
            id: saleQuietVoided,
            organizationId: orgInactive,
            storeId: storeQuiet,
            status: "voided",
            saleNumber: "3",
            grandTotal: 888,
            committedAt: new Date("2026-08-20T10:00:00.000Z"),
            customerId: customerCafeInactive,
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

const organizationDetail = (app: Hono, cookie: string, organizationId: string, query = "") =>
    app.request(`/platform/organizations/${organizationId}${query}`, { headers: { cookie } });

const names = (rows: PlatformOrganizationListItemDTO[] | undefined) => rows?.map((row) => row.name);

describe("Platform Organization Directory API", () => {
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

    test("returns identity, creator contact, adoption counts, and last completed Sale in recency-first order", async () => {
        const { app } = await createHarness();
        const response = await organizations(app, cookieFrom(await passwordLogin(app)));
        const body = await response.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const rows = body.data?.organizations ?? [];

        expect(response.status).toBe(200);
        expect(names(rows)).toEqual(["Active Cafe", "Mixed Bistro", "Quiet Mart", "New Stand"]);
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

    test("filters inactive Organizations with no Store and formerly active Organizations", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const inactive = await organizations(app, cookie, "?activity=inactive&period=90d");
        const active = await organizations(app, cookie, "?activity=active&period=90d");
        const inactiveBody = await inactive.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const activeBody = await active.json() as ServiceResponse<PlatformOrganizationListResponse>;

        expect(names(inactiveBody.data?.organizations)).toEqual(["Quiet Mart", "New Stand"]);
        expect(inactiveBody.data?.organizations.every((row) => row.isActive === false)).toBe(true);
        expect(names(activeBody.data?.organizations)).toEqual(["Active Cafe", "Mixed Bistro"]);
        expect(activeBody.data?.reportingPeriod.selection).toBe("90d");
        expect(inactiveBody.data?.organizations.find((row) => row.name === "Quiet Mart")?.completedSaleCount).toBe(2);
    });

    test("searches by Organization identity or creator and paginates in recency-first order", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const byName = await organizations(app, cookie, "?search=Cafe");
        const byUsername = await organizations(app, cookie, "?search=new-stand");
        const byCreator = await organizations(app, cookie, "?search=Nair");
        const byCreatorPhone = await organizations(app, cookie, "?search=9800000003");
        const pageOne = await organizations(app, cookie, "?limit=2&page=1");
        const pageTwo = await organizations(app, cookie, "?limit=2&page=2");
        const empty = await organizations(app, cookie, "?search=zzzz");
        const byNameBody = await byName.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const byUsernameBody = await byUsername.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const byCreatorBody = await byCreator.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const byCreatorPhoneBody = await byCreatorPhone.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const pageOneBody = await pageOne.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const pageTwoBody = await pageTwo.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const emptyBody = await empty.json() as ServiceResponse<PlatformOrganizationListResponse>;

        expect(names(byNameBody.data?.organizations)).toEqual(["Active Cafe"]);
        expect(names(byUsernameBody.data?.organizations)).toEqual(["New Stand"]);
        expect(names(byCreatorBody.data?.organizations)).toEqual(["Quiet Mart"]);
        expect(names(byCreatorPhoneBody.data?.organizations)).toEqual(["Mixed Bistro"]);
        expect(names(pageOneBody.data?.organizations)).toEqual(["Active Cafe", "Mixed Bistro"]);
        expect(names(pageTwoBody.data?.organizations)).toEqual(["Quiet Mart", "New Stand"]);
        expect(pageOneBody.data?.pagination).toEqual({ page: 1, limit: 2, totalCount: 4 });
        expect(pageTwoBody.data?.pagination).toEqual({ page: 2, limit: 2, totalCount: 4 });
        expect(emptyBody.data?.organizations).toEqual([]);
        expect(emptyBody.data?.pagination.totalCount).toBe(0);
    });

    test("sorts the Organization Directory and rejects unknown sort values", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const byName = await organizations(app, cookie, "?sort=name_asc");
        const byNameDesc = await organizations(app, cookie, "?sort=name_desc");
        const bySalesValue = await organizations(app, cookie, "?sort=sales_value_asc");
        const unknown = await organizations(app, cookie, "?sort=newest");
        const byNameBody = await byName.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const byNameDescBody = await byNameDesc.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const bySalesValueBody = await bySalesValue.json() as ServiceResponse<PlatformOrganizationListResponse>;

        expect(names(byNameBody.data?.organizations)).toEqual(["Active Cafe", "Mixed Bistro", "New Stand", "Quiet Mart"]);
        expect(names(byNameDescBody.data?.organizations)).toEqual(["Quiet Mart", "New Stand", "Mixed Bistro", "Active Cafe"]);
        expect(names(bySalesValueBody.data?.organizations)).toEqual(["New Stand", "Mixed Bistro", "Quiet Mart", "Active Cafe"]);
        expect(unknown.status).toBe(400);
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

describe("Platform Organization drill-down API", () => {
    beforeEach(() => {
        process.env.NODE_ENV = "test";
    });

    test("returns Organization detail only to an active Owner User", async () => {
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

        expect((await app.request(`/platform/organizations/${orgMixed}`)).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}`, { headers: { authorization: `Bearer ${customerToken}` } })).status).toBe(401);
        expect((await app.request(`/platform/organizations/${orgMixed}`, { headers: { authorization: `Bearer ${deviceToken}` } })).status).toBe(401);

        setOwnerActive(false);
        expect((await organizationDetail(app, ownerCookie, orgMixed)).status).toBe(401);
    });

    test("matches list aggregates and lists mixed active and inactive Stores", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const list = await organizations(app, cookie);
        const detail = await organizationDetail(app, cookie, orgMixed);
        const listBody = await list.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const detailBody = await detail.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const listRow = listBody.data?.organizations.find((row) => row.id === orgMixed);
        const organization = detailBody.data?.organization;
        expect(organization).toBeDefined();
        if (!organization) {
            throw new Error("Expected Organization detail");
        }
        const stores = organization.stores;

        expect(detail.status).toBe(200);
        expect(organization).toMatchObject({
            id: orgMixed,
            name: "Mixed Bistro",
            username: "mixed-bistro",
            isActive: true,
            creator: { firstName: "Omar", lastName: "Khan", phone: "+919800000003" },
            storeCount: 2,
            activeStoreCount: 1,
            customerCount: 0,
            completedSaleCount: 1,
            completedSalesValue: 50.5,
            lastCompletedSaleAt: "2026-08-19T10:00:00.000Z",
        });
        expect(listRow).toMatchObject({
            isActive: organization?.isActive,
            storeCount: organization?.storeCount,
            activeStoreCount: organization?.activeStoreCount,
            customerCount: organization?.customerCount,
            completedSaleCount: organization?.completedSaleCount,
            completedSalesValue: organization?.completedSalesValue,
            lastCompletedSaleAt: organization?.lastCompletedSaleAt,
            creator: organization?.creator,
        });
        expect(stores.map((store) => store.name)).toEqual(["Front Hall", "Garden Patio"]);
        expect(stores).toEqual([
            {
                id: storeMixedActive,
                name: "Front Hall",
                isActive: true,
                customerCount: 0,
                completedSaleCount: 1,
                completedSalesValue: 50.5,
                lastCompletedSaleAt: "2026-08-19T10:00:00.000Z",
            },
            {
                id: storeMixedQuiet,
                name: "Garden Patio",
                isActive: false,
                customerCount: 0,
                completedSaleCount: 0,
                completedSalesValue: 0,
                lastCompletedSaleAt: null,
            },
        ]);
        expect(stores.filter((store) => store.isActive).length).toBe(organization.activeStoreCount);
        expect(stores.reduce((sum, store) => sum + store.completedSaleCount, 0)).toBe(organization.completedSaleCount);
        expect(stores.reduce((sum, store) => sum + store.completedSalesValue, 0)).toBe(organization.completedSalesValue);
        expect(organization.completedSaleCount).not.toBeGreaterThan(1);
        expect(JSON.stringify(detailBody.data)).not.toContain("deviceSecret");
        expect(JSON.stringify(detailBody.data)).not.toContain("password");
        expect(JSON.stringify(detailBody.data)).not.toContain("Kiran Patel");
    });

    test("keeps Store activity on the seven-day window while selected-period metrics change", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const allTime = await organizationDetail(app, cookie, orgActive, "?period=all-time");
        const sevenDay = await organizationDetail(app, cookie, orgActive, "?period=7d");
        const listSevenDay = await organizations(app, cookie, "?period=7d");
        const allTimeBody = await allTime.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const sevenDayBody = await sevenDay.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const listBody = await listSevenDay.json() as ServiceResponse<PlatformOrganizationListResponse>;
        const listRow = listBody.data?.organizations.find((row) => row.id === orgActive);
        const allTimeOrg = allTimeBody.data?.organization;
        const sevenDayOrg = sevenDayBody.data?.organization;
        const cafeStore = sevenDayOrg?.stores[0];

        expect(sevenDayBody.data?.reportingPeriod.selection).toBe("7d");
        expect(sevenDayOrg?.isActive).toBe(true);
        expect(sevenDayOrg?.activeStoreCount).toBe(allTimeOrg?.activeStoreCount);
        expect(cafeStore?.isActive).toBe(true);
        expect(cafeStore?.name).toBe("Cafe Counter");
        expect(cafeStore?.customerCount).toBe(2);
        expect(allTimeOrg?.customerCount).toBe(2);
        expect(allTimeOrg?.completedSaleCount).toBe(5);
        expect(allTimeOrg?.completedSalesValue).toBe(161.25);
        expect(sevenDayOrg?.completedSaleCount).toBe(4);
        expect(sevenDayOrg?.completedSalesValue).toBe(150.25);
        expect(cafeStore?.completedSaleCount).toBe(4);
        expect(cafeStore?.completedSalesValue).toBe(150.25);
        expect(sevenDayOrg?.lastCompletedSaleAt).toBe(allTimeOrg?.lastCompletedSaleAt);
        expect(cafeStore?.lastCompletedSaleAt).toBe(allTimeOrg?.lastCompletedSaleAt);
        expect(listRow?.completedSaleCount).toBe(sevenDayOrg?.completedSaleCount);
        expect(listRow?.completedSalesValue).toBe(sevenDayOrg?.completedSalesValue);
        expect(listRow?.isActive).toBe(sevenDayOrg?.isActive);
    });

    test("returns an empty Store list for an Organization with no Stores", async () => {
        const { app } = await createHarness();
        const detail = await organizationDetail(app, cookieFrom(await passwordLogin(app)), orgNoStores);
        const body = await detail.json() as ServiceResponse<PlatformOrganizationDetailResponse>;

        expect(detail.status).toBe(200);
        expect(body.data?.organization).toMatchObject({
            name: "New Stand",
            isActive: false,
            storeCount: 0,
            activeStoreCount: 0,
            customerCount: 0,
            completedSaleCount: 0,
            completedSalesValue: 0,
            lastCompletedSaleAt: null,
        });
        expect(body.data?.organization.stores).toEqual([]);
    });

    test("hides missing Organizations and rejects invalid ids or future-invalid periods", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const missing = await organizationDetail(app, cookie, missingOrganizationId);
        const invalid = await organizationDetail(app, cookie, "not-a-uuid");
        const future = await organizationDetail(app, cookie, orgActive, "?period=custom&startDate=2026-08-21&endDate=2026-08-22");
        const missingBody = await missing.json() as ServiceResponse<null>;
        const futureBody = await future.json() as { message: string };

        expect(missing.status).toBe(404);
        expect(missingBody.message).toBe("Organization not found");
        expect(missingBody.data).toBeNull();
        expect(JSON.stringify(missingBody)).not.toContain("Active Cafe");
        expect(JSON.stringify(missingBody)).not.toContain("Mixed Bistro");
        expect(invalid.status).toBe(400);
        expect(future.status).toBe(400);
        expect(futureBody.message).toBe(FUTURE_PLATFORM_REPORTING_PERIOD_MESSAGE);
    });

    test("returns Store-attributed recent Sales without mixing other Organizations or reusable secrets", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const mixed = await organizationDetail(app, cookie, orgMixed);
        const empty = await organizationDetail(app, cookie, orgNoStores);
        const mixedBody = await mixed.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const emptyBody = await empty.json() as ServiceResponse<PlatformOrganizationDetailResponse>;

        expect(mixedBody.data?.organization.recentSales).toEqual([
            {
                id: saleMixedCompleted,
                saleNumber: "12",
                status: "completed",
                grandTotal: 50.5,
                occurredAt: "2026-08-19T10:00:00.000Z",
                store: { id: storeMixedActive, name: "Front Hall" },
            },
        ]);
        expect(emptyBody.data?.organization.recentSales).toEqual([]);
        expect(JSON.stringify(mixedBody.data)).not.toContain("Cafe Counter");
        expect(JSON.stringify(mixedBody.data)).not.toContain("deviceSecret");
        expect(JSON.stringify(mixedBody.data)).not.toContain("password");
        expect(JSON.stringify(mixedBody.data)).not.toContain("token");
    });

    test("keeps recent Sales independent of the selected Platform Reporting Period", async () => {
        const { app } = await createHarness();
        const cookie = cookieFrom(await passwordLogin(app));
        const sevenDay = await organizationDetail(app, cookie, orgInactive, "?period=7d");
        const body = await sevenDay.json() as ServiceResponse<PlatformOrganizationDetailResponse>;
        const recentSales = body.data?.organization.recentSales ?? [];

        expect(body.data?.reportingPeriod.selection).toBe("7d");
        expect(body.data?.organization.completedSaleCount).toBe(0);
        expect(recentSales.map((sale) => sale.id)).toEqual([saleQuietVoided, saleQuietRecent, saleQuietOld]);
        expect(recentSales).toEqual([
            {
                id: saleQuietVoided,
                saleNumber: "3",
                status: "voided",
                grandTotal: 888,
                occurredAt: "2026-08-20T10:00:00.000Z",
                store: { id: storeQuiet, name: "Quiet Aisle" },
            },
            {
                id: saleQuietRecent,
                saleNumber: "1",
                status: "completed",
                grandTotal: 12,
                occurredAt: "2026-08-14T18:29:59.000Z",
                store: { id: storeQuiet, name: "Quiet Aisle" },
            },
            {
                id: saleQuietOld,
                saleNumber: "2",
                status: "completed",
                grandTotal: 40,
                occurredAt: "2026-08-01T10:00:00.000Z",
                store: { id: storeQuiet, name: "Quiet Aisle" },
            },
        ]);
        expect(recentSales.every((sale) => sale.store.name === "Quiet Aisle")).toBe(true);
    });
});
