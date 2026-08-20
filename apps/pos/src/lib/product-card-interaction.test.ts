import { describe, expect, test } from "bun:test";
import type { ProductResponseDTO } from "@repo/types";

import { getProductCardAction, getProductCardActionLabel } from "./product-card-interaction";

const product = (productType: ProductResponseDTO["productType"], status: ProductResponseDTO["status"] = "active") =>
    ({ productType, status } as Pick<ProductResponseDTO, "productType" | "status">);

describe("product card interaction", () => {
    test("adds a plain single product directly", () => {
        expect(getProductCardAction(product("single"))).toBe("add");
    });

    test("opens customization for a single product with add-ons", () => {
        expect(getProductCardAction(product("single"), { hasAddOns: true })).toBe("customize");
    });

    test("configures a Combo only when it has settings", () => {
        expect(getProductCardAction(product("combo"), { comboAvailable: true, comboHasSettings: true })).toBe("configure");
        expect(getProductCardAction(product("combo"), { comboAvailable: true, comboHasSettings: false })).toBe("add");
    });

    test("keeps Combos disabled while loading or when unavailable", () => {
        expect(getProductCardAction(product("combo"), { comboLoading: true })).toBe("loading");
        expect(getProductCardAction(product("combo"), { comboAvailable: false })).toBe("disabled");
        expect(getProductCardAction(product("combo"), { comboHasError: true })).toBe("retry");
    });

    test("labels each card action clearly", () => {
        expect(getProductCardActionLabel("add")).toBe("Add");
        expect(getProductCardActionLabel("customize")).toBe("Customize");
        expect(getProductCardActionLabel("configure")).toBe("Configure Combo");
    });
});
