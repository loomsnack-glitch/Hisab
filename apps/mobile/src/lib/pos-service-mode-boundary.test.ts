import { describe, expect, it } from "bun:test";
import {
    DEFAULT_POS_SERVICE_MODE,
    isPosRestaurantStore,
    resolvePosServiceMode,
    type PosTableContext,
} from "./pos-service-mode-boundary";

const table: PosTableContext = {
    tableId: "table-1",
    tableLabel: "T1",
    tableOrderId: "order-1",
    draftSaleId: null,
    remainingTotal: 0,
};

describe("POS service-mode boundary", () => {
    it("defaults ordinary Cart state to Dine-In", () => {
        expect(DEFAULT_POS_SERVICE_MODE).toBe("dine_in");
        expect(resolvePosServiceMode("pick_up", null)).toBe("pick_up");
    });

    it("locks a selected Table to Dine-In", () => {
        expect(resolvePosServiceMode("pick_up", table)).toBe("dine_in");
    });

    it("detects either restaurant capability without exposing role logic", () => {
        expect(isPosRestaurantStore({ tableManagementEnabled: false, kotSystemEnabled: false })).toBe(false);
        expect(isPosRestaurantStore({ tableManagementEnabled: true, kotSystemEnabled: false })).toBe(true);
        expect(isPosRestaurantStore({ tableManagementEnabled: false, kotSystemEnabled: true })).toBe(true);
    });
});
