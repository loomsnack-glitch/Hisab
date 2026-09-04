import type { ProductResponseDTO } from "@repo/types";

export const POS_RECENT_PRODUCT_LIMIT = 12;

export type PosConvenienceState = {
    recentProductIds: string[];
    pinnedProductIds: string[];
};

export const emptyPosConvenienceState = (): PosConvenienceState => ({
    recentProductIds: [],
    pinnedProductIds: [],
});

export const getPosConvenienceStorageKey = (scopeKey: string) => `pos.convenience.${scopeKey}`;

const validProductIds = (value: unknown) =>
    Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && id.length > 0) : [];

export const parsePosConvenienceState = (serialized: string | null): PosConvenienceState => {
    if (!serialized) {
        return emptyPosConvenienceState();
    }

    try {
        const parsed = JSON.parse(serialized) as { recentProductIds?: unknown; pinnedProductIds?: unknown };
        return {
            recentProductIds: [...new Set(validProductIds(parsed.recentProductIds))].slice(0, POS_RECENT_PRODUCT_LIMIT),
            pinnedProductIds: [...new Set(validProductIds(parsed.pinnedProductIds))],
        };
    } catch {
        return emptyPosConvenienceState();
    }
};

export const serializePosConvenienceState = (state: PosConvenienceState) => JSON.stringify(state);

export const recordRecentProduct = (state: PosConvenienceState, productId: string): PosConvenienceState => ({
    ...state,
    recentProductIds: [productId, ...state.recentProductIds.filter((id) => id !== productId)].slice(
        0,
        POS_RECENT_PRODUCT_LIMIT,
    ),
});

export const togglePinnedProduct = (state: PosConvenienceState, productId: string): PosConvenienceState => {
    const isPinned = state.pinnedProductIds.includes(productId);
    return {
        ...state,
        pinnedProductIds: isPinned
            ? state.pinnedProductIds.filter((id) => id !== productId)
            : [...state.pinnedProductIds, productId],
    };
};

export const resolveConvenienceProducts = (
    products: readonly ProductResponseDTO[],
    productIds: readonly string[],
) => productIds.flatMap((productId) => products.filter((product) => product.id === productId));
