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

    test("reads Purchases and records an Outgoing Payment through administrator endpoints", async () => {
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

        expect(requests).toEqual([
            "GET /organizations/org-id/purchases",
            "GET /organizations/org-id/purchases/purchase-id",
            "POST /organizations/org-id/purchases/purchase-id/payments",
        ]);
    });
});
