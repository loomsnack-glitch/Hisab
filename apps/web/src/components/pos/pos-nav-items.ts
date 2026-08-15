import {
    BarChart3,
    LayoutGrid,
    ReceiptText,
    Settings2,
    ShoppingBag,
    Users,
    type LucideIcon,
} from "lucide-react";

import { getPosPanelPath, type PosPanelTab } from "@/pages/pos-route-context";

export type PosNavDestination = {
    id: string;
    label: string;
    icon: LucideIcon;
    path: string;
    tab?: PosPanelTab;
};

export const posWorkspaceDestinations: PosNavDestination[] = [
    { id: "products", label: "Products", icon: LayoutGrid, path: getPosPanelPath("products"), tab: "products" },
    { id: "bills", label: "Bills", icon: ReceiptText, path: getPosPanelPath("bills"), tab: "bills" },
    { id: "reports", label: "Reports", icon: BarChart3, path: getPosPanelPath("reports"), tab: "reports" },
    { id: "customers", label: "Customers", icon: Users, path: getPosPanelPath("customers"), tab: "customers" },
    { id: "purchases", label: "Purchases", icon: ShoppingBag, path: getPosPanelPath("purchases"), tab: "purchases" },
    { id: "settings", label: "Settings", icon: Settings2, path: "/pos/settings" },
];

export const posPrimaryMobileNavIds = ["products", "bills", "reports"] as const;

export const posPrimaryMobileDestinations = posWorkspaceDestinations.filter((destination) =>
    (posPrimaryMobileNavIds as readonly string[]).includes(destination.id),
);

export const posSecondaryMobileDestinations = posWorkspaceDestinations.filter(
    (destination) => !(posPrimaryMobileNavIds as readonly string[]).includes(destination.id),
);

export const isPosMoreDestinationActive = (pathname: string) => {
    if (pathname === "/pos/settings") {
        return true;
    }

    const tab = posWorkspaceDestinations.find((destination) => destination.path === pathname)?.tab;
    return tab === "customers" || tab === "purchases";
};
