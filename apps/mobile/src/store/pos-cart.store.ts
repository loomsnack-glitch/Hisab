import { create } from "zustand";
import type { ProductResponseDTO } from "@repo/types";
import { addProductToCart, type PosCartItem } from "../lib/pos-cart-boundary";

type PosCartStore = {
    scopeKey: string | null;
    items: PosCartItem[];
    addProduct: (scopeKey: string, product: ProductResponseDTO) => void;
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
    clear: () => set({ scopeKey: null, items: [] }),
}));

export const clearPosCart = () => usePosCartStore.getState().clear();
