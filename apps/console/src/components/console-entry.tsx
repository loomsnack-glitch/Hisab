import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { OwnerUserDTO, PlatformDashboardQueryJSON } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";

import ConsoleLayout from "@/components/console-layout";
import {
    consoleDestinationPaths,
    destinationFromPath,
    type ConsoleDestination,
} from "@/components/console-nav-items";
import OwnerUsersPage, { type OwnerUsersPageProps } from "@/components/owner-users-page";
import PlatformDashboardPage, { type PlatformDashboardPageProps } from "@/components/platform-dashboard-page";
import PlatformOrganizationsPage, { type PlatformOrganizationsPageProps } from "@/components/platform-organizations-page";

type ConsoleEntryProps = {
    ownerUser: OwnerUserDTO;
    onLogout: () => Promise<void>;
    onUnauthorized?: () => Promise<void>;
    ownerUsersPageProps?: Pick<OwnerUsersPageProps, "listOwnerUsers" | "createOwnerUser" | "setOwnerUserActiveState">;
    dashboardPageProps?: Pick<PlatformDashboardPageProps, "getPlatformDashboard" | "initialQuery" | "initialCustomValues">;
    organizationsPageProps?: Pick<
        PlatformOrganizationsPageProps,
        | "getPlatformOrganizations"
        | "getPlatformOrganization"
        | "getPlatformOrganizationStores"
        | "getPlatformStore"
        | "getPlatformOrganizationSales"
        | "getPlatformOrganizationSale"
        | "getPlatformOrganizationCatalog"
        | "getPlatformOrganizationCatalogProduct"
        | "getPlatformOrganizationCatalogCategory"
        | "getPlatformOrganizationCatalogAddOn"
        | "initialSearch"
        | "initialActivity"
    >;
};

const ConsoleEntry = ({
    ownerUser,
    onLogout,
    onUnauthorized,
    ownerUsersPageProps,
    dashboardPageProps,
    organizationsPageProps,
}: ConsoleEntryProps) => {
    const [destination, setDestination] = useState<ConsoleDestination>(() =>
        typeof window === "undefined" ? "home" : destinationFromPath(window.location.pathname),
    );
    const [reportingQuery, setReportingQuery] = useState<PlatformDashboardQueryJSON>(
        dashboardPageProps?.initialQuery ?? { period: "all-time" },
    );
    const [customValues, setCustomValues] = useState(
        dashboardPageProps?.initialCustomValues ?? { startDate: "", endDate: "" },
    );

    useEffect(() => {
        const syncDestination = () => setDestination(destinationFromPath(window.location.pathname));
        window.addEventListener("popstate", syncDestination);
        return () => window.removeEventListener("popstate", syncDestination);
    }, []);

    const navigate = (nextDestination: ConsoleDestination) => {
        const path = consoleDestinationPaths[nextDestination];
        if (window.location.pathname !== path) {
            window.history.pushState(null, "", path);
            window.dispatchEvent(new Event("popstate"));
        }
        setDestination(nextDestination);
    };

    const pageContent = (() => {
        if (destination === "owner-users") {
            return (
                <OwnerUsersPage
                    currentOwnerUser={ownerUser}
                    onUnauthorized={onUnauthorized}
                    {...ownerUsersPageProps}
                />
            );
        }

        if (destination === "dashboard") {
            return (
                <PlatformDashboardPage
                    onUnauthorized={onUnauthorized}
                    {...dashboardPageProps}
                    initialQuery={reportingQuery}
                    initialCustomValues={customValues}
                    onReportingPeriodChange={(query, nextCustomValues) => {
                        setReportingQuery(query);
                        setCustomValues(nextCustomValues);
                    }}
                />
            );
        }

        if (destination === "organizations") {
            return (
                <PlatformOrganizationsPage
                    reportingQuery={reportingQuery}
                    onUnauthorized={onUnauthorized}
                    {...organizationsPageProps}
                />
            );
        }

        return (
            <section className="space-y-6">
                <div className="rounded-[2rem] border border-border/70 bg-card/80 p-6 sm:p-8 shadow-sm">
                    <Badge className="mb-4 rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                        <ShieldCheck className="size-3" /> Active Owner User
                    </Badge>
                    <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                        Welcome, {ownerUser.firstName}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                        Your isolated owner session is active. Use the sidebar to open Dashboard, Organizations,
                        or Console Users.
                    </p>
                </div>
            </section>
        );
    })();

    return (
        <ConsoleLayout
            ownerUser={ownerUser}
            activeDestination={destination}
            onNavigate={navigate}
            onLogout={onLogout}
            fullWidth={destination === "organizations"}
        >
            {pageContent}
        </ConsoleLayout>
    );
};

export default ConsoleEntry;
