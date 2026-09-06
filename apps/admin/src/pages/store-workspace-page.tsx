import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails, getStore } from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { Building2, Package2, Store } from "lucide-react";

import { AdminWorkspaceSwitcherPanel } from "@/components/dashboard/admin-workspace-switcher";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { organizationKeys } from "@/lib/query-keys";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";
import { getStoreProductsPath } from "@/lib/store-workspace-routes";

const StoreWorkspacePage = () => {
    const { organizationId = "", storeId = "" } = useParams();

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    const storeQuery = useQuery({
        queryKey: organizationKeys.store(organizationId, storeId),
        queryFn: () => getStore(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;
    const storeFromApi = storeQuery.data?.status === "success" ? storeQuery.data.data?.store ?? null : null;
    const namedStore = resolveNamedStoreInOrganization(storeId, organization?.stores ?? []);
    const store = storeFromApi && namedStore && storeFromApi.id === namedStore.id ? storeFromApi : null;

    if (organizationQuery.isPending || storeQuery.isPending) {
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

    if (storeQuery.data?.status === "error" || !store) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="font-display text-2xl">Store not found</CardTitle>
                    <CardDescription>
                        {storeQuery.data?.status === "error"
                            ? storeQuery.data.message
                            : "This store may have been removed or you may not have access to it."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        className="rounded-full"
                        render={<Link to={getOrganizationWorkspacePath(organizationId)} />}
                    >
                        Organization workspace
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6" data-admin-workspace="store">
            <div>
                <p className="text-sm font-medium text-primary">Store workspace</p>
                <h1 className="font-display text-3xl font-semibold tracking-tight">{store.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {store.address ?? "This Store workspace is for local operations. Shared setup stays in the Organization workspace."}
                </p>
            </div>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Store className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="font-display text-2xl">{store.name}</CardTitle>
                            <CardDescription>
                                Selected Store in {organization.name}. Organization-level catalog, vendors, and customers stay in the Organization workspace.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            className="rounded-full"
                            render={<Link to={getOrganizationWorkspacePath(organizationId)} />}
                        >
                            <Building2 className="size-4" />
                            Organization workspace
                        </Button>
                        <Button
                            className="rounded-full"
                            render={<Link to={getStoreProductsPath(organizationId, store.id)} />}
                        >
                            <Package2 className="size-4" />
                            Products
                        </Button>
                    </div>
                    <AdminWorkspaceSwitcherPanel
                        organizationId={organizationId}
                        organizationName={organization.name}
                        stores={organization.stores}
                        selectedStoreId={store.id}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default StoreWorkspacePage;
