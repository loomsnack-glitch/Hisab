import type { LucideIcon } from "lucide-react";
import { BarChart3, Building2, LayoutDashboard, Package, Users } from "lucide-react";

import { isCommercialCatalogPath } from "@/lib/commercial-catalog-url";
import { isOrganizationsPath } from "@/lib/organization-inspection-url";

export type ConsoleDestination = "home" | "dashboard" | "organizations" | "commercial-catalog" | "owner-users";

export const consoleDestinationPaths: Record<ConsoleDestination, string> = {
    home: "/",
    dashboard: "/dashboard",
    organizations: "/organizations",
    "commercial-catalog": "/plans/list",
    "owner-users": "/console-users",
};

export const destinationFromPath = (pathname: string): ConsoleDestination => {
    if (isOrganizationsPath(pathname)) {
        return "organizations";
    }
    if (isCommercialCatalogPath(pathname)) {
        return "commercial-catalog";
    }
    const matched = (Object.entries(consoleDestinationPaths) as [ConsoleDestination, string][])
        .find(([, path]) => path === pathname);
    return matched?.[0] ?? "home";
};

export type ConsoleNavItem = {
    id: ConsoleDestination;
    label: string;
    icon: LucideIcon;
    path: string;
};

export const consoleNavItems: ConsoleNavItem[] = [
    { id: "home", label: "Overview", icon: LayoutDashboard, path: consoleDestinationPaths.home },
    { id: "dashboard", label: "Dashboard", icon: BarChart3, path: consoleDestinationPaths.dashboard },
    { id: "organizations", label: "Organizations", icon: Building2, path: consoleDestinationPaths.organizations },
    { id: "commercial-catalog", label: "Plans", icon: Package, path: consoleDestinationPaths["commercial-catalog"] },
    { id: "owner-users", label: "Console Users", icon: Users, path: consoleDestinationPaths["owner-users"] },
];
