import { useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import {
    getOrganizationDetails,
    getProducts,
    getStore,
    getStoreCategoryPresentations,
    reorderStoreCategoryPresentations,
} from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { ListOrdered, Pencil, RefreshCw, Tags } from "lucide-react";

import CategoryStatusBadge from "@/components/catalog/category-status-badge";
import CatalogStatusFilterBar from "@/components/catalog/catalog-status-filter-bar";
import ReorderListDialog from "@/components/catalog/reorder-list-dialog";
import StoreCatalogTabs from "@/components/catalog/store-catalog-tabs";
import UpsertStoreCategoryPresentationDialog from "@/components/catalog/upsert-store-category-presentation-dialog";
import {
    catalogFilterUrlOptions,
    storeCatalogListFilterParsers,
    toggleCatalogStatusFilter,
} from "@/lib/catalog-query-states";
import { catalogKeys, organizationKeys } from "@/lib/query-keys";
import { useDebouncedUrlSearch } from "@/lib/use-debounced-url-search";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";

const EMPTY_CATALOG_ITEMS: never[] = [];

const StoreCategoryPresentationsPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const queryClient = useQueryClient();
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
    const presentationsQuery = useQuery({
        queryKey: catalogKeys.storeCategoryPresentations(organizationId, storeId),
        queryFn: () => getStoreCategoryPresentations(organizationId, storeId),
        enabled: Boolean(organizationId && storeId),
    });
    const productsQuery = useQuery({
        queryKey: catalogKeys.products(organizationId),
        queryFn: () => getProducts(organizationId),
        enabled: Boolean(organizationId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;
    const storeFromApi = storeQuery.data?.status === "success" ? storeQuery.data.data?.store ?? null : null;
    const namedStore = resolveNamedStoreInOrganization(storeId, organization?.stores ?? []);
    const store = storeFromApi && namedStore && storeFromApi.id === namedStore.id ? storeFromApi : null;
    const presentations =
        presentationsQuery.data?.status === "success"
            ? presentationsQuery.data.data?.presentations ?? []
            : [];
    const products =
        productsQuery.data?.status === "success"
            ? productsQuery.data.data?.products ?? EMPTY_CATALOG_ITEMS
            : EMPTY_CATALOG_ITEMS;

    const productsByCategoryId = useMemo(() => {
        const grouped = new Map<string, typeof products>();
        for (const product of products) {
            const existing = grouped.get(product.categoryId) ?? [];
            existing.push(product);
            grouped.set(product.categoryId, existing);
        }
        return grouped;
    }, [products]);

    const reorderItems = useMemo(
        () =>
            presentations.map((presentation) => {
                const productCount = productsByCategoryId.get(presentation.categoryId)?.length ?? 0;
                return {
                    id: presentation.categoryId,
                    name: presentation.category.name,
                    description: `${productCount} product${productCount === 1 ? "" : "s"}`,
                    leading: <Tags className="size-4 shrink-0 text-primary" />,
                };
            }),
        [presentations, productsByCategoryId],
    );

    const filteredPresentations = useMemo(() => {
        return presentations.filter((presentation) => {
            const storeStatus = presentation.visible ? "active" : "inactive";
            if (statusFilters.length > 0 && !statusFilters.includes(storeStatus)) {
                return false;
            }
            if (orgStatusFilters.length > 0 && !orgStatusFilters.includes(presentation.category.status)) {
                return false;
            }
            if (!searchQuery.trim()) {
                return true;
            }
            return presentation.category.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        });
    }, [presentations, searchQuery, statusFilters, orgStatusFilters]);

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

    const saveCategoryOrder = async (categoryIds: string[]) => {
        const response = await reorderStoreCategoryPresentations(organizationId, storeId, { categoryIds });
        if (response.status === "success") {
            await queryClient.invalidateQueries({
                queryKey: catalogKeys.storeCategoryPresentations(organizationId, storeId),
            });
        }
        return response;
    };

    if (
        organizationQuery.isPending ||
        storeQuery.isPending ||
        presentationsQuery.isPending ||
        productsQuery.isPending
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

    if (presentationsQuery.isError || presentationsQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-md">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load categories</EmptyTitle>
                            <EmptyDescription>
                                {(presentationsQuery.error as { message?: string })?.message ??
                                    presentationsQuery.data?.message ??
                                    "Store categories could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button variant="outline" className="rounded-full" onClick={() => presentationsQuery.refetch()}>
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3" data-admin-workspace="store" data-testid="store-categories-page">
            {/* Store Catalog Navigation Tabs */}
            <StoreCatalogTabs organizationId={organizationId} storeId={storeId} />

            {presentations.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Tags />
                                </EmptyMedia>
                                <EmptyTitle>No Categories yet</EmptyTitle>
                                <EmptyDescription>
                                    Create Categories in the Organization workspace. They will appear here for {store.name} automatically.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button
                                    variant="outline"
                                    className="rounded-full"
                                    render={<Link to={`/organizations/${organizationId}/products/categories`} />}
                                >
                                    Organization categories
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <CatalogStatusFilterBar
                        searchPlaceholder="Search categories..."
                        searchInput={searchInput}
                        onSearchInputChange={setSearchInput}
                        onClearSearch={clearSearch}
                        statusFilters={statusFilters}
                        onToggleStatus={toggleStatusFilter}
                        onSetStatuses={(statuses) => void setFilters({ statuses })}
                        orgStatusFilters={orgStatusFilters}
                        onToggleOrgStatus={toggleOrgStatusFilter}
                        onSetOrgStatuses={(orgStatuses) => void setFilters({ orgStatuses })}
                        filterAriaLabel="Filter categories"
                        mobileSheetTitle="Filter categories"
                    >
                        {presentations.length > 1 ? (
                            <ReorderListDialog
                                title="Rearrange categories"
                                items={reorderItems}
                                onSave={saveCategoryOrder}
                                trigger={
                                    <Button
                                        variant="outline"
                                        className="h-10 w-full rounded-full px-4 text-xs font-medium sm:w-auto"
                                    >
                                        <ListOrdered className="size-3.5" />
                                        Rearrange
                                    </Button>
                                }
                            />
                        ) : null}
                    </CatalogStatusFilterBar>

                    {filteredPresentations.length > 0 ? (
                        <div className="flex items-center px-1 py-0.5">
                            <span className="text-xs text-muted-foreground/70">
                                Showing {filteredPresentations.length} categor{filteredPresentations.length === 1 ? "y" : "ies"}
                            </span>
                        </div>
                    ) : null}

                    {filteredPresentations.length === 0 ? (
                        <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                            <p>No categories match your search or filters.</p>
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
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredPresentations.map((presentation) => {
                                const categoryProducts = productsByCategoryId.get(presentation.categoryId) ?? [];
                                const storeStatus = presentation.visible ? "active" : "inactive";

                                return (
                                    <Card
                                        key={presentation.id}
                                        className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                    >
                                        <div className="flex items-center justify-between gap-2.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                    <Tags className="size-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                        {presentation.category.name}
                                                    </h4>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                                                {presentation.category.status !== "active" ? (
                                                    <Badge
                                                        variant="outline"
                                                        className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                                                    >
                                                        Inactive in org
                                                    </Badge>
                                                ) : null}
                                                <CategoryStatusBadge status={storeStatus} />
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                                            <Badge variant="outline" className="rounded-full text-[11px] px-2.5 py-0.5">
                                                {categoryProducts.length} product{categoryProducts.length === 1 ? "" : "s"}
                                            </Badge>

                                            <div className="flex items-center gap-0.5">
                                                <Tooltip>
                                                    <TooltipTrigger render={<span className="inline-flex" />}>
                                                        <UpsertStoreCategoryPresentationDialog
                                                            organizationId={organizationId}
                                                            storeId={storeId}
                                                            presentation={presentation}
                                                            trigger={
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    aria-label={`Edit ${presentation.category.name}`}
                                                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation focus-visible:ring-2 focus-visible:ring-primary/40"
                                                                >
                                                                    <Pencil className="size-3.5" />
                                                                </Button>
                                                            }
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit category</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default StoreCategoryPresentationsPage;
