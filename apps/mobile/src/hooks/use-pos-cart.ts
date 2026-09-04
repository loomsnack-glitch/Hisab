import { usePosSessionSnapshot } from "../store/pos-session.store";
import { getCartItemCount, type PosCartConfiguration } from "../lib/pos-cart-boundary";
import type { ProductResponseDTO } from "@repo/types";
import { usePosCartStore } from "../store/pos-cart.store";

export const usePosCart = () => {
    const session = usePosSessionSnapshot().session;
    const scopeKey = session
        ? `${session.organization.id}:${session.store.id}:${session.device.id}`
        : null;
    const items = usePosCartStore((state) => (state.scopeKey === scopeKey ? state.items : []));

    return {
        items,
        itemCount: getCartItemCount(items),
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
        clear: () => usePosCartStore.getState().clear(),
    };
};
