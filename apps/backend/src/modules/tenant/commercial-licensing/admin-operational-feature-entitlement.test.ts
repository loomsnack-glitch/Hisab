import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { STATUS_CODES } from "@repo/types";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const entitledStoreId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const unentitledStoreId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const vendorId = "11111111-1111-4111-8111-111111111111";
const vendorItemId = "44444444-4444-4444-8444-444444444444";

const harness = await import("../purchases/purchases.service.test-harness");

describe("Admin operational Feature Entitlement enforcement", () => {
    beforeEach(() => {
        harness.resolveFeatureEntitlement.mockClear();
        harness.resolveFeatureEntitlement.mockImplementation(async (storeId, featureKey) => ({
            entitled: storeId === entitledStoreId,
            featureKey,
            evidence: [],
        }));

        harness.getStoresByOrganizationId.mockClear();
        harness.getStoresByOrganizationId.mockImplementation(async () => [
            { id: entitledStoreId, organizationId, name: "Adajan" },
            { id: unentitledStoreId, organizationId, name: "Vesu" },
        ]);
        harness.getOrganizationByIdForUser.mockClear();
        harness.getStoreById.mockClear();
        harness.createPurchaseRepo.mockClear();
        harness.getOrganizationByIdForUser.mockResolvedValue({
            id: organizationId,
            name: "Demo Org",
        });
        harness.getStoreById.mockImplementation(async (_organizationId, storeId) => ({
            id: storeId,
            organizationId,
            name: storeId === entitledStoreId ? "Adajan" : "Vesu",
        }));
        harness.isMoneyAccountTrackingActive.mockResolvedValue(false);
    });

    afterEach(() => {
        harness.resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: true,
            featureKey,
            evidence: [],
        }));
        harness.getOrganizationByIdForUser.mockResolvedValue({
            id: organizationId,
            name: "Demo Org",
        });
        harness.getStoreById.mockResolvedValue({
            id: entitledStoreId,
            organizationId,
            name: "Adajan",
        });
        harness.getStoresByOrganizationId.mockImplementation(async () => [
            { id: entitledStoreId, organizationId, name: "Adajan" },
            { id: unentitledStoreId, organizationId, name: "Vesu" },
        ]);
    });

    test("forbids creating a Purchase for an unentitled Store", async () => {
        const response = await harness.purchasesService.createDraftPurchase(userId, organizationId, {
            storeId: unentitledStoreId,
            vendorId,
            effectiveDate: "2026-08-30",
            lines: [{ vendorItemId, quantity: 2 }],
        });

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("Purchases");
        expect(harness.createPurchaseRepo).not.toHaveBeenCalled();
    });

    test("allows creating a Purchase for an entitled Store sharing Organization data", async () => {
        const response = await harness.purchasesService.createDraftPurchase(userId, organizationId, {
            storeId: entitledStoreId,
            vendorId,
            effectiveDate: "2026-08-30",
            lines: [{ vendorItemId, quantity: 2 }],
        });

        expect(response.code).toBe(STATUS_CODES.CREATED);
        expect(harness.createPurchaseRepo).toHaveBeenCalled();
    });

    test("forbids listing Purchases after organization-wide access expires", async () => {
        harness.resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: false,
            featureKey,
            evidence: [],
        }));

        const response = await harness.purchasesService.getPurchases(userId, organizationId);

        expect(response.code).toBe(STATUS_CODES.FORBIDDEN);
        expect(response.message).toContain("any Store in this Organization");
    });
});

describe("Money Account Tracking availability", () => {
    beforeEach(() => {
        harness.resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: true,
            featureKey,
            evidence: [],
        }));
    });

    test("permits tracking when the Store has the money_account_tracking entitlement", async () => {
        const { isMoneyAccountTrackingAvailable } = await import(
            "../money-accounts/money-account-tracking-availability"
        );

        const available = await isMoneyAccountTrackingAvailable(organizationId, entitledStoreId);

        expect(available).toBe(true);
        expect(harness.resolveFeatureEntitlement).toHaveBeenCalledWith(
            entitledStoreId,
            "money_account_tracking",
            expect.any(Date),
        );
    });

    test("denies tracking when the Store lacks the money_account_tracking entitlement", async () => {
        harness.resolveFeatureEntitlement.mockImplementation(async (_storeId, featureKey) => ({
            entitled: false,
            featureKey,
            evidence: [],
        }));

        const { isMoneyAccountTrackingAvailable } = await import(
            "../money-accounts/money-account-tracking-availability"
        );

        const available = await isMoneyAccountTrackingAvailable(organizationId, unentitledStoreId);

        expect(available).toBe(false);
    });
});
