import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { STATUS_CODES } from "@repo/types";
import type { DeviceSessionDTO } from "@repo/types";
import {
    ensureFeatureEntitlementMock,
    resolveFeatureEntitlement,
} from "./feature-entitlement.test-harness";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const entitledStoreId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const unentitledStoreId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const productId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const deviceId = "17171717-1717-4171-8171-171717171717";
const organization = { id: organizationId, name: "Demo Org" };

const buildDeviceSession = (storeId: string): DeviceSessionDTO => ({
    device: {
        id: deviceId,
        organizationId,
        storeId,
        name: "Counter",
        loginUsername: "counter",
        status: "active",
        lastSeenAt: null,
    },
    store: {
        id: storeId,
        organizationId,
        name: storeId === entitledStoreId ? "Adajan" : "Vesu",
        address: null,
        kotSystemEnabled: true,
        tableManagementEnabled: true,
        moneyAccountTrackingEnabled: false,
    },
    organization: { ...organization, username: "demo", tagline: null },
});

mock.module("@/config/db", () => ({
    pg: {
        begin: async <T>(callback: (tx: unknown) => Promise<T>) => callback({}),
    },
}));

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser: mock(async () => organization),
    getOrganizationById: mock(async () => organization),
    getStoreById: mock(async (_organizationId: string, storeId: string) => ({
        id: storeId,
        organizationId,
        name: storeId === entitledStoreId ? "Adajan" : "Vesu",
        kotSystemEnabled: true,
        tableManagementEnabled: true,
        moneyAccountTrackingEnabled: false,
    })),
    getStoresByOrganizationId: mock(async () => [
        { id: entitledStoreId, organizationId, name: "Adajan" },
        { id: unentitledStoreId, organizationId, name: "Vesu" },
    ]),
}));

mock.module("@/modules/tenant/billing/billing.repository", () => ({
    createSale: mock(async () => null),
    createSaleItem: mock(async () => null),
    createSaleItemAddOn: mock(async () => null),
    getSaleById: mock(async () => null),
    getSaleItemsBySaleId: mock(async () => []),
    getPaymentsBySaleId: mock(async () => []),
    getSaleIdByCompletionRequestId: mock(async () => null),
    getCustomersByOrganizationId: mock(async () => ({
        customers: [],
        pageInfo: { hasMore: false, nextCursor: null },
    })),
    customerPhoneExistsInOrganization: mock(async () => false),
    getSalesByStore: mock(async () => ({
        sales: [],
        pageInfo: { hasMore: false, nextCursor: null },
    })),
    getSalesSummaryByStore: mock(async () => ({
        completedCount: 0,
        salesTotal: 0,
        collectedTotal: 0,
        dueTotal: 0,
    })),
}));

mock.module("@/modules/tenant/catalog/catalog.repository", () => ({
    getProductById: mock(async () => ({
        id: productId,
        organizationId,
        categoryId: "11111111-1111-4111-8111-111111111111",
        name: "Burger",
        price: 100,
        discount: 0,
        productType: "single",
        unitId: "98989898-9898-4989-8989-989898989898",
        defaultSellingQuantity: 1,
        allowCustomSellingQuantity: false,
        unitLabel: "pc",
        status: "active",
    })),
    getSelectableAddOnAttachmentsByProductId: mock(async () => []),
    getStoreProductOfferingByProductAndStore: mock(async (_organizationId: string, storeId: string) => ({
        id: "0ffeeeee-0000-4000-8000-dddddddddddd",
        organizationId,
        storeId,
        productId,
        price: 100,
        discount: 0,
        status: "active",
        createdBy: "11111111-1111-4111-8111-111111111111",
        updatedBy: null,
        createdAt: new Date("2026-09-06T00:00:00.000Z"),
        updatedAt: new Date("2026-09-06T00:00:00.000Z"),
    })),
}));

await ensureFeatureEntitlementMock();

const billingService = await import("@/modules/tenant/billing/billing.service");

describe("POS billing Feature Entitlement enforcement", () => {
    beforeEach(() => {
        resolveFeatureEntitlement.mockClear();
        resolveFeatureEntitlement.mockImplementation(async (storeId, featureKey) => ({
            entitled: storeId === entitledStoreId,
            featureKey,
            evidence: [],
        }));
    });

    afterEach(() => {
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: true,
            featureKey,
            evidence: [],
        }));
    });

    test("forbids POS billing writes for an unentitled Store", async () => {
        const response = await billingService.completeSaleForDevice(
            buildDeviceSession(unentitledStoreId),
            {
                requestId: "19191919-1919-4191-8191-191919191919",
                items: [{ productId, quantity: 1, addOns: [] }],
                payments: [{ amount: 100, paymentMethod: "cash" }],
            },
        );

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("Billing");
    });

    test("allows POS billing reads for an entitled Store", async () => {
        const response = await billingService.getSalesForDevice(
            buildDeviceSession(entitledStoreId),
            { limit: 10 },
        );

        expect(response.code).toBe(STATUS_CODES.SUCCESS);
    });

    test("forbids standalone KOT generation without kot_system entitlement even when enabled operationally", async () => {
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: featureKey === "billing",
            featureKey,
            evidence: [],
        }));

        const response = await billingService.createDraftSaleForDevice(
            buildDeviceSession(entitledStoreId),
            {
                items: [{ productId, quantity: 1, addOns: [] }],
                generateKot: true,
                kotBatchItems: [{ productId, quantity: 1, addOns: [] }],
                kotRequestId: "28282828-2828-4282-8282-282828282828",
            },
        );

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("KOT System");
    });

    test("isolates commercial access between Stores in one Organization", async () => {
        const entitled = await billingService.getSalesForDevice(
            buildDeviceSession(entitledStoreId),
            { limit: 5 },
        );
        const unentitled = await billingService.getSalesForDevice(
            buildDeviceSession(unentitledStoreId),
            { limit: 5 },
        );

        expect(entitled.code).toBe(STATUS_CODES.SUCCESS);
        expect(unentitled.code).toBe(STATUS_CODES.FORBIDDEN);
    });

    test("denies billing after migration access expires", async () => {
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: false,
            featureKey,
            evidence: [],
        }));

        const response = await billingService.getSalesForDevice(
            buildDeviceSession(entitledStoreId),
            { limit: 5 },
        );

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("Review commercial access");
    });
});
