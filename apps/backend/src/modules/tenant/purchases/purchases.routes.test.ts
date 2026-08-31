import { beforeEach, describe, expect, test } from "bun:test";
import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "@/types/hono";
import { authMiddleware } from "@/middlewares/auth.middleware";

const harness = await import("./purchases.service.test-harness");
const { createPurchasesRoutes } = await import("./purchases.routes");

const authenticatedUser: MiddlewareHandler<{ Variables: AppVariables }> = async (context, next) => {
    context.set("authUser", { id: harness.userId } as AppVariables["authUser"]);
    await next();
};

const purchasesRoutes = createPurchasesRoutes(authenticatedUser);
const unauthenticatedRoutes = createPurchasesRoutes(authMiddleware);

const readBody = async (response: Response) => (await response.json()) as any;

const createPayload = {
    storeId: harness.storeId,
    vendorId: harness.vendorId,
    effectiveDate: "2026-08-30",
    invoiceReference: "INV-104",
    notes: "Weekly produce",
    adjustment: 25.5,
    lines: [{ vendorItemId: harness.vendorItemId, quantity: 2 }],
};

describe("Organization Purchase routes", () => {
    beforeEach(() => {
        harness.getOrganizationByIdForUser.mockClear();
        harness.getStoreById.mockClear();
        harness.getPurchasesByOrganizationId.mockClear();
        harness.getPurchaseById.mockClear();
        harness.createPurchaseRepo.mockClear();
        harness.updatePurchaseRepo.mockClear();
        harness.replacePurchaseLinesRepo.mockClear();
        harness.deletePurchaseRepo.mockClear();

        harness.getOrganizationByIdForUser.mockResolvedValue(harness.organization);
        harness.getStoreById.mockResolvedValue(harness.store);
        harness.resetStoredPurchase(harness.draftPurchase);
        harness.getPurchasesByOrganizationId.mockResolvedValue([harness.draftPurchase]);
    });

    test("rejects unauthenticated Purchase listing", async () => {
        const response = await unauthenticatedRoutes.request(
            `http://localhost/${harness.organizationId}/purchases`,
        );

        expect(response.status).toBe(401);
        const body = await readBody(response);
        expect(body.message).toBe("Authentication is required");
    });

    test("lists Organization Purchases for an authenticated administrator", async () => {
        const response = await purchasesRoutes.request(
            `http://localhost/${harness.organizationId}/purchases`,
        );

        expect(response.status).toBe(200);
        const body = await readBody(response);
        expect(body.data.purchases).toHaveLength(1);
        expect(body.data.purchases[0].vendorName).toBe("Fresh Farms");
        expect(body.data.purchases[0].storeName).toBe("Adajan");
    });

    test("creates a Draft Purchase at the Organization administrator seam", async () => {
        const response = await purchasesRoutes.request(
            `http://localhost/${harness.organizationId}/purchases`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createPayload),
            },
        );

        expect(response.status).toBe(201);
        const body = await readBody(response);
        expect(body.data.purchase.lifecycle).toBe("draft");
        expect(body.data.purchase.payableStatus).toBeNull();
        expect(harness.createPurchaseRepo).toHaveBeenCalled();
    });

    test("rejects a Purchase payload that includes payment or snapshot fields", async () => {
        const response = await purchasesRoutes.request(
            `http://localhost/${harness.organizationId}/purchases`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...createPayload,
                    paidTotal: 10,
                    payableStatus: "due",
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createPurchaseRepo).not.toHaveBeenCalled();
    });

    test("rejects a future effective date at the route seam", async () => {
        const response = await purchasesRoutes.request(
            `http://localhost/${harness.organizationId}/purchases`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...createPayload,
                    effectiveDate: "2099-01-01",
                }),
            },
        );

        expect(response.status).toBe(400);
        expect(harness.createPurchaseRepo).not.toHaveBeenCalled();
    });

    test("returns Purchase details with lines and snapshots", async () => {
        const response = await purchasesRoutes.request(
            `http://localhost/${harness.organizationId}/purchases/${harness.purchaseId}`,
        );

        expect(response.status).toBe(200);
        const body = await readBody(response);
        expect(body.data.purchase.lines[0].vendorItemName).toBe("Tomato");
        expect(body.data.purchase.lines[0].unitLabel).toBe("kg");
    });

    test("updates a Draft Purchase", async () => {
        const response = await purchasesRoutes.request(
            `http://localhost/${harness.organizationId}/purchases/${harness.purchaseId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: "Updated notes" }),
            },
        );

        expect(response.status).toBe(200);
        const body = await readBody(response);
        expect(body.data.purchase.notes).toBe("Updated notes");
    });

    test("discards a Draft Purchase", async () => {
        const response = await purchasesRoutes.request(
            `http://localhost/${harness.organizationId}/purchases/${harness.purchaseId}`,
            { method: "DELETE" },
        );

        expect(response.status).toBe(200);
        const body = await readBody(response);
        expect(body.data.discarded).toBe(true);
        expect(harness.deletePurchaseRepo).toHaveBeenCalled();
    });

    test("records a Draft Purchase as due-only", async () => {
        const response = await purchasesRoutes.request(
            `http://localhost/${harness.organizationId}/purchases/${harness.purchaseId}/record`,
            { method: "POST" },
        );

        expect(response.status).toBe(200);
        const body = await readBody(response);
        expect(body.data.purchase.lifecycle).toBe("recorded");
        expect(body.data.purchase.payableStatus).toBe("due");
        expect(body.data.purchase.paidTotal).toBe(0);
        expect(body.data.purchase.dueAmount).toBe(106.5);
    });

    test("denies Purchase access when the user is not a member of the Organization", async () => {
        harness.getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await purchasesRoutes.request(
            `http://localhost/${harness.organizationId}/purchases`,
        );

        expect(response.status).toBe(404);
        expect(harness.getPurchasesByOrganizationId).not.toHaveBeenCalled();
    });

    test("rejects an invalid purchase id", async () => {
        const response = await purchasesRoutes.request(
            `http://localhost/${harness.organizationId}/purchases/not-a-uuid`,
        );

        expect(response.status).toBe(400);
    });
});
