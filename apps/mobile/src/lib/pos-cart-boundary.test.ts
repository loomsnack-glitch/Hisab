import { describe, expect, it } from "bun:test";
import type { ProductResponseDTO } from "@repo/types";
import {
    addConfiguredProductToCart,
    addProductToCart,
    changeCartItemQuantity,
    getCartDisplayTotals,
    getCartItemCount,
    normalizePosCartCustomer,
    removeCartItem,
    type PosCartItem,
} from "./pos-cart-boundary";

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

    it("does not merge an unconfigured add into a configured line", () => {
        const configured = addConfiguredProductToCart([], product, {
            addOns: [{ addOnId: "extra-sugar", quantity: 1 }],
            comboSelections: [],
        });
        const items = addProductToCart(configured, product);

        expect(items).toHaveLength(2);
        expect(items.map((item) => item.quantity)).toEqual([1, 1]);
    });

    it("changes and removes only the requested Cart line", () => {
        const configured = addConfiguredProductToCart([], product, {
            addOns: [{ addOnId: "extra-sugar", quantity: 1 }],
            comboSelections: [],
        });
        const items = addProductToCart(configured, product);
        const changed = changeCartItemQuantity(items, configured[0]!.lineId, 1);

        expect(changed[0]?.quantity).toBe(2);
        expect(changed[1]?.quantity).toBe(1);
        const decreased = changeCartItemQuantity(changed, configured[0]!.lineId, -2);
        expect(decreased).toHaveLength(1);
        expect(removeCartItem(decreased, product.id)).toHaveLength(0);
    });

    it("calculates immediate display totals from Product catalog values", () => {
        const items = addProductToCart([], { ...product, price: 40, discount: 5 });
        const twice = addProductToCart(items, { ...product, price: 40, discount: 5 });

        expect(getCartDisplayTotals(twice)).toEqual({ subtotal: 80, discount: 10, total: 70 });
    });

    it("normalizes selected Customer context without retaining unrelated fields", () => {
        expect(normalizePosCartCustomer({ id: "customer-1", name: "Asha", phone: undefined })).toEqual({
            id: "customer-1",
            name: "Asha",
            phone: null,
        });
    });
});
