import { describe, expect, it } from "bun:test";
import type { ProductResponseDTO } from "@repo/types";
import { usePosCartStore } from "./pos-cart.store";

const product = {
    id: "product-1",
    categoryId: "category-1",
    name: "Masala Tea",
    price: 40,
    discount: 0,
    productType: "single",
} as ProductResponseDTO;

describe("POS Cart store", () => {
    it("clears handed-off items at the session boundary", () => {
        usePosCartStore.getState().clear();
        usePosCartStore.getState().addProduct("org-1:store-1:device-1", product);

        usePosCartStore.getState().clear();

        expect(usePosCartStore.getState().scopeKey).toBeNull();
        expect(usePosCartStore.getState().items).toEqual([]);
    });
});
