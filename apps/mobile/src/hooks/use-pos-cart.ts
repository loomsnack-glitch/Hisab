import { usePosSessionSnapshot } from "../store/pos-session.store";
import { getCartItemCount } from "../lib/pos-cart-boundary";
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
        clear: () => usePosCartStore.getState().clear(),
    };
};
