import type { SaleServiceMode } from "@repo/types";

export type PosServiceMode = SaleServiceMode;

export type PosTableContext = {
    tableId: string;
    tableLabel: string;
    tableOrderId: string | null;
    draftSaleId: string | null;
    remainingTotal?: number | null;
    orderDiscountAmount?: number;
};

export const DEFAULT_POS_SERVICE_MODE: PosServiceMode = "dine_in";

export const isPosRestaurantStore = (capabilities: {
    tableManagementEnabled: boolean;
    kotSystemEnabled: boolean;
}) => capabilities.tableManagementEnabled || capabilities.kotSystemEnabled;

export const resolvePosServiceMode = (
    requestedMode: PosServiceMode,
    table: PosTableContext | null,
): PosServiceMode => table ? "dine_in" : requestedMode;
