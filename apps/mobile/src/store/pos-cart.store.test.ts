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
    it("changes and removes scoped Cart lines", () => {
        usePosCartStore.getState().clear();
        usePosCartStore.getState().addProduct("org-1:store-1:device-1", product);
        const lineId = usePosCartStore.getState().items[0]!.lineId;

        usePosCartStore.getState().changeQuantity("org-1:store-1:device-1", lineId, 1);
        expect(usePosCartStore.getState().items[0]?.quantity).toBe(2);

        usePosCartStore.getState().removeItem("other-scope", lineId);
        expect(usePosCartStore.getState().items).toHaveLength(1);

        usePosCartStore.getState().removeItem("org-1:store-1:device-1", lineId);
        expect(usePosCartStore.getState().items).toEqual([]);
    });

    it("keeps Customer selection scoped and preserves Cart lines", () => {
        usePosCartStore.getState().clear();
        usePosCartStore.getState().addProduct("org-1:store-1:device-1", product);
        usePosCartStore.getState().setCustomer("org-1:store-1:device-1", {
            id: "customer-1",
            name: "Asha",
            phone: null,
        });

        expect(usePosCartStore.getState().customer?.name).toBe("Asha");
        expect(usePosCartStore.getState().items).toHaveLength(1);

        usePosCartStore.getState().clearCustomer("other-scope");
        expect(usePosCartStore.getState().customer?.id).toBe("customer-1");

        usePosCartStore.getState().clearCustomer("org-1:store-1:device-1");
        expect(usePosCartStore.getState().customer).toBeNull();
    });

    it("keeps discount state with the active Cart scope", () => {
        usePosCartStore.getState().clear();
        usePosCartStore.getState().addProduct("org-1:store-1:device-1", product);
        usePosCartStore.getState().setDiscount("org-1:store-1:device-1", { mode: "percent", value: 10 });

        expect(usePosCartStore.getState().discount).toEqual({ mode: "percent", value: 10 });
        usePosCartStore.getState().setDiscount("other-scope", { mode: "amount", value: 5 });
        expect(usePosCartStore.getState().items).toEqual([]);
        expect(usePosCartStore.getState().discount).toEqual({ mode: "amount", value: 5 });
    });

    it("clears handed-off items at the session boundary", () => {
        usePosCartStore.getState().clear();
        usePosCartStore.getState().addProduct("org-1:store-1:device-1", product);

        usePosCartStore.getState().clear();

        expect(usePosCartStore.getState().scopeKey).toBeNull();
        expect(usePosCartStore.getState().items).toEqual([]);
    });
});
