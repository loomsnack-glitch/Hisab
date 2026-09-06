import type { ServiceAreaDTO, ServiceTableDTO, ServiceTableSaleResponse, ServiceTablesListResponse, ServiceAreasListResponse } from "@repo/types";
import type { PosTableContext } from "./pos-service-mode-boundary";

export type PosTableGroup = {
    areaId: string | null;
    title: string;
    tables: ServiceTableDTO[];
};

export const groupPosTablesByArea = (
    tables: readonly ServiceTableDTO[],
    areas: readonly ServiceAreaDTO[],
): PosTableGroup[] => {
    const areaTitles = new Map(areas.map((area) => [area.id, area.title]));
    const groups = new Map<string | null, ServiceTableDTO[]>();

    for (const table of tables) {
        const areaId = table.serviceAreaId && areaTitles.has(table.serviceAreaId) ? table.serviceAreaId : null;
        groups.set(areaId, [...(groups.get(areaId) ?? []), table]);
    }

    return [...groups.entries()]
        .sort(([left], [right]) => left === null ? -1 : right === null ? 1 : 0)
        .map(([areaId, groupedTables]) => ({
            areaId,
            title: areaId ? areaTitles.get(areaId)! : "Unassigned",
            tables: groupedTables,
        }));
};

export const buildPosTableContext = ({ table, sale, tableOrder }: ServiceTableSaleResponse): PosTableContext => ({
    tableId: table.id,
    tableLabel: table.tableLabel,
    tableOrderId: tableOrder?.id ?? table.currentTableOrderId ?? null,
    draftSaleId: sale?.id ?? null,
    remainingTotal: tableOrder?.remainingGrandTotal ?? null,
    orderDiscountAmount: tableOrder?.remainingDiscountTotal ?? 0,
});

export const unwrapPosTablesResponse = (
    response: { status: string; data?: ServiceTablesListResponse | null; message?: string },
): ServiceTablesListResponse => {
    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || "Unable to load POS Tables");
    }
    return response.data;
};

export const unwrapPosAreasResponse = (
    response: { status: string; data?: ServiceAreasListResponse | null; message?: string },
): ServiceAreasListResponse => {
    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || "Unable to load POS Table areas");
    }
    return response.data;
};
