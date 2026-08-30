import type { SaleDetailDTO } from "@repo/types";

export type BillingWorkspaceMode = "admin" | "device";

export type PosPanelTab = "products" | "tables" | "bills" | "reports" | "customers" | "whatsapp";

export type PosComposerHandoff = {
    sale: SaleDetailDTO;
    editSaleId: string | null;
};
