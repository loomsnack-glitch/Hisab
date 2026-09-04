import { create } from "zustand";
import type { ProductResponseDTO } from "@repo/types";
import {
    addConfiguredProductToCart,
    addProductToCart,
    changeCartItemQuantity,
    removeCartItem,
    type PosCartConfiguration,
    type PosCartCustomer,
    type PosCartDiscount,
    type PosCartItem,
} from "../lib/pos-cart-boundary";

type PosCartStore = {
    scopeKey: string | null;
    items: PosCartItem[];
    customer: PosCartCustomer | null;
    discount: PosCartDiscount | null;
    addProduct: (scopeKey: string, product: ProductResponseDTO) => void;
    addConfiguredProduct: (scopeKey: string, product: ProductResponseDTO, configuration: PosCartConfiguration) => void;
    changeQuantity: (scopeKey: string, lineId: string, delta: number) => void;
    removeItem: (scopeKey: string, lineId: string) => void;
    setCustomer: (scopeKey: string, customer: PosCartCustomer | null) => void;
    clearCustomer: (scopeKey: string) => void;
    setDiscount: (scopeKey: string, discount: PosCartDiscount | null) => void;
    clear: () => void;
};

export const usePosCartStore = create<PosCartStore>()((set) => ({
    scopeKey: null,
    items: [],
    customer: null,
    discount: null,
    addProduct: (scopeKey, product) =>
        set((state) => ({
            scopeKey,
            items: addProductToCart(state.scopeKey === scopeKey ? state.items : [], product),
            customer: state.scopeKey === scopeKey ? state.customer : null,
            discount: state.scopeKey === scopeKey ? state.discount : null,
        })),
    addConfiguredProduct: (scopeKey, product, configuration) =>
        set((state) => ({
            scopeKey,
            items: addConfiguredProductToCart(state.scopeKey === scopeKey ? state.items : [], product, configuration),
            customer: state.scopeKey === scopeKey ? state.customer : null,
            discount: state.scopeKey === scopeKey ? state.discount : null,
        })),
    changeQuantity: (scopeKey, lineId, delta) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { items: changeCartItemQuantity(state.items, lineId, delta) }),
    removeItem: (scopeKey, lineId) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { items: removeCartItem(state.items, lineId) }),
    setCustomer: (scopeKey, customer) =>
        set((state) => ({
            scopeKey,
            items: state.scopeKey === scopeKey ? state.items : [],
            customer,
        })),
    clearCustomer: (scopeKey) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { customer: null }),
    setDiscount: (scopeKey, discount) =>
        set((state) => ({
            scopeKey,
            items: state.scopeKey === scopeKey ? state.items : [],
            customer: state.scopeKey === scopeKey ? state.customer : null,
            discount,
        })),
    clear: () => set({ scopeKey: null, items: [], customer: null, discount: null }),
}));

export const clearPosCart = () => usePosCartStore.getState().clear();
