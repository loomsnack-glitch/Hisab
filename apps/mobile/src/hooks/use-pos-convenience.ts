import { useEffect, useMemo, useState } from "react";
import type { ProductResponseDTO } from "@repo/types";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { posStorage } from "../lib/storage";
import {
    emptyPosConvenienceState,
    getPosConvenienceStorageKey,
    parsePosConvenienceState,
    recordRecentProduct,
    resolveConvenienceProducts,
    serializePosConvenienceState,
    togglePinnedProduct,
    type PosConvenienceState,
} from "../lib/pos-convenience-boundary";

const readConvenienceState = (scopeKey: string | null) => {
    if (!scopeKey) {
        return emptyPosConvenienceState();
    }

    try {
        return parsePosConvenienceState(posStorage.getConvenienceValue(getPosConvenienceStorageKey(scopeKey)));
    } catch {
        return emptyPosConvenienceState();
    }
};

export const usePosConvenience = (products: readonly ProductResponseDTO[]) => {
    const session = usePosSessionSnapshot().session;
    const scopeKey = session
        ? `${session.organization.id}:${session.store.id}:${session.device.id}`
        : null;
    const [loadedState, setLoadedState] = useState<{ scopeKey: string | null; state: PosConvenienceState }>(() => ({
        scopeKey,
        state: readConvenienceState(scopeKey),
    }));

    useEffect(() => {
        setLoadedState({ scopeKey, state: readConvenienceState(scopeKey) });
    }, [scopeKey]);

    // Do not render the previous Store's shortcuts during the one render before
    // the scope-change effect hydrates the new MMKV value.
    const state = loadedState.scopeKey === scopeKey ? loadedState.state : emptyPosConvenienceState();

    const updateState = (update: (current: PosConvenienceState) => PosConvenienceState) => {
        if (!scopeKey) {
            return;
        }

        setLoadedState((loaded) => {
            const current = loaded.scopeKey === scopeKey ? loaded.state : emptyPosConvenienceState();
            const next = update(current);
            try {
                posStorage.setConvenienceValue(getPosConvenienceStorageKey(scopeKey), serializePosConvenienceState(next));
            } catch {
                // Local convenience data must never block the server Catalog or Cart path.
            }
            return { scopeKey, state: next };
        });
    };

    const recentProducts = useMemo(
        () => resolveConvenienceProducts(products, state.recentProductIds),
        [products, state.recentProductIds],
    );
    const pinnedProducts = useMemo(
        () => resolveConvenienceProducts(products, state.pinnedProductIds),
        [products, state.pinnedProductIds],
    );

    return {
        recentProducts,
        pinnedProducts,
        isPinned: (productId: string) => state.pinnedProductIds.includes(productId),
        recordRecent: (productId: string) => updateState((current) => recordRecentProduct(current, productId)),
        togglePinned: (productId: string) => updateState((current) => togglePinnedProduct(current, productId)),
    };
};
