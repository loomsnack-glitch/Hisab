import { describe, expect, it } from "bun:test";
import { posSaleKeys, unwrapPosSaleResponse } from "./pos-sale-detail-boundary";

describe("POS Sale detail boundary", () => {
    it("unwraps a Sale Detail and preserves service failures", () => {
        const sale = { id: "sale-1" } as never;

        expect(unwrapPosSaleResponse({ status: "success", data: { sale }, message: "", code: 200 })).toBe(sale);
        expect(() => unwrapPosSaleResponse({ status: "error", message: "Sale unavailable", code: 404 })).toThrow("Sale unavailable");
    });

    it("scopes Sale Details by Organization, Store, Device, and Sale", () => {
        const key = posSaleKeys.detail({ organizationId: "org-1", storeId: "store-1", deviceId: "device-1" }, "sale-1");

        expect(key).toEqual(["pos", "sale", "org-1", "store-1", "device-1", "sale-1"]);
    });
});
