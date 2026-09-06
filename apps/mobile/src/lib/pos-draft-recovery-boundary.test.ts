import { describe, expect, it } from "bun:test";
import type { ProductResponseDTO, SaleDetailDTO } from "@repo/types";
import { buildPosCartFromDraft } from "./pos-draft-recovery-boundary";

const product = { id: "product-1", categoryId: "category-1", name: "Tea", price: 40, discount: 0, productType: "single" } as ProductResponseDTO;
const sale = {
    items: [{
        id: "item-1",
        productId: "product-1",
        quantity: 2,
        addOns: [{ addOnId: "addon-1", quantityPerParent: 1, unitPriceSnapshot: 5, unitDiscountSnapshot: 0 }],
        bundleComponents: [],
    }],
    customer: { id: "customer-1", name: "Asha", phone: null },
    orderDiscountAmount: 3,
} as unknown as SaleDetailDTO;
const configuration = {
    combos: [],
    attachments: [{ productId: "product-1", addOnId: "addon-1", status: "active", addOn: { status: "active" } }],
} as never;

describe("POS Draft recovery boundary", () => {
    it("hydrates current Catalog Products while retaining Customer, discount, and configured values", () => {
        expect(buildPosCartFromDraft(sale, [product], configuration)).toMatchObject({
            kind: "success",
            customer: { id: "customer-1", name: "Asha" },
            discount: { mode: "amount", value: 3 },
            items: [{ id: "product-1", quantity: 2, configuration: { addOns: [{ addOnId: "addon-1", quantity: 1, unitPrice: 5 }] } }],
        });
    });

    it("fails atomically when a Draft Product is no longer in the current Catalog", () => {
        expect(buildPosCartFromDraft(sale, [], configuration)).toEqual({ kind: "invalid", reason: "missing-product", productId: "product-1" });
    });

    it("rejects incomplete combo configuration instead of dropping it", () => {
        const comboSale = { ...sale, items: [{ ...sale.items[0], addOns: [], bundleComponents: [{ componentProductId: "option-1", quantityPerBundle: 1, priceAdjustmentSnapshot: 0, choiceGroupId: null, addOns: [] }] }] } as unknown as SaleDetailDTO;
        const comboProduct = { ...product, productType: "combo" } as ProductResponseDTO;
        expect(buildPosCartFromDraft(comboSale, [comboProduct], { combos: [], attachments: [] })).toEqual({ kind: "invalid", reason: "missing-combo-group" });
    });
});
