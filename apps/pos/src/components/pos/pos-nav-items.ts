import {
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
    { id: "products", label: "Products", mobileLabel: "POS", icon: Store, path: getPosPanelPath("products"), tab: "products" },
    { id: "bills", label: "Bills", icon: ReceiptText, path: getPosPanelPath("bills"), tab: "bills" },
    { id: "appearance", label: "Appearance", icon: Settings2, path: "/appearance" },
];

export const posPrimaryMobileNavIds = ["products", "bills", "appearance"] as const;

export const posPrimaryMobileDestinations = posWorkspaceDestinations.filter((destination) =>
    (posPrimaryMobileNavIds as readonly string[]).includes(destination.id),
);

export const isPosMoreDestinationActive = (pathname: string) => {
    return pathname === "/appearance" || pathname === "/settings";
};
