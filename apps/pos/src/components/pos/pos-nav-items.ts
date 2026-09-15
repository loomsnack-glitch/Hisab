import {
    Armchair,
    ChefHat,
    Printer,
    ReceiptText,
    Settings2,
    Store,
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
    { id: "printer", label: "Printer", icon: Printer, path: "/printer" },
    { id: "appearance", label: "Appearance", icon: Settings2, path: "/appearance" },
];

export const posPrimaryMobileNavIds = ["products", "tables", "bills"] as const;
export const posFooterDestinationIds = ["printer", "appearance"] as const;

export const isPosSettingsPath = (pathname: string) =>
    pathname === "/appearance" || pathname === "/settings" || pathname === "/printer";

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
    if (isPosSettingsPath(pathname)) {
        return true;
    }

    const tab = posWorkspaceDestinations.find((destination) => destination.path === pathname)?.tab;
    return tab === "kots";
};
