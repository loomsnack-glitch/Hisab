import { describe, expect, it } from "bun:test";
import { buildPosTableContext, groupPosTablesByArea } from "./pos-tables-boundary";

const table = (id: string, serviceAreaId: string | null, state: "free" | "engaged") => ({
    id,
    organizationId: "00000000-0000-4000-8000-000000000001",
    storeId: "00000000-0000-4000-8000-000000000002",
    serviceAreaId,
    tableLabel: id,
    capacity: 4,
    state,
    currentSaleId: null,
    currentTableOrderId: null,
    currentSaleTotal: 0,
    createdBy: "00000000-0000-4000-8000-000000000003",
    updatedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});

describe("POS Tables boundary", () => {
    it("groups known areas and keeps unknown area assignments unassigned", () => {
        const groups = groupPosTablesByArea(
            [table("T2", "area-2", "free"), table("T1", "missing", "free"), table("T3", null, "engaged")],
            [{ id: "area-2", title: "Garden" } as never],
        );

        expect(groups.map(({ title, tables }) => [title, tables.map(({ id }) => id)])).toEqual([
            ["Unassigned", ["T1", "T3"]],
            ["Garden", ["T2"]],
        ]);
    });

    it("uses the server response to preserve active table and order identity", () => {
        const context = buildPosTableContext({
            table: { ...table("T1", "area-1", "engaged"), currentTableOrderId: "order-1" } as never,
            sale: null,
            tableOrder: { id: "order-1" } as never,
        });

        expect(context).toEqual({
            tableId: "T1",
            tableLabel: "T1",
            tableOrderId: "order-1",
            draftSaleId: null,
        });
    });
});
