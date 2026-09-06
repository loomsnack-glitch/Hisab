import { describe, expect, it } from "bun:test";
import { buildPosTableKotPayload } from "./pos-kot-boundary";

describe("POS KOT boundary", () => {
    it("maps Cart identity and service mode without client prices", () => {
        const payload = buildPosTableKotPayload({
            requestId: "request-1",
            serviceMode: "dine_in",
            customer: null,
            items: [{
                id: "product-1",
                categoryId: "category-1",
                name: "Tea",
                price: 40,
                discount: 0,
                productType: "single",
                quantity: 2,
                lineId: "product-1",
            }],
        });

        expect(payload).toEqual({
            requestId: "request-1",
            items: [{ productId: "product-1", quantity: 2, addOns: [], comboSelections: undefined }],
            fulfillmentType: "dine_in",
            customerId: null,
            notes: null,
        });
        expect(JSON.stringify(payload)).not.toContain("price");
    });
});
