import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("@/middlewares/auth.middleware", () => ({
    authMiddleware: async (context: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
        context.set("authUser", { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
        await next();
    },
}));

const harness = await import("./catalog.service.test-harness");

const { default: catalogRoutes } = await import("./catalog.routes");

const offeringsPath = `http://localhost/${harness.organizationId}/stores/${harness.store.id}/add-on-offerings`;

describe("Store Add-On Offering catalog routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getStoreById.mockClear();
        harness.getStoreById.mockResolvedValue(harness.store);
        harness.getAddOnById.mockClear();
        harness.getAddOnById.mockResolvedValue(harness.addOn);
        harness.getStoreAddOnOfferingsByStoreId.mockClear();
        harness.getStoreAddOnOfferingsByStoreId.mockResolvedValue([harness.storeAddOnOffering]);
        harness.getStoreAddOnOfferingById.mockClear();
        harness.getStoreAddOnOfferingById.mockResolvedValue(harness.storeAddOnOffering);
        harness.updateStoreAddOnOfferingRepo.mockClear();
        harness.updateStoreAddOnOfferingRepo.mockImplementation(async (data) => ({
            ...harness.storeAddOnOffering,
            ...data,
            effectivePrice: data.priceOverride ?? harness.addOn.price,
            effectiveDiscount: data.discountOverride ?? harness.addOn.discount,
            isPriceInherited: data.priceOverride === null,
            isDiscountInherited: data.discountOverride === null,
        }));
    });

    test("lists Store Add-On Offerings for a Store in the Organization, including inactive ones", async () => {
        harness.getStoreAddOnOfferingsByStoreId.mockResolvedValue([
            { ...harness.storeAddOnOffering, status: "inactive" as "active" | "inactive" },
        ]);

        const response = await catalogRoutes.request(offeringsPath);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.offerings[0]?.addOn.name).toBe(harness.addOn.name);
        expect(body.data.offerings[0]?.status).toBe("inactive");
        expect(harness.getStoreAddOnOfferingsByStoreId).toHaveBeenCalledWith(
            harness.organizationId,
            harness.store.id,
        );
    });

    test("updates Offering price override, discount override, and status without changing shared Add-On details", async () => {
        const response = await catalogRoutes.request(
            `${offeringsPath}/${harness.addOnOfferingId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    priceOverride: 30,
                    discountOverride: 5,
                    status: "inactive",
                }),
            },
        );

        expect(response.status).toBe(200);
        expect(harness.updateStoreAddOnOfferingRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: harness.addOnOfferingId,
                storeId: harness.store.id,
                priceOverride: 30,
                discountOverride: 5,
                status: "inactive",
            }),
        );
        expect(harness.updateAddOnRepo).not.toHaveBeenCalled();
    });

    test("rejects legacy copied-price update fields on Store Add-On Offerings", async () => {
        const response = await catalogRoutes.request(
            `${offeringsPath}/${harness.addOnOfferingId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ price: 30, discount: 5 }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.updateStoreAddOnOfferingRepo).not.toHaveBeenCalled();
    });
});
