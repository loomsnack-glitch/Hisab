import { describe, expect, it } from "bun:test";
import type { ProductResponseDTO } from "@repo/types";
import { buildPosDraftPayload, buildPosDraftUpdatePayload, mapPosCartItemsToSaleInputs } from "./pos-draft-boundary";

const item = {
    id: "product-1",
    categoryId: "category-1",
    name: "Masala Tea",
    price: 40,
    discount: 5,
    productType: "single",
    quantity: 2,
    lineId: "product-1",
    configuration: {
        addOns: [{ addOnId: "addon-1", quantity: 1, unitPrice: 10, unitDiscount: 1 }],
        comboSelections: [{
            groupId: "group-1",
            optionProductId: "option-1",
            quantity: 1,
            priceAdjustment: 5,
            addOns: [{ addOnId: "addon-2", quantity: 2, unitPrice: 8, unitDiscount: 2 }],
        }],
    },
} as unknown as ProductResponseDTO & { quantity: number; lineId: string };

describe("POS Draft boundary", () => {
    it("maps Cart identity and configured selections without client prices", () => {
        expect(mapPosCartItemsToSaleInputs([item])).toEqual([{
            productId: "product-1",
            quantity: 2,
            addOns: [{ addOnId: "addon-1", quantity: 1 }],
            comboSelections: [{
                groupId: "group-1",
                optionProductId: "option-1",
                quantity: 1,
                addOns: [{ addOnId: "addon-2", quantity: 2 }],
            }],
        }]);
        expect(JSON.stringify(mapPosCartItemsToSaleInputs([item]))).not.toContain("price");
    });

    it("maps the effective order discount and customer for create/update", () => {
        const input = {
            items: [item],
            customer: { id: "customer-1", name: "Asha", phone: null },
            discount: { mode: "percent" as const, value: 10 },
            draftRequestId: "11111111-1111-4111-8111-111111111111",
        };

        expect(buildPosDraftPayload(input)).toMatchObject({
            draftRequestId: input.draftRequestId,
            customerId: "customer-1",
            orderDiscountAmount: 12.2,
            serviceMode: "dine_in",
        });
        expect(buildPosDraftUpdatePayload(input)).toMatchObject({
            customerId: "customer-1",
            orderDiscountAmount: 12.2,
            serviceMode: "dine_in",
        });
        expect(buildPosDraftUpdatePayload(input)).not.toHaveProperty("draftRequestId");

        expect(buildPosDraftPayload({ ...input, serviceMode: "pick_up" })).toMatchObject({
            serviceMode: "pick_up",
        });
    });
});
