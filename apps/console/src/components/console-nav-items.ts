import type { LucideIcon } from "lucide-react";
import { BarChart3, Building2, LayoutDashboard, Users } from "lucide-react";

import { isOrganizationsPath } from "@/lib/organization-inspection-url";

export type ConsoleDestination = "home" | "dashboard" | "organizations" | "owner-users";

export const consoleDestinationPaths: Record<ConsoleDestination, string> = {
    home: "/",
    dashboard: "/dashboard",
    organizations: "/organizations",
    "owner-users": "/console-users",
};

export const destinationFromPath = (pathname: string): ConsoleDestination => {
    if (isOrganizationsPath(pathname)) {
        return "organizations";
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
    { id: "owner-users", label: "Console Users", icon: Users, path: consoleDestinationPaths["owner-users"] },
];
