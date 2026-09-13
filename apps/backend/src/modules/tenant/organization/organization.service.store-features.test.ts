import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { STATUS_CODES } from "@repo/types";
import {
    ensureFeatureEntitlementMock,
    resolveFeatureEntitlement,
} from "@/modules/tenant/commercial-licensing/feature-entitlement.test-harness";
import {
    getOrganizationByIdForUser,
    getStoreById,
    sharedOrganization,
    sharedOrganizationId,
    sharedStore,
    sharedStoreId,
    storeNameExistsInOrganization,
    updateStore as updateStoreRepo,
} from "@/modules/tenant/test-support/organization-repository.test-harness";

const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

await ensureFeatureEntitlementMock();

const organizationService = await import("./organization.service");

const updatePayload = {
    name: "Adajan",
    address: "Ring Road",
};

describe("Store feature setting Feature Entitlement", () => {
    beforeEach(() => {
        sharedStore.kotSystemEnabled = false;
        sharedStore.tableManagementEnabled = false;
        sharedStore.moneyAccountTrackingEnabled = false;
        getOrganizationByIdForUser.mockClear();
        getStoreById.mockClear();
        storeNameExistsInOrganization.mockClear();
        updateStoreRepo.mockClear();
        getOrganizationByIdForUser.mockResolvedValue(sharedOrganization);
        getStoreById.mockResolvedValue(sharedStore);
        storeNameExistsInOrganization.mockResolvedValue(false);
        resolveFeatureEntitlement.mockClear();
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: false,
            featureKey,
            evidence: [],
        }));
    });

    afterEach(() => {
        sharedStore.kotSystemEnabled = false;
        sharedStore.tableManagementEnabled = false;
        sharedStore.moneyAccountTrackingEnabled = false;
    });

    test("forbids enabling KOT System without the kot_system entitlement", async () => {
        const response = await organizationService.updateStore(userId, sharedOrganizationId, sharedStoreId, {
            ...updatePayload,
            kotSystemEnabled: true,
        });

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("KOT System is not available for this Store");
        expect(updateStoreRepo).not.toHaveBeenCalled();
        expect(resolveFeatureEntitlement).toHaveBeenCalledWith(sharedStoreId, "kot_system", expect.any(Date));
    });

    test("forbids enabling Table Management without the table_management entitlement", async () => {
        sharedStore.kotSystemEnabled = true;

        const response = await organizationService.updateStore(userId, sharedOrganizationId, sharedStoreId, {
            ...updatePayload,
            tableManagementEnabled: true,
        });

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("Table Management is not available for this Store");
        expect(updateStoreRepo).not.toHaveBeenCalled();
        expect(resolveFeatureEntitlement).toHaveBeenCalledWith(sharedStoreId, "table_management", expect.any(Date));
    });

    test("forbids enabling Money Account Tracking without the money_account_tracking entitlement", async () => {
        const response = await organizationService.updateStore(userId, sharedOrganizationId, sharedStoreId, {
            ...updatePayload,
            moneyAccountTrackingEnabled: true,
        });

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("Money Account Tracking is not available for this Store");
        expect(updateStoreRepo).not.toHaveBeenCalled();
        expect(resolveFeatureEntitlement).toHaveBeenCalledWith(sharedStoreId, "money_account_tracking", expect.any(Date));
    });

    test("enables an entitled optional Store feature", async () => {
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: featureKey === "kot_system",
            featureKey,
            evidence: [],
        }));

        const response = await organizationService.updateStore(userId, sharedOrganizationId, sharedStoreId, {
            ...updatePayload,
            kotSystemEnabled: true,
        });

        expect(response.status).toBe("success");
        expect(response.code).toBe(STATUS_CODES.SUCCESS);
        expect(updateStoreRepo).toHaveBeenCalledWith(expect.objectContaining({
            id: sharedStoreId,
            kotSystemEnabled: true,
        }));
    });

    test("lets a Store turn off an optional feature without current entitlement", async () => {
        sharedStore.tableManagementEnabled = true;

        const response = await organizationService.updateStore(userId, sharedOrganizationId, sharedStoreId, {
            ...updatePayload,
            tableManagementEnabled: false,
        });

        expect(response.status).toBe("success");
        expect(updateStoreRepo).toHaveBeenCalledWith(expect.objectContaining({
            tableManagementEnabled: false,
        }));
        expect(resolveFeatureEntitlement).not.toHaveBeenCalled();
    });
});

describe("Store feature KOT and Table Management coupling", () => {
    beforeEach(() => {
        sharedStore.kotSystemEnabled = false;
        sharedStore.tableManagementEnabled = false;
        sharedStore.moneyAccountTrackingEnabled = false;
        getOrganizationByIdForUser.mockClear();
        getStoreById.mockClear();
        storeNameExistsInOrganization.mockClear();
        updateStoreRepo.mockClear();
        getOrganizationByIdForUser.mockResolvedValue(sharedOrganization);
        getStoreById.mockResolvedValue(sharedStore);
        storeNameExistsInOrganization.mockResolvedValue(false);
        resolveFeatureEntitlement.mockClear();
        resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: true,
            featureKey,
            evidence: [],
        }));
    });

    afterEach(() => {
        sharedStore.kotSystemEnabled = false;
        sharedStore.tableManagementEnabled = false;
        sharedStore.moneyAccountTrackingEnabled = false;
    });

    test("rejects Table Management without KOT System", async () => {
        const response = await organizationService.updateStore(userId, sharedOrganizationId, sharedStoreId, {
            ...updatePayload,
            tableManagementEnabled: true,
        });

        expect(response.code).toBe(STATUS_CODES.BAD_REQUEST);
        expect(response.message).toBe("Table Management requires KOT System.");
        expect(updateStoreRepo).not.toHaveBeenCalled();
    });

    test("rejects turning off KOT System while Table Management stays on", async () => {
        sharedStore.kotSystemEnabled = true;
        sharedStore.tableManagementEnabled = true;

        const response = await organizationService.updateStore(userId, sharedOrganizationId, sharedStoreId, {
            ...updatePayload,
            kotSystemEnabled: false,
        });

        expect(response.code).toBe(STATUS_CODES.BAD_REQUEST);
        expect(response.message).toBe("Table Management requires KOT System.");
        expect(updateStoreRepo).not.toHaveBeenCalled();
    });

    test("enables Table Management together with KOT System", async () => {
        const response = await organizationService.updateStore(userId, sharedOrganizationId, sharedStoreId, {
            ...updatePayload,
            kotSystemEnabled: true,
            tableManagementEnabled: true,
        });

        expect(response.status).toBe("success");
        expect(updateStoreRepo).toHaveBeenCalledWith(expect.objectContaining({
            kotSystemEnabled: true,
            tableManagementEnabled: true,
        }));
    });

    test("lets KOT System stay on without Table Management", async () => {
        sharedStore.kotSystemEnabled = true;

        const response = await organizationService.updateStore(userId, sharedOrganizationId, sharedStoreId, {
            ...updatePayload,
            tableManagementEnabled: false,
        });

        expect(response.status).toBe("success");
        expect(updateStoreRepo).toHaveBeenCalledWith(expect.objectContaining({
            kotSystemEnabled: true,
            tableManagementEnabled: false,
        }));
    });

    test("turns off Table Management when KOT System is also turned off", async () => {
        sharedStore.kotSystemEnabled = true;
        sharedStore.tableManagementEnabled = true;

        const response = await organizationService.updateStore(userId, sharedOrganizationId, sharedStoreId, {
            ...updatePayload,
            kotSystemEnabled: false,
            tableManagementEnabled: false,
        });

        expect(response.status).toBe("success");
        expect(updateStoreRepo).toHaveBeenCalledWith(expect.objectContaining({
            kotSystemEnabled: false,
            tableManagementEnabled: false,
        }));
    });
});
