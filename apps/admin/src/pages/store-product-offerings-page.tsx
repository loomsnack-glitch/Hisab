import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getCategories,
    getOrganizationDetails,
    getStore,
    getStoreProductOfferings,
    updateStoreProductOffering,
} from "@repo/services";
import { catalogSellingQuantityLabel } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Package2, Pencil, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import ProductTypeBadge from "@/components/catalog/product-type-badge";
import UpsertStoreProductOfferingDialog from "@/components/catalog/upsert-store-product-offering-dialog";
import { catalogKeys, organizationKeys } from "@/lib/query-keys";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";

const EMPTY_CATALOG_ITEMS: never[] = [];

const StoreProductOfferingsPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
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
    const offeringsQuery = useQuery({
        queryKey: catalogKeys.storeProductOfferings(organizationId, storeId),
        queryFn: () => getStoreProductOfferings(organizationId, storeId),
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
    const offerings =
        offeringsQuery.data?.status === "success" ? offeringsQuery.data.data?.offerings ?? [] : [];

    const categoryMap = useMemo(
        () => new Map(categories.map((category) => [category.id, category])),
        [categories],
    );
    const categoryPillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    useEffect(() => {
        const el = categoryPillRefs.current[selectedCategoryFilter];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }, [selectedCategoryFilter]);

    const filteredOfferings = useMemo(() => {
        return offerings.filter((offering) => {
            if (selectedCategoryFilter !== "all" && offering.product.categoryId !== selectedCategoryFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const productName = offering.product.name.toLowerCase();
                const categoryName = categoryMap.get(offering.product.categoryId)?.name.toLowerCase() ?? "";
                return productName.includes(query) || categoryName.includes(query);
            }
            return true;
        });
    }, [offerings, selectedCategoryFilter, searchQuery, categoryMap]);

    const statusMutation = useMutation({
        mutationFn: ({
            offeringId,
            status,
        }: {
            offeringId: string;
            status: "active" | "inactive";
        }) => updateStoreProductOffering(organizationId, storeId, offeringId, { status }),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success(response.message);
            queryClient.invalidateQueries({
                queryKey: catalogKeys.storeProductOfferings(organizationId, storeId),
            });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to update this product");
        },
    });

    if (organizationQuery.isPending || storeQuery.isPending || categoriesQuery.isPending || offeringsQuery.isPending) {
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
        <div className="space-y-5" data-admin-workspace="store">
            <div>
                <p className="text-sm font-medium text-primary">Store workspace</p>
                <h1 className="font-display text-3xl font-semibold tracking-tight">Products</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Every Organization Catalog Product is listed here. {store.name} controls effective price, discount, and local menu status. Values can inherit Organization defaults or use explicit Store overrides.
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md w-full group/search">
                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                    <Input
                        type="text"
                        placeholder="Search products..."
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
            </div>

            {categories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1 sm:flex-wrap sm:overflow-visible">
                    <Button
                        ref={(el) => { categoryPillRefs.current["all"] = el; }}
                        variant={selectedCategoryFilter === "all" ? "default" : "outline"}
                        className="rounded-full px-4 sm:px-5 h-8 sm:h-9 font-medium text-xs transition-all cursor-pointer shrink-0"
                        onClick={() => setSelectedCategoryFilter("all")}
                    >
                        All
                    </Button>
                    {categories.map((category) => (
                        <Button
                            key={category.id}
                            ref={(el) => { categoryPillRefs.current[category.id] = el; }}
                            variant={selectedCategoryFilter === category.id ? "default" : "outline"}
                            className="rounded-full px-4 sm:px-5 h-8 sm:h-9 font-medium text-xs transition-all cursor-pointer shrink-0"
                            onClick={() => setSelectedCategoryFilter(category.id)}
                        >
                            {category.name}
                        </Button>
                    ))}
                </div>
            )}

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
                                    Try adjusting your search query or category filter.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <div
                    key={selectedCategoryFilter}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] transition-all duration-300 ease-out animate-in fade-in-40 slide-in-from-bottom-2"
                >
                    {filteredOfferings.map((offering) => {
                        const categoryName = categoryMap.get(offering.product.categoryId)?.name ?? "Unknown";
                        const product = offering.product;

                        return (
                            <Card
                                key={offering.id}
                                className="group rounded-2xl border border-border/60 bg-card/70 p-3 sm:p-3.5 shadow-sm transition-all duration-200 hover:border-primary/25 hover:bg-card hover:shadow-md min-w-0"
                            >
                                <div className="flex items-start sm:items-center gap-3">
                                    <div className="relative flex h-14 w-14 sm:h-[4.25rem] sm:w-[4.25rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-muted/25 ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-[1.02] dark:ring-white/5">
                                        {product.imageSignedUrl ? (
                                            <img
                                                src={product.imageSignedUrl}
                                                alt={product.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Package2 className="size-6 sm:size-8 text-muted-foreground/55" />
                                        )}
                                    </div>

                                    <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="min-w-0 space-y-1">
                                            <h4 className="min-w-0 whitespace-normal break-words font-display text-sm sm:text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                                                {product.name}
                                            </h4>
                                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                <span className="text-[11px] sm:text-xs font-medium capitalize text-muted-foreground">
                                                    {categoryName}
                                                </span>
                                                <ProductTypeBadge productType={product.productType} />
                                                {offering.status === "inactive" && (
                                                    <ProductStatusBadge status={offering.status} />
                                                )}
                                                {product.productType === "single" && product.activeAddOnCount ? (
                                                    <>
                                                        <span aria-hidden="true" className="text-muted-foreground/60">·</span>
                                                        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">
                                                            {product.activeAddOnCount} add-ons
                                                        </span>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-border/30">
                                            <div className="flex flex-col items-start">
                                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    Effective price
                                                </span>
                                                <ProductPriceDisplay
                                                    price={offering.effectivePrice}
                                                    discount={offering.effectiveDiscount}
                                                    size="sm"
                                                    align="left"
                                                    singleTone="foreground"
                                                />
                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                    {offering.isPriceInherited && offering.isDiscountInherited
                                                        ? "Inherits Organization defaults"
                                                        : offering.isPriceInherited
                                                            ? "Discount overridden"
                                                            : offering.isDiscountInherited
                                                                ? "Price overridden"
                                                                : "Price and discount overridden"}
                                                </span>
                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                    {catalogSellingQuantityLabel(product)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-0.5 border-l border-border/50 pl-2">
                                                <UpsertStoreProductOfferingDialog
                                                    organizationId={organizationId}
                                                    storeId={store.id}
                                                    offering={offering}
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Edit Store price for ${product.name}`}
                                                            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation"
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                    }
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-full"
                                                    disabled={statusMutation.isPending}
                                                    onClick={() =>
                                                        statusMutation.mutate({
                                                            offeringId: offering.id,
                                                            status: offering.status === "active" ? "inactive" : "active",
                                                        })
                                                    }
                                                >
                                                    {offering.status === "active" ? "Deactivate" : "Activate"}
                                                </Button>
                                            </div>
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

export default StoreProductOfferingsPage;
