import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { getCategories, getOrganizationCatalogSettings, getProducts } from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Input } from "@repo/ui/components/input";
import { Barcode, Boxes, Layers3, Link2, Package2, Pencil, PlusCircle, RefreshCw, Search, Trash2, X } from "lucide-react";

import DeleteProductButton from "@/components/catalog/delete-product-button";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import ProductTypeBadge from "@/components/catalog/product-type-badge";
import UpsertComboProductDialog from "@/components/catalog/upsert-combo-product-dialog";
import UpsertProductDialog from "@/components/catalog/upsert-product-dialog";
import ManageProductAddOnsDialog from "@/components/catalog/manage-product-add-ons-dialog";
import InternalProductLabelDialog from "@/components/catalog/internal-product-label-dialog";
import ProductPriceDisplay from "@/components/catalog/product-price-display";
import { catalogKeys, organizationKeys } from "@/lib/query-keys";
import { canOfferProductLabelPrint } from "@/lib/internal-label-printing";

const EMPTY_CATALOG_ITEMS: never[] = [];

const ProductsListPage = () => {
    const { organizationId = "" } = useParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

    const categoriesQuery = useQuery({
        queryKey: catalogKeys.categories(organizationId),
        queryFn: () => getCategories(organizationId),
        enabled: Boolean(organizationId),
    });

    const productsQuery = useQuery({
        queryKey: catalogKeys.products(organizationId),
        queryFn: () => getProducts(organizationId),
        enabled: Boolean(organizationId),
    });

    const catalogSettingsQuery = useQuery({
        queryKey: organizationKeys.catalogSettings(organizationId),
        queryFn: () => getOrganizationCatalogSettings(organizationId),
        enabled: Boolean(organizationId),
    });

    const categories = categoriesQuery.data?.status === "success" ? categoriesQuery.data.data?.categories ?? EMPTY_CATALOG_ITEMS : EMPTY_CATALOG_ITEMS;
    const products = productsQuery.data?.status === "success" ? productsQuery.data.data?.products ?? EMPTY_CATALOG_ITEMS : EMPTY_CATALOG_ITEMS;
    const barcodeScanningEnabled =
        catalogSettingsQuery.data?.status === "success"
        && catalogSettingsQuery.data.data?.settings.barcodeScanningEnabled === true;

    const categoryMap = useMemo(
        () => new Map(categories.map((category) => [category.id, category])),
        [categories],
    );

    const defaultCategoryIdForNewProduct =
        selectedCategoryFilter !== "all" ? selectedCategoryFilter : undefined;

    const categoryPillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Auto-scroll the active category pill into center view whenever selectedCategoryFilter changes
    useEffect(() => {
        const el = categoryPillRefs.current[selectedCategoryFilter];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
    }, [selectedCategoryFilter]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            if (selectedCategoryFilter !== "all" && product.categoryId !== selectedCategoryFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const productName = product.name.toLowerCase();
                const categoryName = categoryMap.get(product.categoryId)?.name.toLowerCase() ?? "";
                return productName.includes(query) || categoryName.includes(query);
            }
            return true;
        });
    }, [products, selectedCategoryFilter, searchQuery, categoryMap]);

    if (categoriesQuery.isPending || productsQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (
        categoriesQuery.isError
        || productsQuery.isError
        || categoriesQuery.data?.status === "error"
        || productsQuery.data?.status === "error"
    ) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load catalog</EmptyTitle>
                            <EmptyDescription>
                                {(categoriesQuery.error as { message?: string })?.message
                                    ?? (productsQuery.error as { message?: string })?.message
                                    ?? categoriesQuery.data?.message
                                    ?? productsQuery.data?.message
                                    ?? "The category and product workspace could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => {
                                    categoriesQuery.refetch();
                                    productsQuery.refetch();
                                }}
                            >
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-5">
            {/* Search & Actions bar */}
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

                <div className="flex flex-wrap items-center gap-2">
                    <UpsertProductDialog
                        organizationId={organizationId}
                        categories={categories}
                        defaultCategoryId={defaultCategoryIdForNewProduct}
                        trigger={
                            <Button
                                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm"
                                disabled={categories.length === 0}
                            >
                                <PlusCircle className="size-3.5 sm:size-4" />
                                Add product
                            </Button>
                        }
                    />

                    <UpsertComboProductDialog
                        organizationId={organizationId}
                        categories={categories}
                        products={products}
                        defaultCategoryId={defaultCategoryIdForNewProduct}
                        trigger={
                            <Button
                                variant="outline"
                                className="rounded-full border-border/60 h-9 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm"
                                disabled={categories.length === 0}
                            >
                                <Boxes className="size-3.5 sm:size-4" />
                                Add Combo
                            </Button>
                        }
                    />
                </div>
            </div>

            {/* Category filter pills - Horizontally scrollable on mobile */}
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

            {/* Product Grid */}
            {categories.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Layers3 />
                                </EmptyMedia>
                                <EmptyTitle>Create a category first</EmptyTitle>
                                <EmptyDescription>
                                    Products need a category. Head to the Categories tab to create one first.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button
                                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5"
                                    onClick={() => navigate("../categories")}
                                >
                                    <Layers3 className="size-4" />
                                    Go to categories
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : filteredProducts.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Package2 />
                                </EmptyMedia>
                                <EmptyTitle>No products found</EmptyTitle>
                                <EmptyDescription>
                                    {searchQuery || selectedCategoryFilter !== "all"
                                        ? "Try adjusting your search query or category filter."
                                        : "Add your first product to start building the catalog."}
                                </EmptyDescription>
                            </EmptyHeader>
                            {!(searchQuery || selectedCategoryFilter !== "all") && (
                                <EmptyContent>
                                    <UpsertProductDialog
                                        organizationId={organizationId}
                                        categories={categories}
                                        defaultCategoryId={defaultCategoryIdForNewProduct}
                                    />
                                </EmptyContent>
                            )}
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <div
                    key={selectedCategoryFilter}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,22rem),1fr))] transition-all duration-300 ease-out animate-in fade-in-40 slide-in-from-bottom-2"
                >
                    {filteredProducts.map((product) => {
                        const categoryName = categoryMap.get(product.categoryId)?.name ?? "Unknown";

                        return (
                            <Card
                                key={product.id}
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
                                            <h4 className="font-display text-sm sm:text-[15px] font-semibold leading-snug tracking-tight text-foreground truncate" title={product.name}>
                                                {product.name}
                                            </h4>
                                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                <span className="text-[11px] sm:text-xs font-medium capitalize text-muted-foreground">
                                                    {categoryName}
                                                </span>
                                                <ProductTypeBadge productType={product.productType} />
                                                {product.status === "inactive" && (
                                                    <ProductStatusBadge status={product.status} />
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
                                            <ProductPriceDisplay
                                                price={product.price}
                                                discount={product.discount}
                                                size="sm"
                                                align="left"
                                                singleTone="foreground"
                                            />

                                            <div className="flex items-center gap-0.5 border-l border-border/50 pl-2">
                                                {product.productType === "single" ? (
                                                    <ManageProductAddOnsDialog
                                                        organizationId={organizationId}
                                                        product={product}
                                                        trigger={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={`Manage add-ons for ${product.name}`}
                                                                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation"
                                                            >
                                                                <Link2 className="size-3.5" />
                                                            </Button>
                                                        }
                                                    />
                                                ) : null}
                                                {canOfferProductLabelPrint({
                                                    barcodeScanningEnabled,
                                                    productCode: product.productCode,
                                                }) ? (
                                                    <InternalProductLabelDialog
                                                        organizationId={organizationId}
                                                        product={product}
                                                        trigger={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={`Preview and print labels for ${product.name}`}
                                                                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation"
                                                            >
                                                                <Barcode className="size-3.5" />
                                                            </Button>
                                                        }
                                                    />
                                                ) : null}
                                                {product.productType === "combo" ? (
                                                    <UpsertComboProductDialog
                                                        organizationId={organizationId}
                                                        categories={categories}
                                                        products={products}
                                                        product={product}
                                                        trigger={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={`Edit ${product.name}`}
                                                                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation"
                                                            >
                                                                <Pencil className="size-3.5" />
                                                            </Button>
                                                        }
                                                    />
                                                ) : product.productType === "single" ? (
                                                    <UpsertProductDialog
                                                        organizationId={organizationId}
                                                        categories={categories}
                                                        product={product}
                                                        trigger={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={`Edit ${product.name}`}
                                                                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer touch-manipulation"
                                                            >
                                                                <Pencil className="size-3.5" />
                                                            </Button>
                                                        }
                                                    />
                                                ) : null}
                                                <DeleteProductButton
                                                    organizationId={organizationId}
                                                    product={product}
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Delete ${product.name}`}
                                                            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer touch-manipulation"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    }
                                                />
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

export default ProductsListPage;
