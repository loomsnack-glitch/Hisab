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
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const deviceId = "17171717-1717-4171-8171-171717171717";
const accountId = "19191919-1919-4191-8191-191919191919";
const organization = { id: organizationId, name: "Demo Org" };

const entitledProducts = [
    {
        productId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        productName: "Cake (250g)",
        categoryName: "Bakery",
        quantitySold: 4,
    },
];

const getProductSalesSummary = mock(
    async (
        _organizationId: string,
        storeId: string | undefined,
        _query: unknown,
        entitledStoreIds?: readonly string[],
    ) => {
        if (storeId === unentitledStoreId) {
            return [{ ...entitledProducts[0], productName: "Unentitled Store Sale" }];
        }
        if (entitledStoreIds && !entitledStoreIds.includes(entitledStoreId)) {
            return [];
        }
        return entitledProducts;
    },
);

const assignAccountToStore = mock(async () => ({
    id: accountId,
    organizationId,
    provider: "cloud_api",
    status: "connected",
    phoneNumber: "+919876543210",
    displayName: "Ganatri",
    assignedStoreIds: [entitledStoreId],
    defaultStoreId: entitledStoreId,
}));

const getWhatsAppAccount = mock(async () => null);

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
        kotSystemEnabled: false,
        tableManagementEnabled: false,
        moneyAccountTrackingEnabled: false,
    },
    organization: { ...organization, username: "demo", tagline: null },
});

mock.module("@/config/db", () => ({
    pg: {
        begin: async <T>(callback: (tx: unknown) => Promise<T>) => callback({}),
    },
}));

mock.module("@/config/redis", () => ({
    redis: {
        ttl: async () => 0,
        set: async () => "OK",
    },
}));

mock.module("@/config/minio", () => ({ default: {} }));

mock.module("@/services/storage", () => ({
    generateSignedUrl: async () => "https://example.test/file",
    generateSignedUrlBeta: async () => "https://example.test/file",
    uploadBuffer: async () => {},
}));

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser: mock(async () => organization),
    getOrganizationById: mock(async () => organization),
    getStoreById: mock(async (_organizationId: string, storeId: string) => ({
        id: storeId,
        organizationId,
        name: storeId === entitledStoreId ? "Adajan" : "Vesu",
        address: null,
        whatsappLinks: [],
    })),
    getStoresByOrganizationId: mock(async () => [
        { id: entitledStoreId, organizationId, name: "Adajan" },
        { id: unentitledStoreId, organizationId, name: "Vesu" },
    ]),
}));

mock.module("@/modules/tenant/billing/billing.repository", () => ({
    getProductSalesSummary,
    getSaleById: mock(async () => null),
    getSaleItemsBySaleId: mock(async () => []),
    getPaymentsBySaleId: mock(async () => []),
    getDueSalesByCustomerStore: mock(async () => []),
    getCustomerById: mock(async () => null),
}));

mock.module("@/modules/tenant/whatsapp/whatsapp.repository", () => ({
    getAccount: getWhatsAppAccount,
    getAccountById: mock(async () => null),
    getAccountsForOrganization: mock(async () => []),
    assignAccountToStore,
    unassignAccountFromStore: mock(async () => true),
    getInvoiceOutbox: mock(async () => null),
    getCustomerReminderOutbox: mock(async () => null),
    getConversations: mock(async () => []),
    completeInvoiceOutbox: mock(async () => {}),
    retryInvoiceOutbox: mock(async () => null),
}));

await ensureFeatureEntitlementMock();

const billingService = await import("@/modules/tenant/billing/billing.service");
const whatsappService = await import("@/modules/tenant/whatsapp/whatsapp.service");

describe("Reporting Feature Entitlement enforcement", () => {
    beforeEach(() => {
        resolveFeatureEntitlement.mockClear();
        getProductSalesSummary.mockClear();
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

    test("forbids a Store-filtered report for an unentitled Store", async () => {
        const response = await billingService.getProductSalesSummary(userId, organizationId, {
            storeId: unentitledStoreId,
        });

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("Reports");
        expect(getProductSalesSummary).not.toHaveBeenCalled();
    });

    test("returns a Store-filtered report for an entitled Store sharing the Organization", async () => {
        const response = await billingService.getProductSalesSummary(userId, organizationId, {
            storeId: entitledStoreId,
        });

        expect(response.code).toBe(STATUS_CODES.SUCCESS);
        expect(response.data?.summary.products).toEqual(entitledProducts);
        expect(getProductSalesSummary).toHaveBeenCalledWith(
            organizationId,
            entitledStoreId,
            { storeId: entitledStoreId },
        );
    });

    test("limits Organization-wide reports to entitled Stores", async () => {
        const response = await billingService.getProductSalesSummary(userId, organizationId, {});

        expect(response.code).toBe(STATUS_CODES.SUCCESS);
        expect(getProductSalesSummary).toHaveBeenCalledWith(
            organizationId,
            undefined,
            {},
            [entitledStoreId],
        );
    });

    test("forbids Organization-wide reports after access expires", async () => {
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: false,
            featureKey,
            evidence: [],
        }));

        const response = await billingService.getProductSalesSummary(userId, organizationId, {});

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("any Store in this Organization");
        expect(getProductSalesSummary).not.toHaveBeenCalled();
    });

    test("isolates POS reports between Stores in one Organization", async () => {
        const entitled = await billingService.getProductSalesSummaryForDevice(
            buildDeviceSession(entitledStoreId),
            {},
        );
        const unentitled = await billingService.getProductSalesSummaryForDevice(
            buildDeviceSession(unentitledStoreId),
            {},
        );

        expect(entitled.code).toBe(STATUS_CODES.SUCCESS);
        expect(unentitled.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(unentitled.message).toContain("Reports");
    });
});

describe("WhatsApp Feature Entitlement enforcement", () => {
    beforeEach(() => {
        resolveFeatureEntitlement.mockClear();
        assignAccountToStore.mockClear();
        getWhatsAppAccount.mockClear();
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

    test("forbids assigning a WhatsApp account to an unentitled Store", async () => {
        const response = await whatsappService.assignAccount(
            userId,
            organizationId,
            unentitledStoreId,
            accountId,
        );

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("WhatsApp");
        expect(assignAccountToStore).not.toHaveBeenCalled();
    });

    test("allows assigning a WhatsApp account to an entitled Store in the same Organization", async () => {
        const response = await whatsappService.assignAccount(
            userId,
            organizationId,
            entitledStoreId,
            accountId,
        );

        expect(response.code).toBe(STATUS_CODES.SUCCESS);
        expect(assignAccountToStore).toHaveBeenCalled();
        expect(JSON.stringify(response)).not.toContain("accessToken");
        expect(JSON.stringify(response)).not.toContain("secret");
    });

    test("isolates Store Device WhatsApp status between Stores", async () => {
        const entitled = await whatsappService.getAccountForDevice(
            buildDeviceSession(entitledStoreId),
        );
        const unentitled = await whatsappService.getAccountForDevice(
            buildDeviceSession(unentitledStoreId),
        );

        expect(entitled.code).not.toBe(STATUS_CODES.FORBIDDEN);
        expect(unentitled.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(unentitled.message).toContain("WhatsApp");
        expect(JSON.stringify(entitled)).not.toContain("accessToken");
    });

    test("denies WhatsApp use after a grant expires", async () => {
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: false,
            featureKey,
            evidence: [],
        }));

        const response = await whatsappService.getAccountForDevice(
            buildDeviceSession(entitledStoreId),
        );

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("Review commercial access");
    });
});
