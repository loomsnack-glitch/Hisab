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
import { DEFAULT_POS_SERVICE_MODE, resolvePosServiceMode, type PosServiceMode, type PosTableContext } from "../lib/pos-service-mode-boundary";

type PosCartStore = {
    scopeKey: string | null;
    items: PosCartItem[];
    customer: PosCartCustomer | null;
    discount: PosCartDiscount | null;
    draftSaleId: string | null;
    draftRequestId: string | null;
    completionRequestId: string | null;
    serviceMode: PosServiceMode;
    tableContext: PosTableContext | null;
    addProduct: (scopeKey: string, product: ProductResponseDTO) => void;
    addConfiguredProduct: (scopeKey: string, product: ProductResponseDTO, configuration: PosCartConfiguration) => void;
    changeQuantity: (scopeKey: string, lineId: string, delta: number) => void;
    removeItem: (scopeKey: string, lineId: string) => void;
    setCustomer: (scopeKey: string, customer: PosCartCustomer | null) => void;
    clearCustomer: (scopeKey: string) => void;
    setDiscount: (scopeKey: string, discount: PosCartDiscount | null) => void;
    setDraftSaleId: (scopeKey: string, draftSaleId: string | null) => void;
    setDraftRequestId: (scopeKey: string, draftRequestId: string) => void;
    setCompletionRequestId: (scopeKey: string, completionRequestId: string) => void;
    setServiceMode: (scopeKey: string, serviceMode: PosServiceMode) => void;
    setTableContext: (scopeKey: string, tableContext: PosTableContext | null) => void;
    clearTableContext: (scopeKey: string) => void;
    restoreDraft: (scopeKey: string, items: PosCartItem[], customer: PosCartCustomer | null, discount: PosCartDiscount | null, draftSaleId: string) => void;
    clearDraftSale: (scopeKey: string) => void;
    clear: () => void;
};

export const usePosCartStore = create<PosCartStore>()((set) => ({
    scopeKey: null,
    items: [],
    customer: null,
    discount: null,
    draftSaleId: null,
    draftRequestId: null,
    completionRequestId: null,
    serviceMode: DEFAULT_POS_SERVICE_MODE,
    tableContext: null,
    addProduct: (scopeKey, product) =>
        set((state) => ({
            scopeKey,
            items: addProductToCart(state.scopeKey === scopeKey ? state.items : [], product),
            customer: state.scopeKey === scopeKey ? state.customer : null,
            discount: state.scopeKey === scopeKey ? state.discount : null,
            draftSaleId: state.scopeKey === scopeKey ? state.draftSaleId : null,
            draftRequestId: state.scopeKey === scopeKey ? state.draftRequestId : null,
            completionRequestId: null,
            serviceMode: state.scopeKey === scopeKey ? state.serviceMode : DEFAULT_POS_SERVICE_MODE,
            tableContext: state.scopeKey === scopeKey ? state.tableContext : null,
        })),
    addConfiguredProduct: (scopeKey, product, configuration) =>
        set((state) => ({
            scopeKey,
            items: addConfiguredProductToCart(state.scopeKey === scopeKey ? state.items : [], product, configuration),
            customer: state.scopeKey === scopeKey ? state.customer : null,
            discount: state.scopeKey === scopeKey ? state.discount : null,
            draftSaleId: state.scopeKey === scopeKey ? state.draftSaleId : null,
            draftRequestId: state.scopeKey === scopeKey ? state.draftRequestId : null,
            completionRequestId: null,
            serviceMode: state.scopeKey === scopeKey ? state.serviceMode : DEFAULT_POS_SERVICE_MODE,
            tableContext: state.scopeKey === scopeKey ? state.tableContext : null,
        })),
    changeQuantity: (scopeKey, lineId, delta) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { items: changeCartItemQuantity(state.items, lineId, delta), completionRequestId: null }),
    removeItem: (scopeKey, lineId) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { items: removeCartItem(state.items, lineId), completionRequestId: null }),
    setCustomer: (scopeKey, customer) =>
        set((state) => ({
            scopeKey,
            items: state.scopeKey === scopeKey ? state.items : [],
            customer,
            discount: state.scopeKey === scopeKey ? state.discount : null,
            draftSaleId: state.scopeKey === scopeKey ? state.draftSaleId : null,
            draftRequestId: state.scopeKey === scopeKey ? state.draftRequestId : null,
            completionRequestId: null,
            serviceMode: state.scopeKey === scopeKey ? state.serviceMode : DEFAULT_POS_SERVICE_MODE,
            tableContext: state.scopeKey === scopeKey ? state.tableContext : null,
        })),
    clearCustomer: (scopeKey) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { customer: null, completionRequestId: null }),
    setDiscount: (scopeKey, discount) =>
        set((state) => ({
            scopeKey,
            items: state.scopeKey === scopeKey ? state.items : [],
            customer: state.scopeKey === scopeKey ? state.customer : null,
            discount,
            draftSaleId: state.scopeKey === scopeKey ? state.draftSaleId : null,
            draftRequestId: state.scopeKey === scopeKey ? state.draftRequestId : null,
            completionRequestId: null,
        })),
    setDraftSaleId: (scopeKey, draftSaleId) =>
        set((state) => state.scopeKey !== scopeKey ? state : { draftSaleId }),
    setDraftRequestId: (scopeKey, draftRequestId) =>
        set((state) => state.scopeKey !== scopeKey ? state : { draftRequestId }),
    setCompletionRequestId: (scopeKey, completionRequestId) =>
        set((state) => state.scopeKey !== scopeKey ? state : { completionRequestId }),
    setServiceMode: (scopeKey, serviceMode) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { serviceMode: resolvePosServiceMode(serviceMode, state.tableContext), completionRequestId: null }),
    setTableContext: (scopeKey, tableContext) =>
        set((state) => state.scopeKey !== null && state.scopeKey !== scopeKey
            ? state
            : {
                scopeKey,
                tableContext,
                serviceMode: resolvePosServiceMode(state.serviceMode, tableContext),
                draftSaleId: tableContext?.draftSaleId ?? state.draftSaleId,
                completionRequestId: null,
            }),
    clearTableContext: (scopeKey) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { tableContext: null, serviceMode: DEFAULT_POS_SERVICE_MODE, completionRequestId: null }),
    restoreDraft: (scopeKey, items, customer, discount, draftSaleId) =>
        set((state) => state.scopeKey !== null && state.scopeKey !== scopeKey
            ? state
            : { scopeKey, items, customer, discount, draftSaleId, draftRequestId: null, completionRequestId: null, serviceMode: DEFAULT_POS_SERVICE_MODE, tableContext: null }),
    clearDraftSale: (scopeKey) =>
        set((state) => state.scopeKey !== scopeKey
            ? state
            : { draftSaleId: null, draftRequestId: null, completionRequestId: null }),
    clear: () => set({ scopeKey: null, items: [], customer: null, discount: null, draftSaleId: null, draftRequestId: null, completionRequestId: null, serviceMode: DEFAULT_POS_SERVICE_MODE, tableContext: null }),
}));

export const clearPosCart = () => usePosCartStore.getState().clear();
