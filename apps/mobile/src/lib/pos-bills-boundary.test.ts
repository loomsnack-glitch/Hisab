import { describe, expect, it } from "bun:test";
import { buildPosBillsQuery, getPosTodayBounds, posBillsKeys, unwrapPosSalesResponse, type PosBillsFilters } from "./pos-bills-boundary";

const filters: PosBillsFilters = {
    date: "today",
    paymentStatus: "due",
    paymentMethod: "upi",
    search: "  Asha  ",
};

describe("POS Bills boundary", () => {
    it("builds local-day ISO bounds", () => {
        const localNoon = new Date(2026, 8, 6, 12, 30);
        const localStart = new Date(2026, 8, 6, 0, 0, 0, 0);
        const localEnd = new Date(2026, 8, 6, 23, 59, 59, 999);

        expect(getPosTodayBounds(localNoon)).toEqual({
            createdFrom: localStart.toISOString(),
            createdTo: localEnd.toISOString(),
        });
    });

    it("maps search and filters to server query fields", () => {
        const localNoon = new Date(2026, 8, 6, 12, 30);
        const localStart = new Date(2026, 8, 6, 0, 0, 0, 0);
        const localEnd = new Date(2026, 8, 6, 23, 59, 59, 999);

        expect(buildPosBillsQuery(filters, localNoon)).toMatchObject({
            limit: 30,
            sort: "newest",
            status: "completed",
            search: "Asha",
            paymentStatus: "pending",
            paymentMethod: "upi",
            createdFrom: localStart.toISOString(),
            createdTo: localEnd.toISOString(),
        });
    });

    it("omits optional filters for the default all-values selection", () => {
        expect(buildPosBillsQuery({
            date: "all",
            paymentStatus: "all",
            paymentMethod: "all",
            search: "",
        })).toEqual({ limit: 30, sort: "newest", status: "completed", search: undefined, paymentStatus: undefined, paymentMethod: undefined });
    });

    it("unwraps successful Sales responses and rejects service failures", () => {
        const data = { sales: [], summary: null, pageInfo: { hasMore: true, nextCursor: "next" } };

        expect(unwrapPosSalesResponse({ status: "success", data, message: "", code: 200 })).toEqual(data);
        expect(() => unwrapPosSalesResponse({ status: "error", message: "Service unavailable", code: 503 })).toThrow("Service unavailable");
        expect(() => unwrapPosSalesResponse({ status: "success", data: null, message: "Missing data", code: 200 })).toThrow("Missing data");
    });

    it("keeps the complete POS scope in list keys", () => {
        const query = buildPosBillsQuery(filters, new Date(2026, 8, 6, 12, 30));
        const key = posBillsKeys.list({ organizationId: "org-1", storeId: "store-1", deviceId: "device-1" }, query);

        expect(key).toContain("org-1");
        expect(key).toContain("store-1");
        expect(key).toContain("device-1");
        expect(key).toContain(query);
    });
});
