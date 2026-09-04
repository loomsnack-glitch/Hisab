import { describe, expect, it } from "bun:test";
import type { ProductResponseDTO } from "@repo/types";
import {
    getPosConvenienceStorageKey,
    parsePosConvenienceState,
    POS_RECENT_PRODUCT_LIMIT,
    recordRecentProduct,
    resolveConvenienceProducts,
    serializePosConvenienceState,
    togglePinnedProduct,
} from "./pos-convenience-boundary";

const product = (id: string) => ({ id, name: id } as ProductResponseDTO);

describe("mobile POS convenience boundary", () => {
    it("scopes convenience storage by the full active POS context", () => {
        expect(getPosConvenienceStorageKey("organization-1:store-1:device-1")).not.toBe(
            getPosConvenienceStorageKey("organization-1:store-2:device-1"),
        );
    });

    it("recents are newest first, deduplicated, and bounded", () => {
        let state = parsePosConvenienceState(null);
        for (let index = 0; index < POS_RECENT_PRODUCT_LIMIT + 2; index += 1) {
            state = recordRecentProduct(state, `product-${index}`);
        }
        state = recordRecentProduct(state, "product-2");

        expect(state.recentProductIds).toHaveLength(POS_RECENT_PRODUCT_LIMIT);
        expect(state.recentProductIds[0]).toBe("product-2");
        expect(new Set(state.recentProductIds).size).toBe(POS_RECENT_PRODUCT_LIMIT);
        expect(state.recentProductIds).not.toContain("product-0");
    });

    it("toggles pinned Product IDs without changing Recent state", () => {
        const initial = recordRecentProduct(parsePosConvenienceState(null), "product-1");
        const pinned = togglePinnedProduct(initial, "product-1");
        const unpinned = togglePinnedProduct(pinned, "product-1");

        expect(pinned.pinnedProductIds).toEqual(["product-1"]);
        expect(unpinned.pinnedProductIds).toEqual([]);
        expect(unpinned.recentProductIds).toEqual(["product-1"]);
    });

    it("recovers malformed data and deduplicates parsed IDs", () => {
        expect(parsePosConvenienceState("not-json")).toEqual({ recentProductIds: [], pinnedProductIds: [] });
        expect(parsePosConvenienceState(JSON.stringify({ recentProductIds: ["a", "a", 2], pinnedProductIds: ["b", "b"] }))).toEqual({
            recentProductIds: ["a"],
            pinnedProductIds: ["b"],
        });
    });

    it("resolves only stored IDs present in the current server Catalog", () => {
        const state = recordRecentProduct(parsePosConvenienceState(null), "current");
        expect(resolveConvenienceProducts([product("missing"), product("current")], state.recentProductIds)).toEqual([
            product("current"),
        ]);
        expect(serializePosConvenienceState(state)).toContain("current");
    });
});
