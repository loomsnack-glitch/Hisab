import { create } from "zustand";
import type { ProductResponseDTO } from "@repo/types";
import { addConfiguredProductToCart, addProductToCart, type PosCartConfiguration, type PosCartItem } from "../lib/pos-cart-boundary";

type PosCartStore = {
    scopeKey: string | null;
    items: PosCartItem[];
    addProduct: (scopeKey: string, product: ProductResponseDTO) => void;
    addConfiguredProduct: (scopeKey: string, product: ProductResponseDTO, configuration: PosCartConfiguration) => void;
    clear: () => void;
};

export const usePosCartStore = create<PosCartStore>()((set) => ({
    scopeKey: null,
    items: [],
    addProduct: (scopeKey, product) =>
        set((state) => ({
            scopeKey,
            items: addProductToCart(state.scopeKey === scopeKey ? state.items : [], product),
        })),
    addConfiguredProduct: (scopeKey, product, configuration) =>
        set((state) => ({
            scopeKey,
            items: addConfiguredProductToCart(state.scopeKey === scopeKey ? state.items : [], product, configuration),
        })),
    clear: () => set({ scopeKey: null, items: [] }),
}));

export const clearPosCart = () => usePosCartStore.getState().clear();
