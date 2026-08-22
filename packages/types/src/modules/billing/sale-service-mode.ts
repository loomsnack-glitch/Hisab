import type { SaleServiceMode } from "./billing.type";

export const SALE_SERVICE_MODE_LABELS: Record<SaleServiceMode, string> = {
    dine_in: "Dine-In",
    pick_up: "Pick-Up",
};

export const formatSaleServiceModeLabel = (
    mode: SaleServiceMode | null | undefined,
): string => SALE_SERVICE_MODE_LABELS[mode ?? "dine_in"];
