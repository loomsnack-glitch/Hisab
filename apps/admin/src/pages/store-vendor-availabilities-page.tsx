import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getOrganizationDetails,
    getStore,
    getStoreVendorAvailabilities,
    getStoreVendorItemOfferings,
    updateStoreVendorAvailability,
} from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";

import UpsertStoreVendorItemOfferingDialog from "@/components/vendors/upsert-store-vendor-item-offering-dialog";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import { formatCurrency } from "@/lib/format";
import { organizationKeys, vendorKeys } from "@/lib/query-keys";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";

const StoreVendorAvailabilitiesPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const queryClient = useQueryClient();

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
    const availabilitiesQuery = useQuery({
        queryKey: vendorKeys.storeAvailabilities(organizationId, storeId),
        queryFn: () => getStoreVendorAvailabilities(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });
    const offeringsQuery = useQuery({
        queryKey: vendorKeys.storeItemOfferings(organizationId, storeId),
        queryFn: () => getStoreVendorItemOfferings(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;
    const storeFromApi = storeQuery.data?.status === "success" ? storeQuery.data.data?.store ?? null : null;
    const namedStore = resolveNamedStoreInOrganization(storeId, organization?.stores ?? []);
    const store = storeFromApi && namedStore && storeFromApi.id === namedStore.id ? storeFromApi : null;
    const availabilities =
        availabilitiesQuery.data?.status === "success"
            ? availabilitiesQuery.data.data?.availabilities ?? []
            : [];
    const offerings =
        offeringsQuery.data?.status === "success" ? offeringsQuery.data.data?.offerings ?? [] : [];

    const statusMutation = useMutation({
        mutationFn: ({
            availabilityId,
            status,
        }: {
            availabilityId: string;
            status: "active" | "inactive";
        }) => updateStoreVendorAvailability(organizationId, storeId, availabilityId, { status }),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success(response.message);
            queryClient.invalidateQueries({
                queryKey: vendorKeys.storeAvailabilities(organizationId, storeId),
            });
            queryClient.invalidateQueries({
                queryKey: vendorKeys.storeItemOfferings(organizationId, storeId),
            });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to update this Vendor");
        },
    });

    if (organizationQuery.isPending || storeQuery.isPending || availabilitiesQuery.isPending || offeringsQuery.isPending) {
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

    if (availabilitiesQuery.isError || availabilitiesQuery.data?.status === "error" || offeringsQuery.isError || offeringsQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-md">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load vendors</EmptyTitle>
                            <EmptyDescription>
                                {(availabilitiesQuery.error as { message?: string })?.message ??
                                    availabilitiesQuery.data?.message ??
                                    "Store vendors could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button variant="outline" className="rounded-full" onClick={() => {
                                availabilitiesQuery.refetch();
                                offeringsQuery.refetch();
                            }}>
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6" data-admin-workspace="store" data-testid="store-vendors-page">
            <div>
                <p className="text-sm font-medium text-primary">Store workspace</p>
                <h1 className="font-display text-3xl font-semibold tracking-tight">Vendors</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Every Organization Vendor is listed here. {store.name} can activate or deactivate purchasing and keep Store-specific default prices. Deactivating a Vendor does not remove it or its prices.
                </p>
            </div>

            {availabilities.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Truck />
                                </EmptyMedia>
                                <EmptyTitle>No Vendors yet</EmptyTitle>
                                <EmptyDescription>
                                    Create Vendors in the Organization workspace. They will appear here for {store.name} automatically.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button
                                    variant="outline"
                                    className="rounded-full"
                                    render={<Link to={`/organizations/${organizationId}/vendors`} />}
                                >
                                    Organization vendors
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {availabilities.map((availability) => {
                        const vendorOfferings = offerings.filter(
                            (offering) => offering.vendorId === availability.vendorId,
                        );
                        return (
                            <Card key={availability.id} className="border-border/60 bg-card/80 shadow-md">
                                <CardHeader className="pb-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <CardTitle className="font-display text-xl">{availability.vendor.name}</CardTitle>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <ProductStatusBadge status={availability.status} />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-full"
                                                disabled={statusMutation.isPending}
                                                onClick={() =>
                                                    statusMutation.mutate({
                                                        availabilityId: availability.id,
                                                        status: availability.status === "active" ? "inactive" : "active",
                                                    })
                                                }
                                            >
                                                {availability.status === "active" ? "Deactivate" : "Activate"}
                                            </Button>
                                        </div>
                                    </div>
                                    {availability.vendor.description ? (
                                        <CardDescription>{availability.vendor.description}</CardDescription>
                                    ) : null}
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {vendorOfferings.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No Vendor Items yet. Add them in the Organization workspace.
                                        </p>
                                    ) : (
                                        vendorOfferings.map((offering) => (
                                            <div
                                                key={offering.id}
                                                className="flex flex-col gap-3 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-medium">{offering.vendorItem.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Default {formatCurrency(offering.defaultPurchasePrice)}
                                                    </p>
                                                </div>
                                                <UpsertStoreVendorItemOfferingDialog
                                                    organizationId={organizationId}
                                                    storeId={store.id}
                                                    offering={offering}
                                                />
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StoreVendorAvailabilitiesPage;
