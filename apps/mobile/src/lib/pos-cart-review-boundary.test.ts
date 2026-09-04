import { describe, expect, it } from "bun:test";
import { resolvePosCartConfiguration } from "./pos-cart-review-boundary";

describe("POS Cart Review boundary", () => {
    it("resolves configured IDs to current names and preserves quantities", () => {
        const result = resolvePosCartConfiguration(
            {
                addOns: [{ addOnId: "sugar", quantity: 2 }],
                comboSelections: [{
                    groupId: "side-group",
                    optionProductId: "fries",
                    quantity: 1,
                    addOns: [{ addOnId: "spice", quantity: 1 }],
                }],
            },
            {
                addOnNames: new Map([["sugar", "Extra sugar"], ["spice", "Extra spice"]]),
                comboGroups: [{ id: "side-group", name: "Choose a side", options: [{ optionProductId: "fries", name: "Fries" }] }],
            },
        );

        expect(result).toEqual({
            addOns: [{ addOnId: "sugar", quantity: 2, name: "Extra sugar" }],
            comboSelections: [{
                groupId: "side-group",
                optionProductId: "fries",
                quantity: 1,
                addOns: [{ addOnId: "spice", quantity: 1, name: "Extra spice" }],
                groupName: "Choose a side",
                optionName: "Fries",
            }],
        });
    });

    it("keeps unknown configuration IDs visible and omits zero quantities", () => {
        const result = resolvePosCartConfiguration(
            {
                addOns: [{ addOnId: "missing", quantity: 1 }, { addOnId: "zero", quantity: 0 }],
                comboSelections: [],
            },
            { addOnNames: new Map(), comboGroups: [] },
        );

        expect(result.addOns).toEqual([{ addOnId: "missing", quantity: 1, name: "missing" }]);
    });
});
