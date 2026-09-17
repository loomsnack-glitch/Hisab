import { beforeEach, describe, expect, mock, test } from "bun:test";

const organizationId = "11111111-1111-4111-8111-111111111111";
const storeId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";

const getOrganizationByIdForUser = mock(async () => ({ id: organizationId, createdBy: userId }));
const getStoreById = mock(async () => ({ id: storeId, organizationId }));
const getCurrentPolicy = mock(async () => ({
    id: "55555555-5555-4555-8555-555555555555",
    organizationId,
    storeId,
    mode: "disabled" as const,
    whatsappAccountId: null,
    revision: 1,
    effectiveFrom: new Date("2026-09-17T10:00:00.000Z"),
    effectiveTo: null,
}));
const replaceCurrentPolicy = mock(async () => getCurrentPolicy());
const getAccountById = mock(async () => ({
    id: accountId,
    organizationId,
    assignedStoreIds: [storeId],
    provider: "cloud_api" as const,
    phoneNumber: "+919876543210",
    status: "connected" as const,
    cloudStatus: "connected" as const,
}));
const isStoreFeatureEntitled = mock(async () => true);
const requireStoreFeatureEntitlement = mock(async () => null);

class StorePolicyAccountNotLinkedError extends Error {}

mock.module("../organization/organization.repository", () => ({
    getOrganizationByIdForUser,
    getStoreById,
}));
mock.module("./whatsapp.repository", () => ({ getAccountById }));
mock.module("./whatsapp-policy.repository", () => ({
    getCurrentPolicy,
    replaceCurrentPolicy,
    StorePolicyAccountNotLinkedError,
}));
mock.module("../commercial-licensing/feature-entitlement-guard", () => ({
    isStoreFeatureEntitled,
    requireStoreFeatureEntitlement,
}));

const { allowedKindsFor, getStorePolicy, setStorePolicy } = await import("./whatsapp-policy.service");

describe("Store WhatsApp policy service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getStoreById.mockClear();
        getCurrentPolicy.mockClear();
        replaceCurrentPolicy.mockClear();
        getAccountById.mockClear();
        isStoreFeatureEntitled.mockClear();
        requireStoreFeatureEntitlement.mockClear();
        isStoreFeatureEntitled.mockResolvedValue(true);
        requireStoreFeatureEntitlement.mockResolvedValue(null);
        getCurrentPolicy.mockResolvedValue({
            id: "55555555-5555-4555-8555-555555555555",
            organizationId,
            storeId,
            mode: "disabled",
            whatsappAccountId: null,
            revision: 1,
            effectiveFrom: new Date("2026-09-17T10:00:00.000Z"),
            effectiveTo: null,
        });
    });

    test("maps mode capabilities to allowed message kinds", () => {
        expect(allowedKindsFor("disabled")).toEqual([]);
        expect(allowedKindsFor("ganatri_utility")).toEqual(["bill", "due_reminder"]);
        expect(allowedKindsFor("organization_cloud")).toEqual(["bill", "due_reminder", "promotion"]);
    });

    test("returns the current policy, sender, entitlement, and version", async () => {
        const response = await getStorePolicy(userId, organizationId, storeId);

        expect(response).toMatchObject({
            status: "success",
            data: {
                policy: {
                    mode: "disabled",
                    sender: { kind: "none" },
                    entitlement: { featureKey: "whatsapp", entitled: true, required: false },
                    allowedKinds: [],
                    version: 1,
                },
            },
        });
    });

    test("requires entitlement before enabling Ganatri Utility", async () => {
        requireStoreFeatureEntitlement.mockResolvedValue({
            status: "error" as const,
            message: "WhatsApp is not available for this Store",
            data: null,
            code: 403 as const,
        });

        const response = await setStorePolicy(userId, organizationId, storeId, { mode: "ganatri_utility" });

        expect(response).toMatchObject({ status: "error", code: 403 });
        expect(replaceCurrentPolicy).not.toHaveBeenCalled();
    });

    test("requires an assigned same-Organization Cloud account", async () => {
        getAccountById.mockResolvedValue({
            id: accountId,
            organizationId,
            assignedStoreIds: [],
            provider: "cloud_api" as const,
            phoneNumber: "+919876543210",
            status: "connected" as const,
            cloudStatus: "connected" as const,
        });

        const response = await setStorePolicy(userId, organizationId, storeId, {
            mode: "organization_cloud",
            whatsappAccountId: accountId,
        });

        expect(response).toMatchObject({ status: "error", code: 409 });
        expect(replaceCurrentPolicy).not.toHaveBeenCalled();
    });

    test("changes policy through the repository transition seam", async () => {
        replaceCurrentPolicy.mockResolvedValue({
            id: "66666666-6666-4666-8666-666666666666",
            organizationId,
            storeId,
            mode: "ganatri_utility",
            whatsappAccountId: null,
            revision: 2,
            effectiveFrom: new Date("2026-09-17T11:00:00.000Z"),
            effectiveTo: null,
        });
        getCurrentPolicy.mockResolvedValue({
            id: "66666666-6666-4666-8666-666666666666",
            organizationId,
            storeId,
            mode: "ganatri_utility",
            whatsappAccountId: null,
            revision: 2,
            effectiveFrom: new Date("2026-09-17T11:00:00.000Z"),
            effectiveTo: null,
        });

        const response = await setStorePolicy(userId, organizationId, storeId, { mode: "ganatri_utility" });

        expect(replaceCurrentPolicy).toHaveBeenCalledWith(
            organizationId,
            storeId,
            "ganatri_utility",
            null,
            userId,
        );
        expect(response).toMatchObject({
            status: "success",
            data: { policy: { mode: "ganatri_utility", version: 2 } },
        });
    });
});
