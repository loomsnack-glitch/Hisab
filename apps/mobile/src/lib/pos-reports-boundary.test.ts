import { describe, expect, it } from "bun:test";
import {
    buildPosReportsQueries,
    getAverageSaleValue,
    posReportsKeys,
    unwrapPosProductSalesResponse,
} from "./pos-reports-boundary";

describe("POS Reports boundary", () => {
    it("uses local calendar bounds for Today and omits them for All dates", () => {
        const now = new Date("2026-09-07T12:30:00");
        const expectedFrom = new Date(now);
        expectedFrom.setHours(0, 0, 0, 0);
        const expectedTo = new Date(now);
        expectedTo.setHours(23, 59, 59, 999);
        const today = buildPosReportsQueries("today", now);
        const all = buildPosReportsQueries("all", now);

        expect(today.sales).toMatchObject({ status: "completed", limit: 1, sort: "newest" });
        expect(today.sales.createdFrom).toBe(expectedFrom.toISOString());
        expect(today.sales.createdTo).toBe(expectedTo.toISOString());
        expect(today.products).toEqual({ createdFrom: today.sales.createdFrom, createdTo: today.sales.createdTo });
        expect(all.sales).toEqual({ status: "completed", limit: 1, sort: "newest" });
        expect(all.products).toEqual({});
    });

    it("calculates average Sale value only from a non-empty server summary", () => {
        expect(getAverageSaleValue({ completedCount: 4, salesTotal: 1000, collectedTotal: 700, dueTotal: 300 })).toBe(250);
        expect(getAverageSaleValue({ completedCount: 0, salesTotal: 0, collectedTotal: 0, dueTotal: 0 })).toBe(0);
        expect(getAverageSaleValue(null)).toBe(0);
    });

    it("keeps report keys scoped and separates Sales from Products", () => {
        const scope = { organizationId: "org", storeId: "store", deviceId: "device" };
        const queries = buildPosReportsQueries("all");
        expect(posReportsKeys.sales(scope, queries.sales)).toEqual(["pos", "reports", "sales", "org", "store", "device", queries.sales]);
        expect(posReportsKeys.products(scope, queries.products)).toEqual(["pos", "reports", "products", "org", "store", "device", queries.products]);
    });

    it("unwraps successful Product Sales Summary responses and rejects failures", () => {
        const summary = { products: [{ productId: "product", productName: "Tea", categoryName: null, quantitySold: 3 }] };
        expect(unwrapPosProductSalesResponse({ status: "success", data: { summary }, message: "", code: 200 })).toEqual(summary);
        expect(() => unwrapPosProductSalesResponse({ status: "error", message: "Unavailable", code: 503 })).toThrow("Unavailable");
        expect(() => unwrapPosProductSalesResponse({ status: "success", data: null, message: "Missing", code: 200 })).toThrow("Missing");
    });
});
