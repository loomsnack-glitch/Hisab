import { create } from "zustand";
import type { ProductResponseDTO } from "@repo/types";
import {
    addConfiguredProductToCart,
    addProductToCart,
    changeCartItemQuantity,
    removeCartItem,
    type PosCartConfiguration,
    type PosCartItem,
} from "../lib/pos-cart-boundary";

type PosCartStore = {
    scopeKey: string | null;
    items: PosCartItem[];
    addProduct: (scopeKey: string, product: ProductResponseDTO) => void;
    addConfiguredProduct: (scopeKey: string, product: ProductResponseDTO, configuration: PosCartConfiguration) => void;
    changeQuantity: (scopeKey: string, lineId: string, delta: number) => void;
    removeItem: (scopeKey: string, lineId: string) => void;
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
    changeQuantity: (scopeKey, lineId, delta) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { items: changeCartItemQuantity(state.items, lineId, delta) }),
    removeItem: (scopeKey, lineId) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { items: removeCartItem(state.items, lineId) }),
    clear: () => set({ scopeKey: null, items: [] }),
}));

export const clearPosCart = () => usePosCartStore.getState().clear();
