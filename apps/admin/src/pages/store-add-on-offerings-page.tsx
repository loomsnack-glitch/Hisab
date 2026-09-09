import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    getOrganizationDetails,
    getStore,
    getStoreAddOnOfferings,
} from "@repo/services";
import {
    getStoreProductOfferingAvailability,
    isStoreProductOfferingPriceInherited,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Pencil, Puzzle, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import { StoreOfferingAvailabilityBadge } from "@/components/catalog/product-status-badge";
import UpsertStoreAddOnOfferingDialog from "@/components/catalog/upsert-store-add-on-offering-dialog";
import StoreCatalogTabs from "@/components/catalog/store-catalog-tabs";
import { catalogKeys, organizationKeys } from "@/lib/query-keys";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";

const EMPTY_OFFERINGS: never[] = [];

const StoreAddOnOfferingsPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
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
        <div className="space-y-3" data-admin-workspace="store">
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
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 transition-all duration-300 ease-out animate-in fade-in-40 slide-in-from-bottom-2">
                    {filteredOfferings.map((offering) => {
                        const addOn = offering.addOn;
                        const availability = getStoreProductOfferingAvailability({
                            status: offering.status,
                            product: { status: addOn.status },
                        });
                        const priceInherited = isStoreProductOfferingPriceInherited(offering);

                        return (
                            <Card
                                key={offering.id}
                                className={cn(
                                    "group relative flex flex-col justify-between rounded-2xl border p-3.5 sm:p-4 shadow-2xs transition-all duration-200 min-w-0 hover:shadow-md",
                                    availability === "sellable"
                                        ? "border-border/60 bg-card/70 hover:border-primary/30 hover:bg-card/95"
                                        : "border-border/50 bg-muted/20 opacity-[0.82] hover:opacity-100",
                                )}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-primary/10 text-primary ring-1 ring-black/5 dark:ring-white/5 transition-transform duration-200 group-hover:scale-[1.02]">
                                        <Puzzle className="size-6 text-primary" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-sm sm:text-[15px] text-foreground line-clamp-2 break-words leading-snug">
                                            {addOn.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                                            <StoreOfferingAvailabilityBadge
                                                offering={{
                                                    status: offering.status,
                                                    product: { status: addOn.status },
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between gap-2 border-t border-border/40 pt-2.5 mt-3">
                                    <div className="flex min-w-0 flex-col items-start gap-0.5">
                                        <ProductPriceDisplay
                                            price={offering.effectivePrice}
                                            discount={offering.effectiveDiscount}
                                            size="sm"
                                            align="left"
                                            singleTone="foreground"
                                            compact
                                        />
                                        {!priceInherited ? (
                                            <p className="text-[11px] font-medium text-muted-foreground/80">
                                                Store price
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <UpsertStoreAddOnOfferingDialog
                                            organizationId={organizationId}
                                            storeId={storeId}
                                            offering={offering}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Edit price for ${addOn.name}`}
                                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer transition-colors"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                            }
                                        />
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
