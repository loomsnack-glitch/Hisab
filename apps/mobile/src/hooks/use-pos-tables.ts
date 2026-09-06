import { useQuery, useQueryClient } from "@tanstack/react-query";
import { allocatePosServiceTable, getPosServiceAreas, getPosServiceTableOrder, getPosServiceTables, startPosServiceTableOrder } from "@repo/services";
import type { ServiceTableDTO, ServiceTableSaleResponse } from "@repo/types";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { buildPosTableContext, unwrapPosAreasResponse, unwrapPosTablesResponse } from "../lib/pos-tables-boundary";

export const posTablesKeys = {
    all: ["pos", "tables"] as const,
    tables: (scope: { organizationId: string; storeId: string; deviceId: string } | null) => [...posTablesKeys.all, "list", scope] as const,
    areas: (scope: { organizationId: string; storeId: string; deviceId: string } | null) => [...posTablesKeys.all, "areas", scope] as const,
};

const unwrapTableOrder = (response: { status: string; data?: ServiceTableSaleResponse | null; message?: string }) => {
    if (response.status !== "success" || !response.data) {
        throw new Error(response.message || "Unable to open POS Table");
    }
    return response.data;
};

export const usePosTables = () => {
    const session = usePosSessionSnapshot().session;
    const queryClient = useQueryClient();
    const scope = session
        ? { organizationId: session.organization.id, storeId: session.store.id, deviceId: session.device.id }
        : null;
    const enabled = Boolean(scope && session?.store.tableManagementEnabled);
    const tablesQuery = useQuery({
        queryKey: posTablesKeys.tables(scope),
        queryFn: async () => unwrapPosTablesResponse(await getPosServiceTables()),
        enabled,
        retry: false,
    });
    const areasQuery = useQuery({
        queryKey: posTablesKeys.areas(scope),
        queryFn: async () => unwrapPosAreasResponse(await getPosServiceAreas()),
        enabled,
        retry: false,
    });

    const refresh = async () => {
        await Promise.all([tablesQuery.refetch(), areasQuery.refetch()]);
    };

    const startTable = async (table: ServiceTableDTO) => {
        if (table.state === "free") {
            const allocation = await allocatePosServiceTable(table.id);
            if (allocation.status !== "success") {
                await refresh();
                throw new Error(allocation.message || "Unable to allocate POS Table");
            }
        }

        try {
            return buildPosTableContext(unwrapTableOrder(await startPosServiceTableOrder(table.id)));
        } catch (error) {
            await refresh();
            throw error;
        }
    };

    const openTable = async (table: ServiceTableDTO) => {
        try {
            return buildPosTableContext(unwrapTableOrder(await getPosServiceTableOrder(table.id)));
        } catch (error) {
            await refresh();
            throw error;
        }
    };

    return {
        tables: tablesQuery.data?.tables ?? [],
        areas: areasQuery.data?.areas ?? [],
        isPending: tablesQuery.isPending || areasQuery.isPending,
        isError: tablesQuery.isError || areasQuery.isError,
        retry: refresh,
        startTable,
        openTable,
        refresh: () => {
            void queryClient.invalidateQueries({ queryKey: posTablesKeys.all });
        },
    };
};
