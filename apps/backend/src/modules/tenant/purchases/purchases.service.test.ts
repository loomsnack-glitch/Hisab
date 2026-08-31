import { beforeEach, describe, expect, test } from "bun:test";
import {
    adajanCashAccount,
    cashMoneyAccountId,
    createMoneyAccountMovementRepo,
    createOutgoingPaymentRepo,
    reverseOutgoingPaymentRepo,
    createPurchaseRepo,
    deletePurchaseRepo,
    draftPurchase,
    freshFarmsVendor,
    getOrganizationByIdForUser,
    getPurchaseById,
    getPurchasesByOrganizationId,
    getMovementByOutgoingPaymentId,
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
    outgoingPaymentId,
    purchaseId,
    purchasesService,
    recordedPurchase,
    replacePurchaseLinesRepo,
    resetStoredPurchase,
    restoreCreateMoneyAccountMovementRepo,
    storeId,
    tomatoItem,
    tomatoLine,
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
        reverseOutgoingPaymentRepo.mockClear();
        createMoneyAccountMovementRepo.mockClear();
        restoreCreateMoneyAccountMovementRepo();
        getMovementByOutgoingPaymentId.mockClear();
        lockMoneyAccountById.mockClear();
        lockPaymentRouteByStoreAndMethod.mockClear();
        isMoneyAccountTrackingActive.mockClear();

        getOrganizationByIdForUser.mockResolvedValue({ id: organizationId, name: "Demo Org" });
        getStoreById.mockResolvedValue({ id: storeId, organizationId, name: "Adajan" });
        isMoneyAccountTrackingActive.mockResolvedValue(false);
        lockMoneyAccountById.mockResolvedValue(adajanCashAccount);
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

    test("combines the same Vendor Item at the same agreed unit price into one Purchase Line", async () => {
        const response = await purchasesService.createDraftPurchase(userId, organizationId, {
            ...createPayload,
            adjustment: 0,
            lines: [
                { vendorItemId, quantity: 1, agreedUnitPrice: 12 },
                { vendorItemId, quantity: 1, agreedUnitPrice: 12 },
            ],
        });

        expect(response.status).toBe("success");
        expect(response.data?.purchase.lines).toHaveLength(1);
        expect(response.data?.purchase.lines[0]?.vendorItemId).toBe(vendorItemId);
        expect(response.data?.purchase.lines[0]?.quantity).toBe(2);
        expect(response.data?.purchase.lines[0]?.agreedUnitPrice).toBe(12);
        expect(response.data?.purchase.lines[0]?.lineTotal).toBe(24);
        expect(response.data?.purchase.linesTotal).toBe(24);
        expect(response.data?.purchase.total).toBe(24);
    });

    test("keeps the same Vendor Item as separate Purchase Lines when agreed unit prices differ", async () => {
        const response = await purchasesService.createDraftPurchase(userId, organizationId, {
            ...createPayload,
            adjustment: 0,
            lines: [
                { vendorItemId, quantity: 1, agreedUnitPrice: 12 },
                { vendorItemId, quantity: 1, agreedUnitPrice: 10 },
            ],
        });

        expect(response.status).toBe("success");
        expect(response.data?.purchase.lines).toHaveLength(2);
        expect(response.data?.purchase.lines[0]?.agreedUnitPrice).toBe(12);
        expect(response.data?.purchase.lines[0]?.quantity).toBe(1);
        expect(response.data?.purchase.lines[1]?.agreedUnitPrice).toBe(10);
        expect(response.data?.purchase.lines[1]?.quantity).toBe(1);
        expect(response.data?.purchase.linesTotal).toBe(22);
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
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
    });

    test("records a Draft Purchase paid in full with an immediate Outgoing Payment", async () => {
        const response = await purchasesService.recordPurchase(userId, organizationId, purchaseId, {
            payment: { amount: 106.5, paymentMethod: "cash" },
        });

        expect(response.status).toBe("success");
        expect(response.data?.purchase.lifecycle).toBe("recorded");
        expect(response.data?.purchase.payableStatus).toBe("paid");
        expect(response.data?.purchase.paidTotal).toBe(106.5);
        expect(response.data?.purchase.dueAmount).toBe(0);
        expect(response.data?.purchase.outgoingPayments).toHaveLength(1);
        expect(response.data?.purchase.outgoingPayments[0]?.paymentMethod).toBe("cash");
        expect(createOutgoingPaymentRepo).toHaveBeenCalled();
        expect(createMoneyAccountMovementRepo).not.toHaveBeenCalled();
    });

    test("records a Draft Purchase with a partial Outgoing Payment", async () => {
        const response = await purchasesService.recordPurchase(userId, organizationId, purchaseId, {
            payment: { amount: 40, paymentMethod: "upi" },
        });

        expect(response.status).toBe("success");
        expect(response.data?.purchase.payableStatus).toBe("partial");
        expect(response.data?.purchase.paidTotal).toBe(40);
        expect(response.data?.purchase.dueAmount).toBe(66.5);
        expect(response.data?.purchase.outgoingPayments[0]?.paymentMethod).toBe("upi");
    });

    test("does not record a Draft Purchase when the immediate Outgoing Payment would overpay", async () => {
        const response = await purchasesService.recordPurchase(userId, organizationId, purchaseId, {
            payment: { amount: 200, paymentMethod: "cash" },
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(409);
        expect(response.message).toMatch(/cannot exceed the remaining due/i);
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
    });

    test("records a Draft Purchase by combining same-price lines for the same Vendor Item", async () => {
        resetStoredPurchase({
            ...draftPurchase,
            adjustment: 0,
            linesTotal: 24,
            total: 24,
            lines: [
                { ...tomatoLine, quantity: 1, agreedUnitPrice: 12, lineTotal: 12 },
                {
                    ...tomatoLine,
                    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab",
                    quantity: 1,
                    agreedUnitPrice: 12,
                    lineTotal: 12,
                },
            ],
        });

        const response = await purchasesService.recordPurchase(userId, organizationId, purchaseId);

        expect(response.status).toBe("success");
        expect(response.data?.purchase.lines).toHaveLength(1);
        expect(response.data?.purchase.lines[0]?.quantity).toBe(2);
        expect(response.data?.purchase.lines[0]?.agreedUnitPrice).toBe(12);
        expect(response.data?.purchase.lines[0]?.lineTotal).toBe(24);
        expect(response.data?.purchase.total).toBe(24);
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
        createMoneyAccountMovementRepo.mockResolvedValueOnce(null);

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

    test("reverses an untracked Outgoing Payment with a reason and recalculates Payable Status", async () => {
        resetStoredPurchase(recordedPurchase);
        const created = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash" },
        );
        const paymentId = created.data?.purchase.outgoingPayments[0]?.id;
        expect(paymentId).toBeDefined();

        const response = await purchasesService.reverseOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            paymentId as string,
            { reason: "Wrong amount" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.purchase.payableStatus).toBe("due");
        expect(response.data?.purchase.paidTotal).toBe(0);
        expect(response.data?.purchase.dueAmount).toBe(106.5);
        expect(response.data?.purchase.outgoingPayments[0]?.amount).toBe(40);
        expect(response.data?.purchase.outgoingPayments[0]?.reversedAt).not.toBeNull();
        expect(response.data?.purchase.outgoingPayments[0]?.reversalReason).toBe("Wrong amount");
        expect(response.data?.purchase.outgoingPayments[0]?.reversalKind).toBe("payment_reversal");
        expect(createMoneyAccountMovementRepo.mock.calls.some((call) => {
            const movement = call[0] as { sourceKind?: string };
            return movement.sourceKind === "outgoing_purchase_payment_reversal";
        })).toBe(false);
    });

    test("retries of an already reversed payment are idempotent and do not write another reversal", async () => {
        resetStoredPurchase(recordedPurchase);
        const created = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash" },
        );
        const paymentId = created.data?.purchase.outgoingPayments[0]?.id as string;

        const first = await purchasesService.reverseOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            paymentId,
            { reason: "Wrong amount" },
        );
        reverseOutgoingPaymentRepo.mockClear();
        const second = await purchasesService.reverseOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            paymentId,
            { reason: "Wrong amount" },
        );

        expect(first.status).toBe("success");
        expect(second.status).toBe("success");
        expect(second.data?.purchase.outgoingPayments).toHaveLength(1);
        expect(reverseOutgoingPaymentRepo).not.toHaveBeenCalled();
    });

    test("a tracked payment reversal writes one positive compensating Movement in the original account", async () => {
        resetStoredPurchase(recordedPurchase);
        isMoneyAccountTrackingActive.mockResolvedValue(true);

        const created = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );
        const paymentId = created.data?.purchase.outgoingPayments[0]?.id as string;
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledTimes(1);

        const response = await purchasesService.reverseOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            paymentId,
            { reason: "Paid from the wrong till" },
        );

        expect(response.status).toBe("success");
        expect(response.data?.purchase.payableStatus).toBe("due");
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledTimes(2);
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                moneyAccountId: cashMoneyAccountId,
                amount: 40,
                sourceKind: "outgoing_purchase_payment_reversal",
                paymentId: null,
                outgoingPaymentId: null,
                reversedMovementId: expect.any(String),
            }),
            expect.anything(),
        );
    });

    test("a tracked payment reversal still credits the original account after tracking is turned off", async () => {
        resetStoredPurchase(recordedPurchase);
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        const created = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );
        const paymentId = created.data?.purchase.outgoingPayments[0]?.id as string;
        isMoneyAccountTrackingActive.mockResolvedValue(false);

        const response = await purchasesService.reverseOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            paymentId,
            { reason: "Paid from the wrong till" },
        );

        expect(response.status).toBe("success");
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                moneyAccountId: cashMoneyAccountId,
                amount: 40,
                sourceKind: "outgoing_purchase_payment_reversal",
            }),
            expect.anything(),
        );
    });

    test("rolls back payment reversal when the compensating Movement cannot be created", async () => {
        resetStoredPurchase(recordedPurchase);
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        const created = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );
        const paymentId = created.data?.purchase.outgoingPayments[0]?.id as string;
        createMoneyAccountMovementRepo.mockResolvedValueOnce(null);
        updatePurchaseRepo.mockClear();

        const response = await purchasesService.reverseOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            paymentId,
            { reason: "Wrong amount" },
        );

        expect(response.status).toBe("error");
        expect(updatePurchaseRepo).not.toHaveBeenCalled();
    });

    test("voids a recorded Purchase with a reason, cancels remaining due, and reverses only active payments once", async () => {
        resetStoredPurchase(recordedPurchase);
        await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash" },
        );

        const response = await purchasesService.voidPurchase(userId, organizationId, purchaseId, {
            reason: "Entered against the wrong Vendor",
        });

        expect(response.status).toBe("success");
        expect(response.data?.purchase.lifecycle).toBe("voided");
        expect(response.data?.purchase.payableStatus).toBeNull();
        expect(response.data?.purchase.dueAmount).toBeNull();
        expect(response.data?.purchase.paidTotal).toBe(0);
        expect(response.data?.purchase.voidReason).toBe("Entered against the wrong Vendor");
        expect(response.data?.purchase.outgoingPayments[0]?.reversalKind).toBe("payable_void");
        expect(response.data?.purchase.outgoingPayments[0]?.amount).toBe(40);
        expect(response.data?.purchase.total).toBe(106.5);
    });

    test("a Purchase void reverses mixed tracked and untracked payments without duplicating already reversed payments", async () => {
        resetStoredPurchase(recordedPurchase);
        const untracked = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash" },
        );
        isMoneyAccountTrackingActive.mockResolvedValue(true);
        const tracked = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 20, paymentMethod: "cash", moneyAccountId: cashMoneyAccountId },
        );
        const untrackedId = untracked.data?.purchase.outgoingPayments[0]?.id as string;
        await purchasesService.reverseOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            untrackedId,
            { reason: "Wrong amount" },
        );
        reverseOutgoingPaymentRepo.mockClear();
        createMoneyAccountMovementRepo.mockClear();

        const response = await purchasesService.voidPurchase(userId, organizationId, purchaseId, {
            reason: "Duplicate purchase",
        });

        expect(response.status).toBe("success");
        expect(response.data?.purchase.lifecycle).toBe("voided");
        expect(reverseOutgoingPaymentRepo).toHaveBeenCalledTimes(1);
        expect(createMoneyAccountMovementRepo).toHaveBeenCalledWith(
            expect.objectContaining({
                sourceKind: "outgoing_purchase_void_reversal",
                amount: 20,
            }),
            expect.anything(),
        );
        const remaining = response.data?.purchase.outgoingPayments ?? [];
        expect(remaining.find((payment) => payment.id === untrackedId)?.reversalKind).toBe(
            "payment_reversal",
        );
        const trackedPaymentId = tracked.data?.purchase.outgoingPayments.find(
            (payment) => payment.amount === 20,
        )?.id;
        expect(remaining.find((payment) => payment.id === trackedPaymentId)?.reversalKind).toBe(
            "payable_void",
        );
    });

    test("retrying a void is idempotent and does not reverse payments again", async () => {
        resetStoredPurchase(recordedPurchase);
        await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 40, paymentMethod: "cash" },
        );
        await purchasesService.voidPurchase(userId, organizationId, purchaseId, {
            reason: "Entered against the wrong Vendor",
        });
        reverseOutgoingPaymentRepo.mockClear();

        const retry = await purchasesService.voidPurchase(userId, organizationId, purchaseId, {
            reason: "Entered against the wrong Vendor",
        });

        expect(retry.status).toBe("success");
        expect(retry.data?.purchase.lifecycle).toBe("voided");
        expect(reverseOutgoingPaymentRepo).not.toHaveBeenCalled();
    });

    test("does not void a Draft Purchase and keeps discard available", async () => {
        const response = await purchasesService.voidPurchase(userId, organizationId, purchaseId, {
            reason: "Not needed",
        });

        expect(response.status).toBe("error");
        expect(response.code).toBe(400);
        expect(reverseOutgoingPaymentRepo).not.toHaveBeenCalled();

        const discard = await purchasesService.discardDraftPurchase(userId, organizationId, purchaseId);
        expect(discard.status).toBe("success");
    });

    test("does not accept further Outgoing Payments on a voided Purchase", async () => {
        resetStoredPurchase(recordedPurchase);
        await purchasesService.voidPurchase(userId, organizationId, purchaseId, {
            reason: "Entered against the wrong Vendor",
        });
        createOutgoingPaymentRepo.mockClear();

        const response = await purchasesService.createOutgoingPurchasePayment(
            userId,
            organizationId,
            purchaseId,
            { amount: 10, paymentMethod: "cash" },
        );

        expect(response.status).toBe("error");
        expect(createOutgoingPaymentRepo).not.toHaveBeenCalled();
    });

    test("denies payment reversal and void when the user is not a member of the Organization", async () => {
        getOrganizationByIdForUser.mockResolvedValue(null);
        resetStoredPurchase(recordedPurchase);

        const reverse = await purchasesService.reverseOutgoingPurchasePayment(
            userId,
            otherOrganizationId,
            purchaseId,
            outgoingPaymentId,
            { reason: "Wrong amount" },
        );
        const voided = await purchasesService.voidPurchase(
            userId,
            otherOrganizationId,
            purchaseId,
            { reason: "Wrong Vendor" },
        );

        expect(reverse.status).toBe("error");
        expect(reverse.code).toBe(404);
        expect(voided.status).toBe("error");
        expect(voided.code).toBe(404);
        expect(lockPurchaseById).not.toHaveBeenCalled();
    });
});
