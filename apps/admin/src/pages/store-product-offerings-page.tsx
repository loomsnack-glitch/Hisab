import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import {
    getCategories,
    getOrganizationDetails,
    getStore,
    getStoreCategoryPresentations,
    getStoreCommercialStatus,
    getStoreProductOfferings,
} from "@repo/services";
import {
    catalogSellingQuantityLabel,
    getStoreProductOfferingAvailability,
    isStoreProductOfferingPriceInherited,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { Package2, Pencil, RefreshCw } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

import CatalogAccessPaused from "@/components/commercial/catalog-access-paused";
import { PriceDisplay } from "@repo/ui/components/price-display";
import { StoreOfferingAvailabilityBadge } from "@/components/catalog/product-status-badge";
import ProductTypeBadge from "@/components/catalog/product-type-badge";
import UpsertStoreProductOfferingDialog from "@/components/catalog/upsert-store-product-offering-dialog";
import StoreCatalogTabs from "@/components/catalog/store-catalog-tabs";
import CatalogStatusFilterBar from "@/components/catalog/catalog-status-filter-bar";
import CatalogCategoryFilterPills from "@/components/catalog/catalog-category-filter-pills";
import {
    catalogFilterUrlOptions,
    catalogStatusFilterAllows,
    storeProductListFilterParsers,
    toggleCatalogStatusFilter,
    type CatalogStatusFilter,
} from "@/lib/catalog-query-states";
import { catalogKeys, commercialLicenseKeys, organizationKeys } from "@/lib/query-keys";
import { useDebouncedUrlSearch } from "@/lib/use-debounced-url-search";
import { isQueryCommercialAccessDenied } from "@/lib/commercial-access";
import { featureAccessPausedState } from "@/lib/commercial-access-paused-state";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";
import { getStoreLicensePath } from "@/lib/store-workspace-routes";
import { adminWorkspacePageHeightClass } from "@/lib/workspace-page-layout";

const EMPTY_CATALOG_ITEMS: never[] = [];

const StoreProductOfferingsPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const [{
        search: searchQuery,
        statuses: statusFilters,
        orgStatuses: orgStatusFilters,
        categoryStatuses,
        orgCategoryStatuses,
    }, setFilters] = useQueryStates(
        storeProductListFilterParsers,
        catalogFilterUrlOptions,
    );
    const commitSearch = useCallback((search: string) => setFilters({ search }), [setFilters]);
    const { searchInput, setSearchInput, clearSearch } = useDebouncedUrlSearch(searchQuery, commitSearch);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

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
    const categoriesQuery = useQuery({
        queryKey: catalogKeys.categories(organizationId),
        queryFn: () => getCategories(organizationId),
        enabled: Boolean(organizationId),
    });
    const presentationsQuery = useQuery({
        queryKey: catalogKeys.storeCategoryPresentations(organizationId, storeId),
        queryFn: () => getStoreCategoryPresentations(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });
    const offeringsQuery = useQuery({
        queryKey: catalogKeys.storeProductOfferings(organizationId, storeId),
        queryFn: () => getStoreProductOfferings(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });
    const commercialStatusQuery = useQuery({
        queryKey: commercialLicenseKeys.status(organizationId, storeId),
        queryFn: () => getStoreCommercialStatus(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;
    const storeFromApi = storeQuery.data?.status === "success" ? storeQuery.data.data?.store ?? null : null;
    const namedStore = resolveNamedStoreInOrganization(storeId, organization?.stores ?? []);
    const store = storeFromApi && namedStore && storeFromApi.id === namedStore.id ? storeFromApi : null;
    const categories =
        categoriesQuery.data?.status === "success"
            ? categoriesQuery.data.data?.categories ?? EMPTY_CATALOG_ITEMS
            : EMPTY_CATALOG_ITEMS;
    const presentations =
        presentationsQuery.data?.status === "success"
            ? presentationsQuery.data.data?.presentations ?? []
            : [];
    const offerings =
        offeringsQuery.data?.status === "success" ? offeringsQuery.data.data?.offerings ?? [] : [];
    const commercialStatus = commercialStatusQuery.data?.status === "success"
        ? commercialStatusQuery.data.data?.commercialStatus ?? null
        : null;
    const offeringsAccessDenied = isQueryCommercialAccessDenied(offeringsQuery);
    const accessState = commercialStatus ? featureAccessPausedState(commercialStatus, "catalog_products") : null;
    const retryingCatalogAccess = offeringsQuery.isFetching || commercialStatusQuery.isFetching;

    const categoryMap = useMemo(
        () => new Map(categories.map((category) => [category.id, category])),
        [categories],
    );
    const presentationByCategoryId = useMemo(
        () => new Map(presentations.map((presentation) => [presentation.categoryId, presentation])),
        [presentations],
    );
    const storeCategoryStatus = (categoryId: string): CatalogStatusFilter =>
        presentationByCategoryId.get(categoryId)?.visible === false ? "inactive" : "active";

    const categoryPills = useMemo(
        () =>
            categories.flatMap((category) => {
                const localStatus = storeCategoryStatus(category.id);
                if (!catalogStatusFilterAllows(localStatus, categoryStatuses)) {
                    return [];
                }
                if (!catalogStatusFilterAllows(category.status, orgCategoryStatuses)) {
                    return [];
                }
                return [{
                    id: category.id,
                    name: category.name,
                    inactive: localStatus === "inactive" || category.status === "inactive",
                    sortOrder: presentationByCategoryId.get(category.id)?.sortOrder ?? category.sortOrder,
                }];
            }).sort((left, right) => left.sortOrder - right.sortOrder),
        [categories, categoryStatuses, orgCategoryStatuses, presentationByCategoryId],
    );

    useEffect(() => {
        if (selectedCategoryFilter === "all") {
            return;
        }
        if (!categoryPills.some((category) => category.id === selectedCategoryFilter)) {
            setSelectedCategoryFilter("all");
        }
    }, [categoryPills, selectedCategoryFilter]);

    const filteredOfferings = useMemo(() => {
        return offerings.filter((offering) => {
            if (selectedCategoryFilter !== "all" && offering.product.categoryId !== selectedCategoryFilter) {
                return false;
            }
            const category = categoryMap.get(offering.product.categoryId);
            const localCategoryStatus =
                presentationByCategoryId.get(offering.product.categoryId)?.visible === false
                    ? "inactive"
                    : "active";
            if (!catalogStatusFilterAllows(localCategoryStatus, categoryStatuses)) {
                return false;
            }
            if (!catalogStatusFilterAllows(category?.status ?? "active", orgCategoryStatuses)) {
                return false;
            }
            if (statusFilters.length > 0 && !statusFilters.includes(offering.status)) {
                return false;
            }
            if (orgStatusFilters.length > 0 && !orgStatusFilters.includes(offering.product.status)) {
                return false;
            }
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const productName = offering.product.name.toLowerCase();
                const categoryName = category?.name.toLowerCase() ?? "";
                return productName.includes(query) || categoryName.includes(query);
            }
            return true;
        });
    }, [
        offerings,
        selectedCategoryFilter,
        statusFilters,
        orgStatusFilters,
        categoryStatuses,
        orgCategoryStatuses,
        searchQuery,
        categoryMap,
        presentationByCategoryId,
    ]);

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

    const toggleCategoryStatusFilter = (value: string) => {
        void setFilters((current) => ({
            categoryStatuses: toggleCatalogStatusFilter(current.categoryStatuses, value),
        }));
    };

    const toggleOrgCategoryStatusFilter = (value: string) => {
        void setFilters((current) => ({
            orgCategoryStatuses: toggleCatalogStatusFilter(current.orgCategoryStatuses, value),
        }));
    };

    const resetFilters = () => {
        clearSearch();
        setSelectedCategoryFilter("all");
        void setFilters({
            statuses: [],
            orgStatuses: [],
            categoryStatuses: [],
            orgCategoryStatuses: [],
        });
    };

    if (
        organizationQuery.isPending
        || storeQuery.isPending
        || categoriesQuery.isPending
        || presentationsQuery.isPending
        || offeringsQuery.isPending
    ) {
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

    if (offeringsAccessDenied && accessState) {
        return (
            <div className={adminWorkspacePageHeightClass}>
                <CatalogAccessPaused
                    className="h-full min-h-0"
                    badge={accessState.badge}
                    title={accessState.title}
                    message={accessState.description}
                    actionLabel={accessState.actionLabel}
                    actionHref={getStoreLicensePath(organizationId, storeId)}
                    retrying={retryingCatalogAccess}
                    onRetry={() => {
                        void offeringsQuery.refetch();
                        void commercialStatusQuery.refetch();
                    }}
                />
            </div>
        );
    }

    if (categoriesQuery.isError || offeringsQuery.isError || categoriesQuery.data?.status === "error" || offeringsQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-md">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load products</EmptyTitle>
                            <EmptyDescription>
                                {(offeringsQuery.error as { message?: string })?.message ??
                                    offeringsQuery.data?.message ??
                                    "Store products could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button variant="outline" className="rounded-full" onClick={() => {
                                categoriesQuery.refetch();
                                presentationsQuery.refetch();
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
        <div className="space-y-3" data-admin-workspace="store">
            {/* Store Catalog Navigation Tabs */}
            <StoreCatalogTabs organizationId={organizationId} storeId={storeId} />

            <CatalogStatusFilterBar
                searchPlaceholder="Search products..."
                searchInput={searchInput}
                onSearchInputChange={setSearchInput}
                onClearSearch={clearSearch}
                statusFilters={statusFilters}
                onToggleStatus={toggleStatusFilter}
                onSetStatuses={(statuses) => void setFilters({ statuses })}
                orgStatusFilters={orgStatusFilters}
                onToggleOrgStatus={toggleOrgStatusFilter}
                onSetOrgStatuses={(orgStatuses) => void setFilters({ orgStatuses })}
                extraFilterGroups={[
                    {
                        label: "Category",
                        selectedValues: categoryStatuses,
                        onToggle: toggleCategoryStatusFilter,
                        onSet: (statuses) => void setFilters({ categoryStatuses: statuses }),
                    },
                    {
                        label: "Org category",
                        selectedValues: orgCategoryStatuses,
                        onToggle: toggleOrgCategoryStatusFilter,
                        onSet: (statuses) => void setFilters({ orgCategoryStatuses: statuses }),
                    },
                ]}
                filterAriaLabel="Filter products"
                mobileSheetTitle="Filter products"
            />

            {categories.length > 0 ? (
                <CatalogCategoryFilterPills
                    categories={categoryPills}
                    selectedCategoryId={selectedCategoryFilter}
                    onSelect={setSelectedCategoryFilter}
                />
            ) : null}

            {filteredOfferings.length > 0 ? (
                <div className="flex items-center justify-between px-1 pt-0 pb-0.5">
                    <span className="text-xs text-muted-foreground/70">
                        Showing {filteredOfferings.length} product{filteredOfferings.length === 1 ? "" : "s"}
                    </span>
                </div>
            ) : null}

            {offerings.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Package2 />
                                </EmptyMedia>
                                <EmptyTitle>No Catalog Products yet</EmptyTitle>
                                <EmptyDescription>
                                    Create Catalog Products in the Organization workspace. They will appear here for {store.name} automatically.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button
                                    variant="outline"
                                    className="rounded-full"
                                    render={<Link to={`/organizations/${organizationId}/products`} />}
                                >
                                    Organization catalog
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
                                    <Package2 />
                                </EmptyMedia>
                                <EmptyTitle>No products found</EmptyTitle>
                                <EmptyDescription>
                                    Try adjusting your search query, category, or status filters.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button variant="outline" className="rounded-full" onClick={resetFilters}>
                                    Clear all filters
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <div
                    key={selectedCategoryFilter}
                    className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 transition-all duration-300 ease-out animate-in fade-in-40 slide-in-from-bottom-2"
                >
                    {filteredOfferings.map((offering) => {
                        const categoryName = categoryMap.get(offering.product.categoryId)?.name ?? "Unknown";
                        const product = offering.product;
                        const availability = getStoreProductOfferingAvailability(offering);
                        const priceInherited = isStoreProductOfferingPriceInherited(offering);

                        return (
                            <Card
                                key={offering.id}
                                className={cn(
                                    "group relative flex flex-col justify-between rounded-2xl border p-3 sm:p-3.5 shadow-2xs transition-all duration-200 min-w-0 hover:shadow-md",
                                    availability === "sellable"
                                        ? "border-border/60 bg-card/70 hover:border-primary/30 hover:bg-card/95"
                                        : "border-border/60 bg-card/65 hover:border-border/70 hover:bg-card/80",
                                )}
                            >
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-muted/25 ring-1 ring-black/5 dark:ring-white/5 transition-transform duration-200 group-hover:scale-[1.02]">
                                        {product.imageSignedUrl ? (
                                            <img
                                                src={product.imageSignedUrl}
                                                alt={product.name}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <Package2 className="size-6 sm:size-7 text-muted-foreground/50" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-1">
                                        <Tooltip>
                                            <TooltipTrigger render={<div className="min-w-0" />}>
                                                <h4 className="font-display text-sm sm:text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-2 break-words">
                                                    {product.name}
                                                </h4>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs text-xs">
                                                {product.name}
                                            </TooltipContent>
                                        </Tooltip>

                                        <div className="flex min-w-0 flex-wrap items-center gap-1.5 pt-0.5">
                                            <span className="text-[11px] sm:text-xs font-medium capitalize text-muted-foreground">
                                                {categoryName}
                                            </span>
                                            <ProductTypeBadge productType={product.productType} />
                                            <StoreOfferingAvailabilityBadge offering={offering} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between gap-2 pt-2.5 mt-2.5 border-t border-border/40 min-w-0">
                                    <div className="flex flex-col items-start gap-0.5 min-w-0">
                                        <PriceDisplay
                                            price={offering.effectivePrice}
                                            discount={offering.effectiveDiscount}
                                            size="sm"
                                            align="left"
                                            singleTone="foreground"
                                            compact
                                        />
                                        <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/80">
                                            {catalogSellingQuantityLabel(product)}
                                            {priceInherited ? "" : " · Store price"}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <Tooltip>
                                            <TooltipTrigger render={<span className="inline-flex" />}>
                                                <UpsertStoreProductOfferingDialog
                                                    organizationId={organizationId}
                                                    storeId={store.id}
                                                    offering={offering}
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Edit ${product.name}`}
                                                            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-primary/40"
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                    }
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent>Edit product</TooltipContent>
                                        </Tooltip>
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

export default StoreProductOfferingsPage;
