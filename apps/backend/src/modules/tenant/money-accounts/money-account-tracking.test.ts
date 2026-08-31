import { beforeEach, describe, expect, mock, test } from "bun:test";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const getStoreById = mock(async () => ({
    id: storeId,
    organizationId,
    name: "Adajan",
    moneyAccountTrackingEnabled: false,
}));
const isMoneyAccountTrackingAvailable = mock(async () => true);

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getStoreById,
}));

mock.module("./money-account-tracking-availability", () => ({
    isMoneyAccountTrackingAvailable,
}));

const { isMoneyAccountTrackingActive } = await import("./money-account-tracking");

describe("Money Account Tracking activation", () => {
    beforeEach(() => {
        getStoreById.mockClear();
        isMoneyAccountTrackingAvailable.mockClear();
        isMoneyAccountTrackingAvailable.mockResolvedValue(true);
        getStoreById.mockResolvedValue({
            id: storeId,
            organizationId,
            name: "Adajan",
            moneyAccountTrackingEnabled: false,
        });
    });

    test("treats tracking as inactive when the Store setting is disabled", async () => {
        const active = await isMoneyAccountTrackingActive(organizationId, storeId);

        expect(active).toBe(false);
        expect(getStoreById).toHaveBeenCalledWith(organizationId, storeId);
    });

    test("treats tracking as inactive when the availability seam denies the Organization", async () => {
        isMoneyAccountTrackingAvailable.mockResolvedValue(false);
        getStoreById.mockResolvedValue({
            id: storeId,
            organizationId,
            name: "Adajan",
            moneyAccountTrackingEnabled: true,
        });

        const active = await isMoneyAccountTrackingActive(organizationId, storeId);

        expect(active).toBe(false);
        expect(getStoreById).not.toHaveBeenCalled();
    });

    test("treats tracking as active only when the Store setting and availability seam both permit it", async () => {
        getStoreById.mockResolvedValue({
            id: storeId,
            organizationId,
            name: "Adajan",
            moneyAccountTrackingEnabled: true,
        });

        const active = await isMoneyAccountTrackingActive(organizationId, storeId);

        expect(active).toBe(true);
    });
});
