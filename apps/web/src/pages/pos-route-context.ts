import type { DeviceSessionDTO, SaleDetailDTO } from "@repo/types";

export type PosPanelTab = "products" | "bills" | "reports" | "customers" | "purchases" | "whatsapp";

export type PosComposerHandoff = {
    sale: SaleDetailDTO;
    editSaleId: string | null;
};

export const posPanelConfig = {
    products: { path: "/pos", searchPlaceholder: "Search products..." },
    bills: { path: "/pos/bills", searchPlaceholder: "Search bills..." },
    reports: { path: "/pos/reports", searchPlaceholder: "" },
    customers: { path: "/pos/customers", searchPlaceholder: "Search customers..." },
    purchases: { path: "/pos/purchases", searchPlaceholder: "Search purchases..." },
    whatsapp: { path: "/pos/whatsapp", searchPlaceholder: "" },
} as const satisfies Record<PosPanelTab, { path: string; searchPlaceholder: string }>;

export const posPanelTabs = Object.keys(posPanelConfig) as PosPanelTab[];

export const getPosPanelPath = (tab: PosPanelTab) => posPanelConfig[tab].path;

export const getPosPanelTabFromPath = (pathname: string): PosPanelTab => {
    return posPanelTabs.find((tab) => posPanelConfig[tab].path === pathname) ?? "products";
};

export const getPosLoginPath = (returnTo: string) => {
    const searchParams = new URLSearchParams({ returnTo });
    return `/pos/login?${searchParams.toString()}`;
};

export const getPosReturnPath = (returnTo: string | null) => {
    if (!returnTo || returnTo === "/pos/login" || returnTo.startsWith("/pos/login?")) {
        return "/pos";
    }

    return returnTo === "/pos" || returnTo.startsWith("/pos/") ? returnTo : "/pos";
};

export type PosRouteContext = {
    session: DeviceSessionDTO;
    searchValue: string;
    onSearchChange: (value: string) => void;
    onPanelTabChange: (tab: PosPanelTab, composerHandoff?: PosComposerHandoff) => void;
    pendingComposerHandoff: PosComposerHandoff | null;
    clearPendingComposerHandoff: () => void;
};
