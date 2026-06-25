import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCategories, getProducts } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Input } from "@repo/ui/components/input";
import { Layers3, Package2, Pencil, PlusCircle, RefreshCw, Trash2, Search } from "lucide-react";

import DeleteCategoryButton from "@/components/catalog/delete-category-button";
import DeleteProductButton from "@/components/catalog/delete-product-button";
import CategoryStatusBadge from "@/components/catalog/category-status-badge";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertCategoryDialog from "@/components/catalog/upsert-category-dialog";
import UpsertProductDialog from "@/components/catalog/upsert-product-dialog";
import ManageCategoriesDialog from "@/components/catalog/manage-categories-dialog";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { catalogKeys } from "@/lib/query-keys";

type CatalogSectionProps = {
    organizationId: string;
};

const CatalogSection = ({ organizationId }: CatalogSectionProps) => {
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

    const categories = categoriesQuery.data?.status === "success" ? categoriesQuery.data.data?.categories ?? [] : [];
    const products = productsQuery.data?.status === "success" ? productsQuery.data.data?.products ?? [] : [];

    const categoryMap = useMemo(
        () => new Map(categories.map((category) => [category.id, category])),
        [categories],
    );

    const productsByCategoryId = useMemo(() => {
        const grouped = new Map<string, typeof products>();
        for (const product of products) {
            const existing = grouped.get(product.categoryId) ?? [];
            existing.push(product);
            grouped.set(product.categoryId, existing);
        }
        return grouped;
    }, [products]);

    // Product search and pill filter logic
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
        <div className="space-y-6">


            {/* ── Part B: Products Grid & Search ──────────────────────── */}
            <div className="space-y-5">
                {/* Search & Actions bar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 rounded-full border-border/60 bg-card/60 focus-visible:ring-primary w-full"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <ManageCategoriesDialog
                            organizationId={organizationId}
                            categories={categories}
                            productsByCategoryId={productsByCategoryId}
                            trigger={
                                <Button
                                    variant="outline"
                                    className="rounded-full border-border/60 text-muted-foreground hover:text-foreground h-11 px-4 cursor-pointer"
                                >
                                    <Layers3 className="mr-2 size-4" />
                                    Manage categories
                                </Button>
                            }
                        />

                        <UpsertProductDialog
                            organizationId={organizationId}
                            categories={categories}
                            trigger={
                                <Button
                                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5"
                                    disabled={categories.length === 0}
                                >
                                    <PlusCircle className="mr-2 size-4" />
                                    Add product
                                </Button>
                            }
                        />
                    </div>
                </div>

                {/* Category filter pills */}
                {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-1">
                        <Button
                            variant={selectedCategoryFilter === "all" ? "default" : "outline"}
                            className="rounded-full px-5 h-9 font-medium text-xs transition-all cursor-pointer"
                            onClick={() => setSelectedCategoryFilter("all")}
                        >
                            All
                        </Button>
                        {categories.map((category) => (
                            <Button
                                key={category.id}
                                variant={selectedCategoryFilter === category.id ? "default" : "outline"}
                                className="rounded-full px-5 h-9 font-medium text-xs transition-all cursor-pointer"
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
                                        Products need a category. Manage categories to create one first.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <ManageCategoriesDialog
                                        organizationId={organizationId}
                                        categories={categories}
                                        productsByCategoryId={productsByCategoryId}
                                        trigger={
                                            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5">
                                                <Layers3 className="mr-2 size-4" />
                                                Manage categories
                                            </Button>
                                        }
                                    />
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
                                        <UpsertProductDialog organizationId={organizationId} categories={categories} />
                                    </EmptyContent>
                                )}
                            </Empty>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredProducts.map((product) => (
                            <Card
                                key={product.id}
                                className="group relative overflow-hidden rounded-[24px] border border-border/65 bg-card/80 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 hover:bg-card flex flex-col items-center text-center"
                            >
                                {/* Inactive status badge indicator */}
                                {product.status === "inactive" && (
                                    <div className="absolute top-3.5 right-3.5">
                                        <ProductStatusBadge status={product.status} />
                                    </div>
                                )}

                                {/* Product Image or Predefined Icon container */}
                                <div className="relative mb-5 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-muted/40 transition-transform duration-300 group-hover:scale-105 shadow-inner">
                                    {product.imagePath?.startsWith("icon:") ? (
                                        <span className="text-5xl select-none select-none-emoji">{product.imagePath.replace("icon:", "")}</span>
                                    ) : product.imageSignedUrl ? (
                                        <img
                                            src={product.imageSignedUrl}
                                            alt={product.name}
                                            className="h-full w-full rounded-full object-cover border border-border/40"
                                        />
                                    ) : (
                                        <Package2 className="size-10 text-muted-foreground/60" />
                                    )}
                                </div>

                                {/* Product Name */}
                                <h4 className="font-display font-semibold text-foreground text-base tracking-tight mb-0.5 w-full truncate px-1">
                                    {product.name}
                                </h4>

                                {/* Category Name */}
                                <span className="text-xs font-medium text-muted-foreground/80 mb-3 block">
                                    {categoryMap.get(product.categoryId)?.name ?? "Unknown"}
                                </span>

                                {/* Price and Discount */}
                                <div className="mt-auto">
                                    <p className="text-lg font-bold text-foreground">{formatCurrency(product.price)}</p>
                                    {Number(product.discount) > 0 && (
                                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            -{formatCurrency(product.discount)} off
                                        </p>
                                    )}
                                </div>

                                {/* Hover action overlay (edit & delete buttons) */}
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-background/95 backdrop-blur-sm border border-border/80 shadow-lg px-3 py-1.5 rounded-full opacity-0 translate-y-2 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100">
                                    <UpsertProductDialog
                                        organizationId={organizationId}
                                        categories={categories}
                                        product={product}
                                        trigger={
                                            <Button variant="outline" size="sm" className="h-7 px-3 text-xs rounded-full border-border/60 hover:bg-muted/50 cursor-pointer">
                                                <Pencil className="mr-1.5 size-3" />
                                                Edit
                                            </Button>
                                        }
                                    />
                                    <DeleteProductButton
                                        organizationId={organizationId}
                                        product={product}
                                        trigger={
                                            <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center p-0 cursor-pointer">
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        }
                                    />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CatalogSection;
