import { Link, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { ArrowLeft, MonitorSmartphone, Pencil, Settings2, Store } from "lucide-react";

import EditStoreDialog from "@/components/organizations/edit-store-dialog";
import SaleNumberSettingsForm from "@/components/organizations/sale-number-settings-form";
import StoreFeatureSettingsForm from "@/components/organizations/store-feature-settings-form";
import StoreDevicesSection from "@/components/organizations/store-devices-section";
import { formatDateTime } from "@/lib/format";
import { organizationKeys } from "@/lib/query-keys";
import {
    getStoreDetailPath,
    getStoreDetailTab,
    getStoreListPath,
    type StoreDetailTab,
} from "@/lib/store-routes";

const tabs = [
    { label: "Devices", path: "devices" as const, icon: MonitorSmartphone },
    { label: "Settings", path: "settings" as const, icon: Settings2 },
] as const;

const useStoreDetailContext = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const location = useLocation();

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;
    const store = organization?.stores.find((entry) => entry.id === storeId) ?? null;
    const activeTab = getStoreDetailTab(location.pathname);

    return { organizationId, storeId, organizationQuery, organization, store, activeTab };
};

const StoreDetailShell = () => {
    const { organizationId, storeId, organizationQuery, organization, store, activeTab } = useStoreDetailContext();

    if (organizationQuery.isPending) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (organizationQuery.isError || organizationQuery.data?.status === "error" || !organization) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="font-display text-2xl">Organization not found</CardTitle>
                    <CardDescription>
                        {(organizationQuery.error as { message?: string })?.message ??
                            organizationQuery.data?.message ??
                            "This workspace may have been removed or you may not have access to it."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="rounded-full" render={<Link to="/organizations" />}>
                        Return to organizations
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!store) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="font-display text-2xl">Store not found</CardTitle>
                    <CardDescription>
                        This store may have been removed or you may not have access to it.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="rounded-full" render={<Link to={getStoreListPath(organizationId)} />}>
                        Back to stores
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const activeDeviceCount = store.devices.filter((device) => device.status === "active").length;
    const basePath = `/organizations/${organizationId}/stores/${storeId}`;

    return (
        <div className="space-y-6">
            <Button
                variant="ghost"
                className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                render={<Link to={getStoreListPath(organizationId)} />}
            >
                <ArrowLeft className="size-4" />
                Back to stores
            </Button>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Store className="size-4" />
                            </div>
                            <div className="min-w-0 space-y-2">
                                <div>
                                    <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl truncate">
                                        {store.name}
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {store.address ?? "Address not added yet"}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground/80">
                                        Created {formatDateTime(store.createdAt)}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="rounded-full text-xs">
                                        {store.devices.length} device{store.devices.length === 1 ? "" : "s"}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs"
                                    >
                                        {activeDeviceCount} active
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <EditStoreDialog
                            organizationId={organizationId}
                            store={store}
                            trigger={
                                <Button variant="outline" className="rounded-full h-9 text-xs sm:h-10 sm:text-sm px-3.5 sm:px-4 shrink-0">
                                    <Pencil className="size-3.5 sm:size-4" />
                                    Edit store
                                </Button>
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="border-b border-border/60">
                <nav className="grid grid-cols-2 w-full sm:flex sm:w-auto sm:justify-start gap-1" aria-label="Store detail tabs">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.path;

                        return (
                            <Link
                                key={tab.path}
                                to={`${basePath}/${tab.path}`}
                                className={cn(
                                    "relative flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors duration-200 rounded-t-lg whitespace-nowrap text-center",
                                    isActive
                                        ? "text-primary font-semibold"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                                )}
                            >
                                <Icon className="size-3.5 sm:size-4 shrink-0" />
                                <span className="whitespace-nowrap">{tab.label}</span>
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <Outlet />
        </div>
    );
};

const StoreDevicesPage = () => {
    const { organizationId, organization, store } = useStoreDetailContext();

    if (!organization || !store) {
        return null;
    }

    return (
        <StoreDevicesSection
            organizationId={organizationId}
            organizationUsername={organization.username}
            store={store}
        />
    );
};

const StoreSettingsPage = () => {
    const { organizationId, store } = useStoreDetailContext();

    if (!store) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            <StoreFeatureSettingsForm organizationId={organizationId} store={store} />
            <SaleNumberSettingsForm organizationId={organizationId} store={store} />
        </div>
    );
};

const StoreDetailIndexRedirect = () => {
    const { organizationId, storeId } = useParams();
    if (!organizationId || !storeId) {
        return <Navigate to="/organizations" replace />;
    }
    return <Navigate to={getStoreDetailPath(organizationId, storeId, "devices" satisfies StoreDetailTab)} replace />;
};

export { StoreDetailShell, StoreDevicesPage, StoreSettingsPage, StoreDetailIndexRedirect };
export default StoreDetailShell;
