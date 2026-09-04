import { describe, expect, it } from "bun:test";
import { getPosDestinations, POS_SHARED_DESTINATIONS } from "./pos-navigation-boundary";

const session = (tableManagementEnabled: boolean) => ({ store: { tableManagementEnabled } });

describe("POS navigation boundary", () => {
    it("always exposes the shared workspaces", () => {
        expect(getPosDestinations(null)).toEqual(POS_SHARED_DESTINATIONS);
        expect(getPosDestinations(session(false))).toEqual(POS_SHARED_DESTINATIONS);
    });

    it("exposes Tables only for capable Stores", () => {
        expect(getPosDestinations(session(true))).toEqual([...POS_SHARED_DESTINATIONS, "Tables"]);
    });
});
