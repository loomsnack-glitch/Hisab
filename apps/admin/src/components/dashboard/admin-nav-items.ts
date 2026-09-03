import type { LucideIcon } from "lucide-react";
import {
    Armchair,
    Banknote,
    BarChart3,
    Building2,
    Contact,
    Package2,
    ReceiptText,
    Ruler,
    Settings2,
    ShoppingBag,
    Store,
    Truck,
    Users,
    Wallet,
} from "lucide-react";

import WhatsAppIcon from "@/components/icons/whatsapp-icon";
import { isStoresNavActive } from "@/lib/store-routes";

export type AdminNavIcon = LucideIcon | typeof WhatsAppIcon;

export type AdminNavGroup =
    | "organization"
    | "catalog"
    | "sales"
    | "reports"
    | "finance"
    | "integrations";

export const adminNavGroupLabels: Record<AdminNavGroup, string> = {
    organization: "Organization",
    catalog: "Catalog",
    sales: "Sales & Service",
    reports: "Reports",
    finance: "Finance",
    integrations: "Integrations",
};

export const adminNavGroupOrder: AdminNavGroup[] = [
    "organization",
    "catalog",
    "sales",
    "reports",
    "finance",
    "integrations",
];

export type AdminNavDestination = {
    id: string;
    label: string;
    mobileLabel?: string;
    icon: AdminNavIcon;
    requiresOrganization: boolean;
    path: string;
    isActive: (pathname: string) => boolean;
    group: AdminNavGroup;
};

type AdminNavDestinationDef = Omit<AdminNavDestination, "path"> & {
    getPath: (organizationId: string) => string;
};

export type VisibleAdminNavArgs = {
    organizationId?: string;
    hasOrganization: boolean;
};

const adminDestinationDefs: AdminNavDestinationDef[] = [
    {
        id: "organizations",
        label: "Organizations",
        icon: Building2,
        requiresOrganization: false,
        group: "organization",
        getPath: () => "/organizations",
        isActive: (pathname) => pathname === "/organizations",
    },
    {
        id: "stores",
        label: "Stores",
        icon: Store,
        requiresOrganization: true,
        group: "organization",
        getPath: (organizationId) => `/organizations/${organizationId}/stores`,
        isActive: isStoresNavActive,
    },
    {
        id: "products",
        label: "Product",
        icon: Package2,
        requiresOrganization: true,
        group: "catalog",
        getPath: (organizationId) => `/organizations/${organizationId}/products`,
        isActive: (pathname) => /\/organizations\/[^/]+\/products(\/|$)/.test(pathname),
    },
    {
        id: "units",
        label: "Units",
        icon: Ruler,
        requiresOrganization: true,
        group: "catalog",
        getPath: (organizationId) => `/organizations/${organizationId}/units`,
        isActive: (pathname) => /\/organizations\/[^/]+\/units(\/|$)/.test(pathname),
    },
    {
        id: "billing",
        label: "Billing",
        icon: ReceiptText,
        requiresOrganization: true,
        group: "sales",
        getPath: (organizationId) => `/organizations/${organizationId}/billing`,
        isActive: (pathname) => /\/organizations\/[^/]+\/billing/.test(pathname),
    },
    {
        id: "tables",
        label: "Tables",
        icon: Armchair,
        requiresOrganization: true,
        group: "sales",
        getPath: (organizationId) => `/organizations/${organizationId}/tables`,
        isActive: (pathname) => /\/organizations\/[^/]+\/tables/.test(pathname),
    },
    {
        id: "customers",
        label: "Customers",
        icon: Users,
        requiresOrganization: true,
        group: "sales",
        getPath: (organizationId) => `/organizations/${organizationId}/customers`,
        isActive: (pathname) => /\/organizations\/[^/]+\/customers/.test(pathname),
    },
    {
        id: "reports",
        label: "Reports",
        icon: BarChart3,
        requiresOrganization: true,
        group: "reports",
        getPath: (organizationId) => `/organizations/${organizationId}/reports`,
        isActive: (pathname) => /\/organizations\/[^/]+\/reports/.test(pathname),
    },
    {
        id: "money-accounts",
        label: "Money Accounts",
        icon: Wallet,
        requiresOrganization: true,
        group: "finance",
        getPath: (organizationId) => `/organizations/${organizationId}/money-accounts`,
        isActive: (pathname) => /\/organizations\/[^/]+\/money-accounts(\/|$)/.test(pathname),
    },
    {
        id: "vendors",
        label: "Vendors",
        icon: Truck,
        requiresOrganization: true,
        group: "finance",
        getPath: (organizationId) => `/organizations/${organizationId}/vendors`,
        isActive: (pathname) => /\/organizations\/[^/]+\/vendors(\/|$)/.test(pathname),
    },
    {
        id: "purchases",
        label: "Purchases",
        icon: ShoppingBag,
        requiresOrganization: true,
        group: "finance",
        getPath: (organizationId) => `/organizations/${organizationId}/purchases`,
        isActive: (pathname) => /\/organizations\/[^/]+\/purchases(\/|$)/.test(pathname),
    },
    {
        id: "expenses",
        label: "Expenses",
        icon: Banknote,
        requiresOrganization: true,
        group: "finance",
        getPath: (organizationId) => `/organizations/${organizationId}/expenses`,
        isActive: (pathname) => /\/organizations\/[^/]+\/expenses(\/|$)/.test(pathname),
    },
    {
        id: "whatsapp",
        label: "WhatsApp",
        icon: WhatsAppIcon,
        requiresOrganization: true,
        group: "integrations",
        getPath: (organizationId) => `/organizations/${organizationId}/whatsapp/accounts`,
        isActive: (pathname) => /\/organizations\/[^/]+\/whatsapp(\/|$)/.test(pathname),
    },
    {
        id: "google-contacts",
        label: "Google Contacts",
        icon: Contact,
        requiresOrganization: true,
        group: "integrations",
        getPath: (organizationId) => `/organizations/${organizationId}/settings`,
        isActive: (pathname) => /\/organizations\/[^/]+\/settings(\/|$)/.test(pathname),
    },
    {
        id: "appearance",
        label: "Appearance",
        icon: Settings2,
        requiresOrganization: false,
        group: "organization",
        getPath: () => "/appearance",
        isActive: (pathname) => pathname === "/appearance" || pathname === "/settings",
    },
];

export const adminPrimaryMobileNavIds = ["stores", "products", "billing"] as const;

const resolveDestinations = ({
    organizationId = "",
    hasOrganization,
}: VisibleAdminNavArgs): AdminNavDestination[] =>
    adminDestinationDefs
        .filter((destination) => !destination.requiresOrganization || (hasOrganization && Boolean(organizationId)))
        .map((destination) => ({
            id: destination.id,
            label: destination.label,
            mobileLabel: destination.mobileLabel,
            icon: destination.icon,
            requiresOrganization: destination.requiresOrganization,
            group: destination.group,
            path: destination.getPath(organizationId),
            isActive: destination.isActive,
        }));

export const getVisibleAdminWorkspaceDestinations = (args: VisibleAdminNavArgs) =>
    resolveDestinations(args);

export const getVisibleAdminMainDestinations = (args: VisibleAdminNavArgs) =>
    resolveDestinations(args).filter((destination) => destination.id !== "appearance");

export type AdminNavGroupedSection = {
    group: AdminNavGroup;
    label: string;
    items: AdminNavDestination[];
};

export const getGroupedAdminMainDestinations = (args: VisibleAdminNavArgs): AdminNavGroupedSection[] => {
    const flat = getVisibleAdminMainDestinations(args);
    const byGroup = new Map<AdminNavGroup, AdminNavDestination[]>();

    for (const item of flat) {
        const existing = byGroup.get(item.group);
        if (existing) {
            existing.push(item);
        } else {
            byGroup.set(item.group, [item]);
        }
    }

    return adminNavGroupOrder
        .filter((group) => byGroup.has(group))
        .map((group) => ({
            group,
            label: adminNavGroupLabels[group],
            items: byGroup.get(group)!,
        }));
};

export const getVisibleAdminPrimaryMobileDestinations = (args: VisibleAdminNavArgs) => {
    const visible = resolveDestinations(args);
    const primary = visible.filter((destination) =>
        (adminPrimaryMobileNavIds as readonly string[]).includes(destination.id),
    );

    if (primary.length > 0) {
        return primary;
    }

    return visible.filter((destination) => destination.id === "organizations");
};

export const isAdminMoreDestinationActive = (pathname: string, args: VisibleAdminNavArgs) => {
    const primary = getVisibleAdminPrimaryMobileDestinations(args);
    if (primary.some((destination) => destination.isActive(pathname))) {
        return false;
    }

    return getVisibleAdminWorkspaceDestinations(args).some((destination) => destination.isActive(pathname));
};
