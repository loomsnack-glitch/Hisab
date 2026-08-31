import { afterEach, describe, expect, test } from "bun:test";
import { api } from "../../api";
import * as purchasesService from "./purchases.service";

describe("Purchases client service", () => {
    const originalGet = api.get;
    const originalPost = api.post;
    const originalPatch = api.patch;
    const originalDelete = api.delete;

    afterEach(() => {
        api.get = originalGet;
        api.post = originalPost;
        api.patch = originalPatch;
        api.delete = originalDelete;
    });

    test("reads Purchases and records, reverses, and voids Outgoing Payments through administrator endpoints", async () => {
        const requests: string[] = [];
        api.get = (async (url: string) => {
            requests.push(`GET ${url}`);
            return { data: { status: "success", data: null } };
        }) as typeof api.get;
        api.post = (async (url: string) => {
            requests.push(`POST ${url}`);
            return { data: { status: "success", data: null } };
        }) as typeof api.post;

        await purchasesService.getPurchases("org-id");
        await purchasesService.getPurchase("org-id", "purchase-id");
        await purchasesService.createOutgoingPurchasePayment("org-id", "purchase-id", {
            amount: 40,
            paymentMethod: "cash",
        });
        await purchasesService.reverseOutgoingPurchasePayment("org-id", "purchase-id", "payment-id", {
            reason: "Wrong amount",
        });
        await purchasesService.voidPurchase("org-id", "purchase-id", {
            reason: "Entered against the wrong Vendor",
        });

        expect(requests).toEqual([
            "GET /organizations/org-id/purchases",
            "GET /organizations/org-id/purchases/purchase-id",
            "POST /organizations/org-id/purchases/purchase-id/payments",
            "POST /organizations/org-id/purchases/purchase-id/payments/payment-id/reverse",
            "POST /organizations/org-id/purchases/purchase-id/void",
        ]);
    });
});
