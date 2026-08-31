import { beforeEach, describe, expect, test } from "bun:test";
import {
    adajanCashAccount,
    cashMoneyAccountId,
    createMoneyAccountMovementRepo,
    createOutgoingPaymentRepo,
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
    hdfcBankAccount,
    inactiveVendorId,
    isMoneyAccountTrackingActive,
    lockMoneyAccountById,
    lockPaymentRouteByStoreAndMethod,
    lockPurchaseById,
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
        lockPurchaseById.mockClear();
        createOutgoingPaymentRepo.mockClear();
        createMoneyAccountMovementRepo.mockClear();
        lockMoneyAccountById.mockClear();
        lockPaymentRouteByStoreAndMethod.mockClear();
        isMoneyAccountTrackingActive.mockClear();

        getOrganizationByIdForUser.mockResolvedValue({ id: organizationId, name: "Demo Org" });
        getStoreById.mockResolvedValue({ id: storeId, organizationId, name: "Adajan" });
        isMoneyAccountTrackingActive.mockResolvedValue(false);
        lockMoneyAccountById.mockResolvedValue(adajanCashAccount);
        createMoneyAccountMovementRepo.mockResolvedValue({
            id: "14141414-1414-4141-8141-141414141414",
            organizationId,
            moneyAccountId: cashMoneyAccountId,
            storeId,
            amount: -40,
            occurredAt: new Date("2026-08-31T12:00:00.000Z"),
            sourceKind: "outgoing_purchase_payment" as const,
            paymentId: null,
            outgoingPaymentId: "12121212-1212-4121-8121-121212121212",
            reversedMovementId: null,
            createdAt: new Date("2026-08-31T12:00:00.000Z"),
        });
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

    test("Vendor Outstanding sums due amounts from recorded Purchases only", async () => {
        getPurchasesByOrganizationId.mockResolvedValue([
            draftPurchase,
            recordedPurchase,
            {
                ...recordedPurchase,
                id: "77777777-7777-4777-8777-777777777777",
                payableStatus: "paid",
                paidTotal: 106.5,
                dueAmount: 0,
            },
        ]);

        const response = await purchasesService.getPurchases(userId, organizationId);

        expect(response.status).toBe("success");
        expect(response.data?.vendorOutstanding).toEqual([
            { vendorId, vendorName: "Fresh Farms", outstandingAmount: 106.5 },
        ]);
    });

    test("records an untracked Cash Outgoing Payment without a Money Account Movement", async () => {
        resetStoredPurchase(recordedPurchase);

        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash", reference: "CASH-1" },
        );

        expect(response.status).toBe("success");
        expect(response.code).toBe(201);
        expect(response.data?.purchase.payableStatus).toBe("partial");
        expect(response.data?.purchase.paidTotal).toBe(40);
        expect(response.data?.purchase.dueAmount).toBe(66.5);
        expect(response.data?.purchase.outgoingPayments).toHaveLength(1);
        expect(response.data?.purchase.outgoingPayments[0]?.paymentMethod).toBe("cash");
        expect(response.data?.purchase.outgoingPayments[0]?.moneyAccountId).toBeNull();
        expect(createOutgoingPaymentRepo).toHaveBeenCalled();
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
        expect(lockMoneyAccountById).not.toHaveBeenCalled();
        expect(lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("rejects Bank Transfer and Other without Money Account Tracking", async () => {
        resetStoredPurchase(recordedPurchase);

        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "bank_transfer", moneyAccountId: hdfcBankAccount.id },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
    });

    test("rejects an Outgoing Payment on a Draft Purchase", async () => {
        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
    });

    test("rejects an Outgoing Payment that would overpay the remaining due", async () => {
        resetStoredPurchase(recordedPurchase);

        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 106.51, paymentMethod: "upi" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
    });

    test("accepts a later partial payment until the Purchase is paid", async () => {
        resetStoredPurchase(recordedPurchase);

        const first = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash" },
        );
        const second = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 66.5, paymentMethod: "upi" },
        );

        expect(first.data?.purchase.payableStatus).toBe("partial");
        expect(second.status).toBe("success");
        expect(second.data?.purchase.payableStatus).toBe("paid");
        expect(second.data?.purchase.paidTotal).toBe(106.5);
        expect(second.data?.purchase.dueAmount).toBe(0);
        expect(second.data?.purchase.outgoingPayments).toHaveLength(2);
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
    });

    test("records a tracked Cash payment as one negative Movement on the selected eligible account", async () => {
        resetStoredPurchase(recordedPurchase);
        isMoneyAccountTrackingActive.mockResolvedValue(true);

        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );

        expect(response.status).toBe("success");
        expect(response.data?.purchase.payableStatus).toBe("partial");
        expect(lockMoneyAccountById).toHaveBeenCalledWith(
            organizationId,
            cashMoneyAccountId,
            expect.anything(),
        );
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                moneyAccountId: cashMoneyAccountId,
                storeId,
                amount: -40,
                sourceKind: "outgoing_purchase_payment",
                paymentId: null,
            }),
            expect.anything(),
        );
        expect(lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("records a tracked Bank Transfer against an Organization-wide Bank account", async () => {
        resetStoredPurchase(recordedPurchase);
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        lockMoneyAccountById.mockResolvedValue(hdfcBankAccount);

        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "bank_transfer", moneyAccountId: hdfcBankAccount.id },
        );

        expect(response.status).toBe("success");
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                moneyAccountId: hdfcBankAccount.id,
                amount: -40,
                sourceKind: "outgoing_purchase_payment",
            }),
            expect.anything(),
        );
        expect(lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("rejects a tracked payment when the selected Money Account has insufficient balance", async () => {
        resetStoredPurchase(recordedPurchase);
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        lockMoneyAccountById.mockResolvedValue({ ...adajanCashAccount, balance: 10 });

        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );

        expect(response.status).toBe("error");
        expect(response.message).toMatch(/sufficient balance/i);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
        expect(updatePurchaseRepo).not.toHaveBeenCalled();
    });

    test("rejects a tracked payment for an ineligible or other-Store Money Account", async () => {
        resetStoredPurchase(recordedPurchase);
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        lockMoneyAccountById.mockResolvedValue(hdfcBankAccount);

        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash", moneyAccountId: hdfcBankAccount.id },
        );

        expect(response.status).toBe("error");
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
    });

    test("does not backfill an untracked payment after tracking is enabled", async () => {
        resetStoredPurchase(recordedPurchase);

        const untracked = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash" },
        );
        expect(untracked.status).toBe("success");
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();

        isMoneyAccountTrackingActive.mockResolvedValue(true);
        const tracked = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 20, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );

        expect(tracked.status).toBe("success");
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledTimes(1);
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledWith(
            expect.objectContaining({ amount: -20 }),
            expect.anything(),
        );
        expect(lockPaymentRouteByStoreAndMethod).not.toHaveBeenCalled();
    });

    test("rolls back Purchase settlement when the Money Account Movement cannot be created", async () => {
        resetStoredPurchase(recordedPurchase);
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        createMoneyAccountMovementRepo.mockResolvedValue(null);

        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );

        expect(response.status).toBe("error");
        expect(updatePurchaseRepo).not.toHaveBeenCalled();
    });

    test("denies Outgoing Payments when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);
        resetStoredPurchase(recordedPurchase);

        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            otherOrganizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash" },
        );

        expect(response.status).toBe("error");
        expect(response.code).toBe(404);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
        expect(lockPurchaseById).not.toHaveBeenCalled();
    });
});
