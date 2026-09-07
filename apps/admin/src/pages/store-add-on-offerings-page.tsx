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
import { cn } from "@repo/ui/lib/utils";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertStoreAddOnOfferingDialog from "@/components/catalog/upsert-store-add-on-offering-dialog";
import StoreCatalogTabs from "@/components/catalog/store-catalog-tabs";
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
        <div className="space-y-6" data-admin-workspace="store">
            {/* Store Catalog Navigation Tabs */}
            <StoreCatalogTabs organizationId={organizationId} storeId={storeId} />

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
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3 transition-all duration-300 ease-out animate-in fade-in-40 slide-in-from-bottom-2">
                    {filteredOfferings.map((offering) => {
                        const addOn = offering.addOn;
                        const globallyPublished = addOn.status === "active";

                        return (
                            <Card
                                key={offering.id}
                                className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card/70 p-3.5 sm:p-4 shadow-2xs transition-all duration-200 hover:border-primary/30 hover:bg-card/95 hover:shadow-md min-w-0"
                            >
                                {/* Top section: Icon, Name & Organization Defaults */}
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-primary/10 text-primary">
                                        <Puzzle className="size-5 sm:size-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-1.5">
                                            <h4 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 break-words leading-snug">
                                                {addOn.name}
                                            </h4>
                                            <UpsertStoreAddOnOfferingDialog
                                                organizationId={organizationId}
                                                storeId={storeId}
                                                offering={offering}
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer transition-colors shrink-0"
                                                        title="Override price or discount"
                                                        aria-label="Override price or discount"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground pt-0.5">
                                            Org default ₹{addOn.price}
                                            {addOn.discount > 0 ? ` · −₹${addOn.discount}` : ""}
                                        </p>
                                    </div>
                                </div>

                                {/* Bottom section: Effective Price, Status & Toggle Button */}
                                <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2.5 mt-3">
                                    <div className="flex flex-col items-start min-w-0">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                                            Effective price
                                        </span>
                                        <ProductPriceDisplay
                                            price={offering.effectivePrice}
                                            discount={offering.effectiveDiscount}
                                            size="sm"
                                            align="left"
                                            singleTone="foreground"
                                        />
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                            <ProductStatusBadge status={offering.status} />
                                            <span className="text-[10px] text-muted-foreground truncate">
                                                {offering.isPriceInherited && offering.isDiscountInherited
                                                    ? "Inherited pricing"
                                                    : "Store override"}
                                            </span>
                                            {!globallyPublished ? (
                                                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                                    (Paused in Org)
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "rounded-full h-8 px-3 text-xs font-medium transition-all cursor-pointer",
                                                offering.status === "active"
                                                    ? "border-border/60 bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-muted-foreground"
                                                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
                                            )}
                                            disabled={statusMutation.isPending}
                                            onClick={() =>
                                                statusMutation.mutate({
                                                    offeringId: offering.id,
                                                    status: offering.status === "active" ? "inactive" : "active",
                                                })
                                            }
                                        >
                                            {statusMutation.isPending && statusMutation.variables?.offeringId === offering.id ? (
                                                <Spinner className="size-3" />
                                            ) : offering.status === "active" ? (
                                                "Disable"
                                            ) : (
                                                "Enable"
                                            )}
                                        </Button>
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
