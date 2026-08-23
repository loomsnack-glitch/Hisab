import type { DeviceSessionDTO, SaleDetailDTO, ServiceTableDTO, TableOrderDTO } from "@repo/types";

export type PosPanelTab = "products" | "tables" | "bills" | "kots" | "reports" | "customers" | "purchases" | "whatsapp";

export type PosComposerHandoff = {
    sale: SaleDetailDTO | null;
    editSaleId: string | null;
    table?: ServiceTableDTO;
    tableOrder?: TableOrderDTO | null;
};

export const posPanelConfig = {
    products: { path: "/", searchPlaceholder: "Search products..." },
    tables: { path: "/tables", searchPlaceholder: "" },
    bills: { path: "/bills", searchPlaceholder: "Search bills..." },
    kots: { path: "/kots", searchPlaceholder: "" },
    reports: { path: "/reports", searchPlaceholder: "" },
    customers: { path: "/customers", searchPlaceholder: "Search customers..." },
    purchases: { path: "/purchases", searchPlaceholder: "Search purchases..." },
    whatsapp: { path: "/whatsapp", searchPlaceholder: "" },
} as const satisfies Record<PosPanelTab, { path: string; searchPlaceholder: string }>;

export const posPanelTabs = Object.keys(posPanelConfig) as PosPanelTab[];

export const getPosPanelPath = (tab: PosPanelTab) => posPanelConfig[tab].path;

export const getPosPanelTabFromPath = (pathname: string): PosPanelTab => {
    return posPanelTabs.find((tab) => posPanelConfig[tab].path === pathname) ?? "products";
};

export const getPosLoginPath = (returnTo: string) => {
    const searchParams = new URLSearchParams({ returnTo });
    return `/login?${searchParams.toString()}`;
};

export const getPosReturnPath = (returnTo: string | null) => {
    if (!returnTo || returnTo === "/login" || returnTo.startsWith("/login?")) {
        return "/";
    }

    if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
        return "/";
    }

    return returnTo;
};

export type PosRouteContext = {
    session: DeviceSessionDTO;
    searchValue: string;
    onSearchChange: (value: string) => void;
    onPanelTabChange: (tab: PosPanelTab, composerHandoff?: PosComposerHandoff) => void;
    pendingComposerHandoff: PosComposerHandoff | null;
    clearPendingComposerHandoff: () => void;
};
