import { usePosSessionSnapshot } from "../store/pos-session.store";
import { getCartDisplayTotals, getCartItemCount, normalizePosCartCustomer, type PosCartConfiguration, type PosCartDiscount } from "../lib/pos-cart-boundary";
import type { ProductResponseDTO } from "@repo/types";
import { usePosCartStore } from "../store/pos-cart.store";

export const usePosCart = () => {
    const session = usePosSessionSnapshot().session;
    const scopeKey = session
        ? `${session.organization.id}:${session.store.id}:${session.device.id}`
        : null;
    const items = usePosCartStore((state) => (state.scopeKey === scopeKey ? state.items : []));
    const customer = usePosCartStore((state) => (state.scopeKey === scopeKey ? state.customer : null));
    const discount = usePosCartStore((state) => (state.scopeKey === scopeKey ? state.discount : null));

    return {
        items,
        customer,
        discount,
        itemCount: getCartItemCount(items),
        displayTotals: getCartDisplayTotals(items, discount),
        addProduct: (product: ProductResponseDTO) => {
            if (scopeKey && product.productType === "single") {
                usePosCartStore.getState().addProduct(scopeKey, product);
            }
        },
        addConfiguredProduct: (product: ProductResponseDTO, configuration: PosCartConfiguration) => {
            if (scopeKey) {
                usePosCartStore.getState().addConfiguredProduct(scopeKey, product, configuration);
            }
        },
        changeQuantity: (lineId: string, delta: number) => {
            if (scopeKey) {
                usePosCartStore.getState().changeQuantity(scopeKey, lineId, delta);
            }
        },
        removeItem: (lineId: string) => {
            if (scopeKey) {
                usePosCartStore.getState().removeItem(scopeKey, lineId);
            }
        },
        selectCustomer: (selectedCustomer: Parameters<typeof normalizePosCartCustomer>[0] | null) => {
            if (scopeKey) {
                usePosCartStore.getState().setCustomer(
                    scopeKey,
                    selectedCustomer ? normalizePosCartCustomer(selectedCustomer) : null,
                );
            }
        },
        clearCustomer: () => {
            if (scopeKey) {
                usePosCartStore.getState().clearCustomer(scopeKey);
            }
        },
        setDiscount: (nextDiscount: PosCartDiscount | null) => {
            if (scopeKey) {
                usePosCartStore.getState().setDiscount(scopeKey, nextDiscount);
            }
        },
        clear: () => usePosCartStore.getState().clear(),
    };
};
