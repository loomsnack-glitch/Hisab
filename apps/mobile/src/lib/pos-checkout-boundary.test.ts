import { describe, expect, it } from "bun:test";
import type { PaymentResponse, SaleResponse, ServiceResponse, ServiceTableSaleResponse } from "@repo/types";
import {
    buildPosCommitSalePayload,
    buildPosCompleteSalePayload,
    createPosCheckoutOperation,
    createPosCollectionOperation,
    executePosCheckout,
    buildPosTableOrderCheckoutPayload,
    resolvePosCheckoutRequestId,
    type PosCheckoutCartInput,
} from "./pos-checkout-boundary";

const input: PosCheckoutCartInput = {
    draftSaleId: null,
    items: [{
        id: "product-1",
        categoryId: "category-1",
        name: "Tea",
        price: 50,
        discount: 0,
        productType: "single",
        quantity: 2,
        lineId: "product-1",
    }],
    customer: null,
    discount: null,
    payments: [{ id: "payment-1", method: "cash", amount: "100" }],
    requestId: "request-1",
};

const serverSale = { id: "sale-1", paymentStatus: "paid", grandTotal: 100 } as never;

const successSaleResponse = (): ServiceResponse<SaleResponse | null> => ({
    status: "success",
    data: { sale: serverSale },
    message: "",
    code: 200,
});

const successPaymentResponse = (): ServiceResponse<PaymentResponse | null> => ({
    status: "success",
    data: { payment: {} as never, sale: serverSale },
    message: "",
    code: 200,
});

describe("POS checkout boundary", () => {
    it("builds direct completion without client prices or draft identity", () => {
        expect(buildPosCompleteSalePayload(input)).toEqual({
            requestId: "request-1",
            customerId: null,
            orderDiscountAmount: 0,
            notes: null,
            serviceMode: "dine_in",
            generateKot: false,
            items: [{ productId: "product-1", quantity: 2, soldQuantity: 1, addOns: [], comboSelections: undefined }],
            payments: [{ amount: 100, method: "cash", referenceNumber: null, notes: null }],
        });
        expect(JSON.stringify(buildPosCompleteSalePayload(input))).not.toContain("price");
        expect(buildPosCompleteSalePayload({ ...input, serviceMode: "pick_up" }).serviceMode).toBe("pick_up");
    });

    it("builds Draft commit and chooses the Draft adapter when an id exists", () => {
        const draftInput = { ...input, draftSaleId: "draft-1" };
        expect(buildPosCommitSalePayload(draftInput).requestId).toBe("request-1");
        expect(createPosCheckoutOperation(draftInput)).toMatchObject({ kind: "draft", saleId: "draft-1" });
        expect(createPosCheckoutOperation(input)).toMatchObject({ kind: "new_sale" });
    });

    it("uses the Table Order checkout adapter for an active KOT-backed order", () => {
        const tableInput = {
            ...input,
            tableContext: {
                tableId: "table-1",
                tableLabel: "T1",
                tableOrderId: "order-1",
                draftSaleId: null,
            },
        };

        expect(createPosCheckoutOperation(tableInput)).toEqual({
            kind: "table_order",
            tableId: "table-1",
            payload: {
                requestId: "request-1",
                customerId: null,
                orderDiscountAmount: 0,
                notes: null,
                payments: [{ amount: 100, method: "cash", referenceNumber: null, notes: null }],
            },
        });
        expect(buildPosTableOrderCheckoutPayload(tableInput).requestId).toBe("request-1");
    });

    it("keeps collection as a separate one-payment operation", () => {
        expect(createPosCollectionOperation("sale-1", {
            amount: 25,
            method: "upi",
            referenceNumber: null,
            notes: null,
        })).toEqual({
            kind: "collection",
            saleId: "sale-1",
            payment: { amount: 25, method: "upi", referenceNumber: null, notes: null },
        });
    });

    it("reuses a completion request id instead of generating a new one", () => {
        let generated = 0;
        const createRequestId = () => {
            generated += 1;
            return "request-new";
        };

        expect(resolvePosCheckoutRequestId(null, createRequestId)).toBe("request-new");
        expect(resolvePosCheckoutRequestId("request-existing", createRequestId)).toBe("request-existing");
        expect(generated).toBe(1);
    });

    it("dispatches only the selected operation and returns server Sale data", async () => {
        const calls: string[] = [];
        const services = {
            complete: async () => {
                calls.push("complete");
                return successSaleResponse();
            },
            commit: async () => {
                calls.push("commit");
                return successSaleResponse();
            },
            collect: async () => {
                calls.push("collect");
                return successPaymentResponse();
            },
            tableCheckout: async (): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
                calls.push("table_checkout");
                return { status: "success", data: { table: {} as never, sale: serverSale, tableOrder: null }, message: "", code: 200 };
            },
        };

        await executePosCheckout(createPosCheckoutOperation(input), services);
        await executePosCheckout(createPosCheckoutOperation({ ...input, draftSaleId: "draft-1" }), services);
        await executePosCheckout(createPosCollectionOperation("sale-1", {
            amount: 25,
            method: "card",
            referenceNumber: null,
            notes: null,
        }), services);
        await executePosCheckout(createPosCheckoutOperation({ ...input, tableContext: {
            tableId: "table-1",
            tableLabel: "T1",
            tableOrderId: "order-1",
            draftSaleId: null,
        } }), services);

        expect(calls).toEqual(["complete", "commit", "collect", "table_checkout"]);
    });

    it("surfaces service errors without inventing a local Sale", async () => {
        await expect(executePosCheckout(createPosCheckoutOperation(input), {
            complete: async () => ({ status: "error", data: null, message: "Network unavailable", code: 500 }),
            commit: async () => ({ status: "error", data: null, message: "unused", code: 500 }),
            collect: async () => ({ status: "error", data: null, message: "unused", code: 500 }),
        })).rejects.toThrow("Network unavailable");
    });
});
