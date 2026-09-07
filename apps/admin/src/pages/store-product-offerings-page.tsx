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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Eye, EyeOff, Package2, Pencil, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/ui/lib/utils";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import ProductTypeBadge from "@/components/catalog/product-type-badge";
import UpsertStoreProductOfferingDialog from "@/components/catalog/upsert-store-product-offering-dialog";
import StoreCatalogTabs from "@/components/catalog/store-catalog-tabs";
import { catalogKeys, organizationKeys } from "@/lib/query-keys";
import { getOrganizationWorkspacePath } from "@/lib/default-org-path";
import { resolveNamedStoreInOrganization } from "@/lib/store-scope";

const EMPTY_CATALOG_ITEMS: never[] = [];

const StoreProductOfferingsPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
    const [confirmStatusTarget, setConfirmStatusTarget] = useState<{
        offeringId: string;
        productName: string;
        nextStatus: "active" | "inactive";
    } | null>(null);

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
            setConfirmStatusTarget(null);
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
        <div className="space-y-6" data-admin-workspace="store">
            {/* Store Catalog Navigation Tabs */}
            <StoreCatalogTabs organizationId={organizationId} storeId={storeId} />

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
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <Button
                        ref={(el) => { categoryPillRefs.current["all"] = el; }}
                        variant={selectedCategoryFilter === "all" ? "default" : "outline"}
                        className={cn(
                            "rounded-full px-4 h-8.5 font-medium text-xs transition-all cursor-pointer shrink-0",
                            selectedCategoryFilter === "all"
                                ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20 border-primary"
                                : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border/80",
                        )}
                        onClick={() => setSelectedCategoryFilter("all")}
                    >
                        All
                    </Button>
                    {categories.map((category) => (
                        <Button
                            key={category.id}
                            ref={(el) => { categoryPillRefs.current[category.id] = el; }}
                            variant={selectedCategoryFilter === category.id ? "default" : "outline"}
                            className={cn(
                                "rounded-full px-4 h-8.5 font-medium text-xs transition-all cursor-pointer shrink-0",
                                selectedCategoryFilter === category.id
                                    ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20 border-primary"
                                    : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border/80",
                            )}
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
                    className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3 transition-all duration-300 ease-out animate-in fade-in-40 slide-in-from-bottom-2"
                >
                    {filteredOfferings.map((offering) => {
                        const categoryName = categoryMap.get(offering.product.categoryId)?.name ?? "Unknown";
                        const product = offering.product;

                        return (
                            <Card
                                key={offering.id}
                                className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card/70 p-3.5 sm:p-4 shadow-2xs transition-all duration-200 hover:border-primary/30 hover:bg-card/95 hover:shadow-md min-w-0"
                            >
                                {/* Top section: Thumbnail, Product Name & Badges */}
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
                                            <Package2 className="size-6 text-muted-foreground/50" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-sm sm:text-[15px] text-foreground line-clamp-2 break-words leading-snug">
                                            {product.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                                            <span className="font-medium text-muted-foreground/90">{categoryName}</span>
                                            {product.productType !== "single" && (
                                                <ProductTypeBadge productType={product.productType} />
                                            )}
                                            <ProductStatusBadge status={offering.status} />
                                            {product.productType === "single" && product.activeAddOnCount ? (
                                                <span className="text-[11px] text-muted-foreground/80">
                                                    • {product.activeAddOnCount} add-on{product.activeAddOnCount === 1 ? "" : "s"}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom section: Effective Price & Action Controls */}
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
                                        <span className="text-[10px] text-muted-foreground truncate max-w-[170px] sm:max-w-[200px]">
                                            {offering.isPriceInherited && offering.isDiscountInherited
                                                ? "Inherits Organization defaults"
                                                : offering.isPriceInherited
                                                    ? "Discount overridden"
                                                    : offering.isDiscountInherited
                                                        ? "Price overridden"
                                                        : "Price and discount overridden"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/70">
                                            {catalogSellingQuantityLabel(product)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <UpsertStoreProductOfferingDialog
                                            organizationId={organizationId}
                                            storeId={store.id}
                                            offering={offering}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Edit Store price for ${product.name}`}
                                                    className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer transition-colors"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                            }
                                        />
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
                                                setConfirmStatusTarget({
                                                    offeringId: offering.id,
                                                    productName: product.name,
                                                    nextStatus: offering.status === "active" ? "inactive" : "active",
                                                })
                                            }
                                        >
                                            {statusMutation.isPending && statusMutation.variables?.offeringId === offering.id ? (
                                                <Spinner className="size-3" />
                                            ) : offering.status === "active" ? (
                                                "Deactivate"
                                            ) : (
                                                "Activate"
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Status Change Confirmation Alert Dialog */}
            <AlertDialog
                open={Boolean(confirmStatusTarget)}
                onOpenChange={(open) => {
                    if (!open && !statusMutation.isPending) {
                        setConfirmStatusTarget(null);
                    }
                }}
            >
                <AlertDialogContent>
                    {confirmStatusTarget && (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogMedia
                                    className={
                                        confirmStatusTarget.nextStatus === "active"
                                            ? "bg-emerald-500/15 text-emerald-500"
                                            : "bg-muted/80 text-muted-foreground"
                                    }
                                >
                                    {confirmStatusTarget.nextStatus === "active" ? (
                                        <Eye className="size-5 text-emerald-500" />
                                    ) : (
                                        <EyeOff className="size-5 text-muted-foreground" />
                                    )}
                                </AlertDialogMedia>
                                <AlertDialogTitle>
                                    {confirmStatusTarget.nextStatus === "active"
                                        ? `Activate ${confirmStatusTarget.productName}?`
                                        : `Deactivate ${confirmStatusTarget.productName}?`}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {confirmStatusTarget.nextStatus === "active"
                                        ? `"${confirmStatusTarget.productName}" will be activated for ${store.name} and will be available for customers.`
                                        : `"${confirmStatusTarget.productName}" will be deactivated for ${store.name} and will no longer appear in this store's active menu.`}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={statusMutation.isPending} className="rounded-xl">
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    className={cn(
                                        "rounded-xl shadow-sm",
                                        confirmStatusTarget.nextStatus === "active"
                                            ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                                    )}
                                    isLoading={statusMutation.isPending}
                                    loadingText={
                                        confirmStatusTarget.nextStatus === "active"
                                            ? "Activating..."
                                            : "Deactivating..."
                                    }
                                    onClick={() =>
                                        statusMutation.mutate({
                                            offeringId: confirmStatusTarget.offeringId,
                                            status: confirmStatusTarget.nextStatus,
                                        })
                                    }
                                >
                                    {confirmStatusTarget.nextStatus === "active"
                                        ? "Activate product"
                                        : "Deactivate product"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default StoreProductOfferingsPage;
