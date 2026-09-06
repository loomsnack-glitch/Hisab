import { describe, expect, it } from "bun:test";
import {
    getPosDestinations,
    POS_SALE_SHELL_DESTINATIONS,
    POS_SHARED_DESTINATIONS,
} from "./pos-navigation-boundary";

const session = (tableManagementEnabled: boolean, kotSystemEnabled = false) => ({ store: { tableManagementEnabled, kotSystemEnabled } });

describe("POS navigation boundary", () => {
    it("always exposes the shared workspaces", () => {
        expect(getPosDestinations(null)).toEqual(POS_SHARED_DESTINATIONS);
        expect(getPosDestinations(session(false))).toEqual(POS_SHARED_DESTINATIONS);
    });

    it("exposes Tables only for capable Stores", () => {
        expect(getPosDestinations(session(true))).toEqual([...POS_SHARED_DESTINATIONS, "Tables"]);
    });

    it("exposes Kitchen only when KOT is enabled", () => {
        expect(getPosDestinations(session(false, true))).toEqual([...POS_SHARED_DESTINATIONS, "Kitchen"]);
        expect(getPosDestinations(session(true, true))).toEqual([...POS_SHARED_DESTINATIONS, "Tables", "Kitchen"]);
    });

    it("keeps New Sale and Cart as the initial sale shell routes", () => {
        expect(POS_SALE_SHELL_DESTINATIONS).toEqual(["NewSale", "Cart"]);
    });
});
