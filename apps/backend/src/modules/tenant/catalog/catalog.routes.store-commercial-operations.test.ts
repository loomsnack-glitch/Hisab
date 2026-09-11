import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("@/middlewares/auth.middleware", () => ({
    authMiddleware: async (context: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
        context.set("authUser", { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
        await next();
    },
}));

const harness = await import("./catalog.service.test-harness");

const { default: catalogRoutes } = await import("./catalog.routes");

const previewPath = `http://localhost/${harness.organizationId}/store-commercial-operations/preview`;
const applyPath = `http://localhost/${harness.organizationId}/store-commercial-operations/apply`;
const auditsPath = `http://localhost/${harness.organizationId}/store-commercial-operations/audits`;
const productPath = `http://localhost/${harness.organizationId}/products/${harness.productId}`;

const vesuOffering = {
    ...harness.storeProductOffering,
    id: "f0f0f0f0-f0f0-4f0f-8f0f-f0f0f0f0f0f0",
    storeId: harness.vesuStore.id,
    priceOverride: 150,
    discountOverride: 30,
    effectivePrice: 150,
    effectiveDiscount: 30,
    isPriceInherited: false,
    isDiscountInherited: false,
};

describe("Store commercial operation catalog routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getStoresByOrganizationId.mockClear();
        harness.getStoresByOrganizationId.mockResolvedValue([harness.store, harness.vesuStore]);
        harness.getProductsByIds.mockClear();
        harness.getProductsByIds.mockResolvedValue([harness.product]);
        harness.getStoreProductOfferingsForStoresAndProducts.mockClear();
        harness.getStoreProductOfferingsForStoresAndProducts.mockResolvedValue([
            { ...harness.storeProductOffering, productName: harness.product.name },
            { ...vesuOffering, productName: harness.product.name },
        ]);
        harness.updateStoreProductOfferingRepo.mockClear();
        harness.updateStoreProductOfferingRepo.mockImplementation(async (data) => ({
            ...harness.storeProductOffering,
            ...data,
            effectivePrice: data.priceOverride ?? harness.product.price,
            effectiveDiscount: data.discountOverride ?? harness.product.discount,
            isPriceInherited: data.priceOverride === null,
            isDiscountInherited: data.discountOverride === null,
        }));
        harness.createCatalogCommercialOperationAudit.mockClear();
        harness.createCatalogCommercialOperationAudit.mockImplementation(async (audit) => ({
            id: audit.id,
            organizationId: audit.organizationId,
            itemType: audit.itemType,
            operation: audit.operation,
            storeIds: audit.storeIds,
            itemIds: audit.itemIds,
            actorId: audit.actorId,
            createdAt: harness.now,
            changes: audit.details.changes,
        }));
        harness.getCatalogCommercialOperationAudits.mockClear();
        harness.getCatalogCommercialOperationAudits.mockResolvedValue([]);
        harness.updateProductRepo.mockClear();
        harness.getStoreProductOfferingsByProductId.mockClear();
        harness.getStoreProductOfferingsByProductId.mockResolvedValue([
            {
                ...vesuOffering,
                discountOverride: 30,
                effectiveDiscount: 30,
                isDiscountInherited: false,
            },
        ]);
    });

    test("previews selected Store Product override replacements with before and after values", async () => {
        const response = await catalogRoutes.request(previewPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                itemType: "product",
                operation: "set_price_override",
                storeIds: [harness.store.id, harness.vesuStore.id],
                itemIds: [harness.productId],
                value: 120,
            }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.preview.requiresConfirmation).toBe(true);
        expect(body.data.preview.changes).toHaveLength(2);
        expect(body.data.preview.changes[0]).toMatchObject({
            storeId: harness.store.id,
            before: {
                isPriceInherited: true,
                effectivePrice: harness.product.price,
            },
            after: {
                isPriceInherited: false,
                effectivePrice: 120,
            },
            affectsOverride: true,
        });
        expect(body.data.preview.changes[1]).toMatchObject({
            storeId: harness.vesuStore.id,
            before: {
                priceOverride: 150,
                isPriceInherited: false,
            },
            after: {
                priceOverride: 120,
                effectivePrice: 120,
            },
        });
    });

    test("rejects apply when override replacement is not confirmed", async () => {
        const response = await catalogRoutes.request(applyPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                itemType: "product",
                operation: "set_price_override",
                storeIds: [harness.store.id],
                itemIds: [harness.productId],
                value: 120,
                confirmed: false,
            }),
        });

        expect(response.status).toBe(400);
        expect(harness.updateStoreProductOfferingRepo).not.toHaveBeenCalled();
        expect(harness.createCatalogCommercialOperationAudit).not.toHaveBeenCalled();
    });

    test("applies confirmed override changes and records an audit entry", async () => {
        const response = await catalogRoutes.request(applyPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                itemType: "product",
                operation: "set_price_override",
                storeIds: [harness.store.id],
                itemIds: [harness.productId],
                value: 120,
                confirmed: true,
            }),
        });

        expect(response.status).toBe(200);
        expect(harness.updateStoreProductOfferingRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                storeId: harness.store.id,
                priceOverride: 120,
            }),
            expect.anything(),
        );
        expect(harness.createCatalogCommercialOperationAudit).toHaveBeenCalledWith(
            expect.objectContaining({
                itemType: "product",
                operation: "set_price_override",
                actorId: harness.userId,
            }),
            expect.anything(),
        );
        const body = await response.json();
        expect(body.data.result.appliedChangeCount).toBe(1);
        expect(body.data.result.audit.changes).toHaveLength(1);
    });

    test("rejects invalid effective price and discount combinations during preview", async () => {
        const response = await catalogRoutes.request(previewPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                itemType: "product",
                operation: "set_price_override",
                storeIds: [harness.vesuStore.id],
                itemIds: [harness.productId],
                value: 10,
            }),
        });

        expect(response.status).toBe(400);
        expect((await response.json()).message).toContain("Discount cannot be greater than price");
    });

    test("rejects Stores outside the Organization", async () => {
        const response = await catalogRoutes.request(previewPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                itemType: "product",
                operation: "set_price_override",
                storeIds: ["99999999-9999-4999-8999-999999999999"],
                itemIds: [harness.productId],
                value: 120,
            }),
        });

        expect(response.status).toBe(400);
        expect((await response.json()).message).toContain("Stores do not belong");
    });

    test("lists catalog commercial operation audits for the Organization", async () => {
        harness.getCatalogCommercialOperationAudits.mockResolvedValue([
            {
                id: "a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a0a0",
                organizationId: harness.organizationId,
                itemType: "product",
                operation: "clear_price_override",
                storeIds: [harness.vesuStore.id],
                itemIds: [harness.productId],
                actorId: harness.userId,
                createdAt: harness.now,
                changes: [],
            },
        ]);

        const response = await catalogRoutes.request(auditsPath);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.data.audits).toHaveLength(1);
        expect(body.data.audits[0]?.operation).toBe("clear_price_override");
    });

    test("updates Organization default price without writing Store override rows", async () => {
        harness.updateProductRepo.mockImplementation(async (data) => ({
            ...harness.product,
            ...data,
            unitLabel: "pc",
        }));

        const response = await catalogRoutes.request(productPath, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ price: 120 }),
        });

        expect(response.status).toBe(200);
        expect(harness.updateProductRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                id: harness.productId,
                price: 120,
            }),
        );
        expect(harness.updateStoreProductOfferingRepo).not.toHaveBeenCalled();
        expect(harness.createCatalogCommercialOperationAudit).not.toHaveBeenCalled();
    });
});
