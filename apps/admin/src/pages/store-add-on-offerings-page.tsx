import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getOrganizationDetails,
    getStore,
    getStoreAddOnOfferings,
    updateStoreAddOnOffering,
} from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Pencil, Puzzle, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertStoreAddOnOfferingDialog from "@/components/catalog/upsert-store-add-on-offering-dialog";
import { catalogKeys, organizationKeys } from "@/lib/query-keys";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";

const EMPTY_OFFERINGS: never[] = [];

const StoreAddOnOfferingsPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");

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
    const offeringsQuery = useQuery({
        queryKey: catalogKeys.storeAddOnOfferings(organizationId, storeId),
        queryFn: () => getStoreAddOnOfferings(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;
    const storeFromApi = storeQuery.data?.status === "success" ? storeQuery.data.data?.store ?? null : null;
    const namedStore = resolveNamedStoreInOrganization(storeId, organization?.stores ?? []);
    const store = storeFromApi && namedStore && storeFromApi.id === namedStore.id ? storeFromApi : null;
    const offerings =
        offeringsQuery.data?.status === "success" ? offeringsQuery.data.data?.offerings ?? EMPTY_OFFERINGS : EMPTY_OFFERINGS;

    const filteredOfferings = useMemo(() => {
        if (!searchQuery.trim()) {
            return offerings;
        }
        const query = searchQuery.toLowerCase().trim();
        return offerings.filter((offering) => offering.addOn.name.toLowerCase().includes(query));
    }, [offerings, searchQuery]);

    const statusMutation = useMutation({
        mutationFn: ({
            offeringId,
            status,
        }: {
            offeringId: string;
            status: "active" | "inactive";
        }) => updateStoreAddOnOffering(organizationId, storeId, offeringId, { status }),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success(response.message);
            queryClient.invalidateQueries({
                queryKey: catalogKeys.storeAddOnOfferings(organizationId, storeId),
            });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to update this add-on");
        },
    });

    if (organizationQuery.isPending || storeQuery.isPending || offeringsQuery.isPending) {
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

    if (offeringsQuery.isError || offeringsQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-md">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load add-ons</EmptyTitle>
                            <EmptyDescription>
                                {(offeringsQuery.error as { message?: string })?.message ??
                                    offeringsQuery.data?.message ??
                                    "Store add-ons could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button variant="outline" className="rounded-full" onClick={() => offeringsQuery.refetch()}>
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-5" data-admin-workspace="store">
            <div>
                <p className="text-sm font-medium text-primary">Store workspace</p>
                <h1 className="font-display text-3xl font-semibold tracking-tight">Add-ons</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Every Organization Add-on is listed here. {store.name} controls effective price, discount, and local menu status. Values can inherit Organization defaults or use explicit Store overrides.
                </p>
            </div>

            <div className="relative max-w-md w-full group/search">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                <Input
                    type="text"
                    placeholder="Search add-ons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all duration-200 text-sm w-full shadow-2xs"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                        aria-label="Clear search"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
            </div>

            {offerings.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Puzzle />
                                </EmptyMedia>
                                <EmptyTitle>No Add-ons yet</EmptyTitle>
                                <EmptyDescription>
                                    Create Add-ons in the Organization workspace. They will appear here for {store.name} automatically.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button
                                    variant="outline"
                                    className="rounded-full"
                                    render={<Link to={`/organizations/${organizationId}/products/add-ons`} />}
                                >
                                    Organization add-ons
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : filteredOfferings.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Puzzle />
                                </EmptyMedia>
                                <EmptyTitle>No add-ons found</EmptyTitle>
                                <EmptyDescription>Try adjusting your search query.</EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))]">
                    {filteredOfferings.map((offering) => {
                        const addOn = offering.addOn;
                        const globallyPublished = addOn.status === "active";

                        return (
                            <Card
                                key={offering.id}
                                className="group rounded-2xl border border-border/60 bg-card/70 p-3 sm:p-3.5 shadow-sm transition-all duration-200 hover:border-primary/25 hover:bg-card hover:shadow-md min-w-0"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-muted/25">
                                        <Puzzle className="size-6 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{addOn.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Org default ₹{addOn.price}
                                                    {addOn.discount > 0 ? ` · −₹${addOn.discount}` : ""}
                                                </p>
                                            </div>
                                            <UpsertStoreAddOnOfferingDialog
                                                organizationId={organizationId}
                                                storeId={storeId}
                                                offering={offering}
                                                trigger={
                                                    <Button variant="outline" size="sm" className="rounded-full shrink-0">
                                                        <Pencil className="size-3" />
                                                        Edit
                                                    </Button>
                                                }
                                            />
                                        </div>
                                        <ProductPriceDisplay
                                            price={offering.effectivePrice}
                                            discount={offering.effectiveDiscount}
                                            size="sm"
                                            align="left"
                                        />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <ProductStatusBadge status={offering.status} />
                                            <span className="text-xs text-muted-foreground">
                                                {offering.isPriceInherited && offering.isDiscountInherited
                                                    ? "Inherited pricing"
                                                    : "Store override"}
                                            </span>
                                            {!globallyPublished ? (
                                                <span className="text-xs text-amber-700 dark:text-amber-300">
                                                    Globally paused
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-full h-8 text-xs"
                                                disabled={statusMutation.isPending || offering.status === "active"}
                                                onClick={() =>
                                                    statusMutation.mutate({
                                                        offeringId: offering.id,
                                                        status: "active",
                                                    })
                                                }
                                            >
                                                Enable locally
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-full h-8 text-xs"
                                                disabled={statusMutation.isPending || offering.status === "inactive"}
                                                onClick={() =>
                                                    statusMutation.mutate({
                                                        offeringId: offering.id,
                                                        status: "inactive",
                                                    })
                                                }
                                            >
                                                Disable locally
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default StoreAddOnOfferingsPage;
