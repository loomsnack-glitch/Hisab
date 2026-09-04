import { describe, expect, it } from "bun:test";
import type { ProductResponseDTO } from "@repo/types";
import { addConfiguredProductToCart, addProductToCart, getCartItemCount, type PosCartItem } from "./pos-cart-boundary";

const product = {
    id: "product-1",
    categoryId: "category-1",
    name: "Masala Tea",
    price: 40,
    discount: 0,
    productType: "single",
} as ProductResponseDTO;

describe("POS Cart handoff", () => {
    it("adds ordinary Products and merges repeated taps", () => {
        const once = addProductToCart([], product);
        const twice = addProductToCart(once, product);

        expect(twice).toHaveLength(1);
        expect(twice[0]?.quantity).toBe(2);
        expect(getCartItemCount(twice)).toBe(2);
    });

    it("preserves separate Product lines and their server values", () => {
        const secondProduct = { ...product, id: "product-2", name: "Samosa", price: 25 };
        const items = addProductToCart(addProductToCart([], product), secondProduct);

        expect(items.map(({ id, name, price }) => ({ id, name, price }))).toEqual([
            { id: "product-1", name: "Masala Tea", price: 40 },
            { id: "product-2", name: "Samosa", price: 25 },
        ]);
        expect(getCartItemCount(items as PosCartItem[])).toBe(2);
    });

    it("merges equal configurations but preserves different configured lines", () => {
        const milk = { ...product, productType: "single" as const };
        const firstConfiguration = { addOns: [{ addOnId: "extra-sugar", quantity: 1 }], comboSelections: [] };
        const secondConfiguration = { addOns: [{ addOnId: "extra-sugar", quantity: 2 }], comboSelections: [] };
        const once = addConfiguredProductToCart([], milk, firstConfiguration);
        const twice = addConfiguredProductToCart(once, milk, firstConfiguration);
        const different = addConfiguredProductToCart(twice, milk, secondConfiguration);

        expect(different).toHaveLength(2);
        expect(different[0]?.quantity).toBe(2);
        expect(different[1]?.quantity).toBe(1);
        expect(different[0]?.configuration).toEqual(firstConfiguration);
        expect(different[1]?.configuration).toEqual(secondConfiguration);
    });
});
