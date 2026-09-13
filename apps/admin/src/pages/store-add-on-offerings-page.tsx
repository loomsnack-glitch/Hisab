import { useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import {
    getOrganizationDetails,
    getStore,
    getStoreAddOnOfferings,
} from "@repo/services";
import { isStoreProductOfferingPriceInherited } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { PriceDisplay } from "@repo/ui/components/price-display";
import { Spinner } from "@repo/ui/components/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { Pencil, Puzzle, RefreshCw } from "lucide-react";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertStoreAddOnOfferingDialog from "@/components/catalog/upsert-store-add-on-offering-dialog";
import StoreCatalogTabs from "@/components/catalog/store-catalog-tabs";
import CatalogStatusFilterBar from "@/components/catalog/catalog-status-filter-bar";
import {
    catalogFilterUrlOptions,
    storeCatalogListFilterParsers,
    toggleCatalogStatusFilter,
} from "@/lib/catalog-query-states";
import { catalogKeys, organizationKeys } from "@/lib/query-keys";
import { useDebouncedUrlSearch } from "@/lib/use-debounced-url-search";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";

const EMPTY_OFFERINGS: never[] = [];

const StoreAddOnOfferingsPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const [{ search: searchQuery, statuses: statusFilters, orgStatuses: orgStatusFilters }, setFilters] = useQueryStates(
        storeCatalogListFilterParsers,
        catalogFilterUrlOptions,
    );
    const commitSearch = useCallback((search: string) => setFilters({ search }), [setFilters]);
    const { searchInput, setSearchInput, clearSearch } = useDebouncedUrlSearch(searchQuery, commitSearch);

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
        return offerings.filter((offering) => {
            if (statusFilters.length > 0 && !statusFilters.includes(offering.status)) {
                return false;
            }
            if (orgStatusFilters.length > 0 && !orgStatusFilters.includes(offering.addOn.status)) {
                return false;
            }
            if (!searchQuery.trim()) {
                return true;
            }
            return offering.addOn.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        });
    }, [offerings, searchQuery, statusFilters, orgStatusFilters]);

    const toggleStatusFilter = (value: string) => {
        void setFilters((current) => ({
            statuses: toggleCatalogStatusFilter(current.statuses, value),
        }));
    };

    const toggleOrgStatusFilter = (value: string) => {
        void setFilters((current) => ({
            orgStatuses: toggleCatalogStatusFilter(current.orgStatuses, value),
        }));
    };

    const resetFilters = () => {
        clearSearch();
        void setFilters({ statuses: [], orgStatuses: [] });
    };

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

            <CatalogStatusFilterBar
                searchPlaceholder="Search add-ons..."
                searchInput={searchInput}
                onSearchInputChange={setSearchInput}
                onClearSearch={clearSearch}
                statusFilters={statusFilters}
                onToggleStatus={toggleStatusFilter}
                onSetStatuses={(statuses) => void setFilters({ statuses })}
                orgStatusFilters={orgStatusFilters}
                onToggleOrgStatus={toggleOrgStatusFilter}
                onSetOrgStatuses={(orgStatuses) => void setFilters({ orgStatuses })}
                filterAriaLabel="Filter add-ons"
                mobileSheetTitle="Filter add-ons"
            />

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
                <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                    <p>No add-ons match your search or filters.</p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-4 rounded-full"
                        onClick={resetFilters}
                    >
                        Clear all filters
                    </Button>
                </Card>
            ) : (
                <>
                    <div className="flex items-center px-1 py-0.5">
                        <span className="text-xs text-muted-foreground/70">
                            Showing {filteredOfferings.length} add-on{filteredOfferings.length === 1 ? "" : "s"}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredOfferings.map((offering) => {
                            const addOn = offering.addOn;
                            const priceInherited = isStoreProductOfferingPriceInherited(offering);

                            return (
                                <Card
                                    key={offering.id}
                                    className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                >
                                    <div className="flex items-center justify-between gap-2.5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <Puzzle className="size-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                    {addOn.name}
                                                </h4>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                                            {addOn.status !== "active" ? (
                                                <Badge
                                                    variant="outline"
                                                    className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                                >
                                                    Inactive in org
                                                </Badge>
                                            ) : null}
                                            <ProductStatusBadge status={offering.status} />
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-end justify-between gap-2 border-t border-border/40 pt-2.5">
                                        <div className="flex min-w-0 flex-col items-start gap-0.5">
                                            <PriceDisplay
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

                                        <div className="flex items-center gap-0.5">
                                            <Tooltip>
                                                <TooltipTrigger render={<span className="inline-flex" />}>
                                                    <UpsertStoreAddOnOfferingDialog
                                                        organizationId={organizationId}
                                                        storeId={storeId}
                                                        offering={offering}
                                                        trigger={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={`Edit ${addOn.name}`}
                                                                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-primary/40"
                                                            >
                                                                <Pencil className="size-3.5" />
                                                            </Button>
                                                        }
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent>Edit add-on</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default StoreAddOnOfferingsPage;
