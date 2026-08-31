import { beforeEach, describe, expect, test } from "bun:test";
import {
    createPurchaseRepo,
    deletePurchaseRepo,
    draftPurchase,
    freshFarmsVendor,
    getOrganizationByIdForUser,
    getPurchaseById,
    getPurchasesByOrganizationId,
    getStoreById,
    getUnitById,
    getVendorById,
    getVendorItemById,
    inactiveVendorId,
    millersTomatoItemId,
    onionItemId,
    organizationId,
    otherOrganizationId,
    purchaseId,
    purchasesService,
    recordedPurchase,
    replacePurchaseLinesRepo,
    resetStoredPurchase,
    storeId,
    tomatoItem,
    updatePurchaseRepo,
    userId,
    vendorId,
    vendorItemId,
} from "./purchases.service.test-harness";

const createPayload = {
    storeId,
    vendorId,
    effectiveDate: "2026-08-30",
    invoiceReference: "INV-104",
    notes: "Weekly produce",
    adjustment: 25.5,
    lines: [{ vendorItemId, quantity: 2 }],
};

describe("Organization Purchase service", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getStoreById.mockClear();
        getVendorById.mockClear();
        getVendorItemById.mockClear();
        getUnitById.mockClear();
        getPurchasesByOrganizationId.mockClear();
        getPurchaseById.mockClear();
        createPurchaseRepo.mockClear();
        updatePurchaseRepo.mockClear();
        replacePurchaseLinesRepo.mockClear();
        deletePurchaseRepo.mockClear();

        getOrganizationByIdForUser.mockResolvedValue({ id: organizationId, name: "Demo Org" });
        getStoreById.mockResolvedValue({ id: storeId, organizationId, name: "Adajan" });
        resetStoredPurchase(draftPurchase);
        getPurchasesByOrganizationId.mockResolvedValue([draftPurchase]);
    });

    test("lists Purchases for a member with Store, Vendor, lifecycle, totals, and due amount", async () => {
        const response = await purchasesService.getPurchases(userId, organizationId);

        expect(response.status).toBe("success");
        expect(response.data?.purchases).toHaveLength(1);
        expect(response.data?.purchases[0]?.storeName).toBe("Adajan");
        expect(response.data?.purchases[0]?.vendorName).toBe("Fresh Farms");
        expect(response.data?.purchases[0]?.lifecycle).toBe("draft");
        expect(response.data?.purchases[0]?.total).toBe(106.5);
        expect(response.data?.purchases[0]?.dueAmount).toBeNull();
    });

    test("denies Purchase listing when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);

        const response = await purchasesService.getPurchases(userId, otherOrganizationId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(getPurchasesByOrganizationId).not.toHaveBeenCalled();
    });

    test("creates a Draft Purchase without Payable Status, due amount, or payment", async () => {
        const response = await purchasesService.createDraftPurchase(userId, organizationId, createPayload);

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.purchase.lifecycle).toBe("draft");
        expect(response.data?.purchase.payableStatus).toBeNull();
        expect(response.data?.purchase.paidTotal).toBe(0);
        expect(response.data?.purchase.dueAmount).toBeNull();
        expect(createPurchaseRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                organizationId,
                storeId,
                vendorId,
                vendorName: "Fresh Farms",
                lifecycle: "draft",
                payableStatus: null,
                paidTotal: 0,
                dueAmount: null,
                recordedAt: null,
            }),
            expect.anything(),
        );
    });

    test("prefills agreed unit price from the Vendor Item and snapshots names and Unit label", async () => {
        const response = await purchasesService.createDraftPurchase(userId, organizationId, createPayload);

        expect(response.status).toBe("success");
        expect(response.data?.purchase.lines[0]?.agreedUnitPrice).toBe(40.5);
        expect(response.data?.purchase.lines[0]?.vendorItemName).toBe("Tomato");
        expect(response.data?.purchase.lines[0]?.unitLabel).toBe("kg");
        expect(response.data?.purchase.lines[0]?.lineTotal).toBe(81);
        expect(response.data?.purchase.linesTotal).toBe(81);
        expect(response.data?.purchase.total).toBe(106.5);
        expect(response.data?.purchase.adjustment).toBe(25.5);
    });

    test("rejects a Draft Purchase for a Store that does not belong to the Organization", async () => {
        getStoreById.mockResolvedValue(null);

        const response = await purchasesService.createDraftPurchase(userId, organizationId, createPayload);

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(response.message).toBe("Store not found");
        expect(createPurchaseRepo).not.toHaveBeenCalled();
    });

    test("rejects a Draft Purchase from an inactive Vendor", async () => {
        const response = await purchasesService.createDraftPurchase(userId, organizationId, {
            ...createPayload,
            vendorId: inactiveVendorId,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toMatch(/active Vendor/i);
        expect(createPurchaseRepo).not.toHaveBeenCalled();
    });

    test("rejects a Vendor Item that does not belong to the selected Vendor", async () => {
        const response = await purchasesService.createDraftPurchase(userId, organizationId, {
            ...createPayload,
            lines: [{ vendorItemId: millersTomatoItemId, quantity: 1 }],
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(createPurchaseRepo).not.toHaveBeenCalled();
    });

    test("rejects an inactive Vendor Item on a Draft Purchase", async () => {
        const response = await purchasesService.createDraftPurchase(userId, organizationId, {
            ...createPayload,
            lines: [{ vendorItemId: onionItemId, quantity: 1 }],
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(createPurchaseRepo).not.toHaveBeenCalled();
    });

    test("rejects a Draft Purchase whose adjustment makes the total negative", async () => {
        const response = await purchasesService.createDraftPurchase(userId, organizationId, {
            ...createPayload,
            adjustment: -200,
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toMatch(/cannot be negative/i);
        expect(createPurchaseRepo).not.toHaveBeenCalled();
    });

    test("edits a Draft Purchase lines, adjustment, and notes", async () => {
        const response = await purchasesService.updateDraftPurchase(userId, organizationId, purchaseId, {
            notes: "Updated notes",
            adjustment: -1.5,
            lines: [{ vendorItemId, quantity: 3, agreedUnitPrice: 41 }],
        });

        expect(response.status).toBe("success");
        expect(response.data?.purchase.notes).toBe("Updated notes");
        expect(response.data?.purchase.adjustment).toBe(-1.5);
        expect(response.data?.purchase.lines[0]?.quantity).toBe(3);
        expect(response.data?.purchase.lines[0]?.agreedUnitPrice).toBe(41);
        expect(response.data?.purchase.payableStatus).toBeNull();
        expect(updatePurchaseRepo).toHaveBeenCalled();
    });

    test("does not allow editing a recorded Purchase", async () => {
        resetStoredPurchase(recordedPurchase);

        const response = await purchasesService.updateDraftPurchase(userId, organizationId, purchaseId, {
            notes: "should fail",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toMatch(/Draft Purchase can be edited/i);
        expect(updatePurchaseRepo).not.toHaveBeenCalled();
    });

    test("discards a Draft Purchase", async () => {
        const response = await purchasesService.discardDraftPurchase(userId, organizationId, purchaseId);

        expect(response.status).toBe("success");
        expect(response.data?.discarded).toBe(true);
        expect(deletePurchaseRepo).toHaveBeenCalledWith(organizationId, purchaseId);
    });

    test("does not discard a recorded Purchase", async () => {
        resetStoredPurchase(recordedPurchase);

        const response = await purchasesService.discardDraftPurchase(userId, organizationId, purchaseId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(deletePurchaseRepo).not.toHaveBeenCalled();
    });

    test("records a valid Draft Purchase as a due-only payable with paid total of zero", async () => {
        const response = await purchasesService.recordPurchase(userId, organizationId, purchaseId);

        expect(response.status).toBe("success");
        expect(response.data?.purchase.lifecycle).toBe("recorded");
        expect(response.data?.purchase.payableStatus).toBe("due");
        expect(response.data?.purchase.paidTotal).toBe(0);
        expect(response.data?.purchase.dueAmount).toBe(106.5);
        expect(response.data?.purchase.total).toBe(106.5);
        expect(response.data?.purchase.recordedAt).toBeTruthy();
        expect(updatePurchaseRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                lifecycle: "recorded",
                payableStatus: "due",
                paidTotal: 0,
                dueAmount: 106.5,
            }),
            expect.anything(),
        );
    });

    test("does not record a Draft Purchase without Purchase Lines", async () => {
        resetStoredPurchase({ ...draftPurchase, lines: [], linesTotal: 0, total: 0, adjustment: 0 });

        const response = await purchasesService.recordPurchase(userId, organizationId, purchaseId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(response.message).toMatch(/at least one Purchase Line/i);
        expect(updatePurchaseRepo).not.toHaveBeenCalled();
    });

    test("does not record when the Vendor is no longer active", async () => {
        getVendorById.mockImplementation(async () => ({ ...freshFarmsVendor, status: "inactive" as const }));

        const response = await purchasesService.recordPurchase(userId, organizationId, purchaseId);

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(updatePurchaseRepo).not.toHaveBeenCalled();
    });

    test("recorded Purchase snapshots remain the stored Vendor Item name after later catalog changes", async () => {
        resetStoredPurchase(recordedPurchase);
        getVendorItemById.mockResolvedValue({ ...tomatoItem, name: "Roma Tomato", defaultPurchasePrice: 99 });

        const response = await purchasesService.getPurchaseDetails(userId, organizationId, purchaseId);

        expect(response.status).toBe("success");
        expect(response.data?.purchase.lines[0]?.vendorItemName).toBe("Tomato");
        expect(response.data?.purchase.lines[0]?.agreedUnitPrice).toBe(40.5);
        expect(response.data?.purchase.vendorName).toBe("Fresh Farms");
    });
});
