import { describe, expect, test } from "bun:test";

import { getComposerItemPricing } from "./combo-pricing";

describe("Combo composer pricing", () => {
    test("includes option adjustments and nested add-on discounts", () => {
        const pricing = getComposerItemPricing({
            unitPrice: 100,
            unitDiscount: 0,
            quantity: 2,
            addOns: [],
            comboSelections: [{
                quantity: 1,
                priceAdjustment: 10,
                addOns: [{ quantity: 1, unitPrice: 20, unitDiscount: 5 }],
            }],
        });

        expect(pricing.subtotal).toBe(260);
        expect(pricing.lineDiscountTotal).toBe(10);
        expect(pricing.lineTotal).toBe(250);
    });

    test("multiplies repeated Combo options by the parent quantity", () => {
        const pricing = getComposerItemPricing({
            unitPrice: 80,
            unitDiscount: 5,
            quantity: 3,
            addOns: [],
            comboSelections: [{
                quantity: 2,
                priceAdjustment: 10,
                addOns: [],
            }],
        });

        expect(pricing.subtotal).toBe(300);
        expect(pricing.lineDiscountTotal).toBe(15);
        expect(pricing.lineTotal).toBe(285);
    });

    test("keeps regular product add-ons in the same calculation", () => {
        const pricing = getComposerItemPricing({
            unitPrice: 100,
            unitDiscount: 10,
            quantity: 1,
            addOns: [{ quantity: 2, unitPrice: 20, unitDiscount: 2 }],
            comboSelections: [],
        });

        expect(pricing.subtotal).toBe(140);
        expect(pricing.lineDiscountTotal).toBe(14);
        expect(pricing.lineTotal).toBe(126);
    });
});
