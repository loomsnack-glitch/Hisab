import {
    Armchair,
    BarChart3,
    ChefHat,
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
    { id: "products", label: "POS", icon: Store, path: getPosPanelPath("products"), tab: "products" },
    { id: "tables", label: "Tables", icon: Armchair, path: getPosPanelPath("tables"), tab: "tables" },
    { id: "bills", label: "Bills", icon: ReceiptText, path: getPosPanelPath("bills"), tab: "bills" },
    { id: "kots", label: "KOT", icon: ChefHat, path: getPosPanelPath("kots"), tab: "kots" },
    { id: "customers", label: "Customers", icon: Users, path: getPosPanelPath("customers"), tab: "customers" },
    { id: "reports", label: "Reports", icon: BarChart3, path: getPosPanelPath("reports"), tab: "reports" },
    { id: "purchases", label: "Purchases", icon: ShoppingBag, path: getPosPanelPath("purchases"), tab: "purchases" },
    { id: "appearance", label: "Appearance", icon: Settings2, path: "/appearance" },
];

export const posPrimaryMobileNavIds = ["products", "tables", "bills"] as const;

export const getVisiblePosWorkspaceDestinations = ({
    tableManagementEnabled,
    kotSystemEnabled,
}: {
    tableManagementEnabled: boolean;
    kotSystemEnabled: boolean;
}) =>
    posWorkspaceDestinations.filter((destination) => {
        if (destination.id === "tables" && !tableManagementEnabled) {
            return false;
        }
        if (destination.id === "kots" && !kotSystemEnabled) {
            return false;
        }
        return true;
    });

export const getVisiblePosPrimaryMobileDestinations = ({
    tableManagementEnabled,
    kotSystemEnabled,
}: {
    tableManagementEnabled: boolean;
    kotSystemEnabled: boolean;
}) =>
    getVisiblePosWorkspaceDestinations({ tableManagementEnabled, kotSystemEnabled }).filter((destination) =>
        (posPrimaryMobileNavIds as readonly string[]).includes(destination.id),
    );

export const isPosMoreDestinationActive = (pathname: string) => {
    if (pathname === "/appearance" || pathname === "/settings") {
        return true;
    }

    const tab = posWorkspaceDestinations.find((destination) => destination.path === pathname)?.tab;
    return tab === "reports" || tab === "customers" || tab === "purchases" || tab === "kots";
};
