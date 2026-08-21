import {
    Armchair,
    BarChart3,
    ReceiptText,
    Settings2,
    ShoppingBag,
    Store,
    Users,
    type LucideIcon,
} from "lucide-react";

import { getPosPanelPath, type PosPanelTab } from "@/pages/pos-route-context";

export type PosNavDestination = {
    id: string;
    label: string;
    mobileLabel?: string;
    icon: LucideIcon;
    path: string;
    tab?: PosPanelTab;
};

export const posWorkspaceDestinations: PosNavDestination[] = [
    { id: "products", label: "Products", mobileLabel: "POS", icon: Store, path: getPosPanelPath("products"), tab: "products" },
    { id: "tables", label: "Tables", icon: Armchair, path: getPosPanelPath("tables"), tab: "tables" },
    { id: "customers", label: "Customers", icon: Users, path: getPosPanelPath("customers"), tab: "customers" },
    { id: "bills", label: "Bills", icon: ReceiptText, path: getPosPanelPath("bills"), tab: "bills" },
    { id: "reports", label: "Reports", icon: BarChart3, path: getPosPanelPath("reports"), tab: "reports" },
    { id: "purchases", label: "Purchases", icon: ShoppingBag, path: getPosPanelPath("purchases"), tab: "purchases" },
    { id: "appearance", label: "Appearance", icon: Settings2, path: "/appearance" },
];

export const posPrimaryMobileNavIds = ["products", "tables", "bills"] as const;

export const posPrimaryMobileDestinations = posWorkspaceDestinations.filter((destination) =>
    (posPrimaryMobileNavIds as readonly string[]).includes(destination.id),
);

export const isPosMoreDestinationActive = (pathname: string) => {
    if (pathname === "/appearance" || pathname === "/settings") {
        return true;
    }

    const tab = posWorkspaceDestinations.find((destination) => destination.path === pathname)?.tab;
    return tab === "reports" || tab === "customers" || tab === "purchases";
};
