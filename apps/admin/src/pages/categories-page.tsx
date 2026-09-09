import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getCategories, getProducts, reorderCategories } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { ListOrdered, Pencil, PlusCircle, RefreshCw, Search, Tags, X } from "lucide-react";

import DeleteCategoryButton from "@/components/catalog/delete-category-button";
import CategoryStatusBadge from "@/components/catalog/category-status-badge";
import UpsertCategoryDialog from "@/components/catalog/upsert-category-dialog";
import ReorderListDialog from "@/components/catalog/reorder-list-dialog";
import { formatDateTime } from "@/lib/format";
import { catalogKeys } from "@/lib/query-keys";

const CategoriesPage = () => {
    const { organizationId = "" } = useParams();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");

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

    const productsByCategoryId = useMemo(() => {
        const grouped = new Map<string, typeof products>();
        for (const product of products) {
            const existing = grouped.get(product.categoryId) ?? [];
            existing.push(product);
            grouped.set(product.categoryId, existing);
        }
        return grouped;
    }, [products]);

    const categoryOrderItems = useMemo(
        () => categories.map((category) => ({
            id: category.id,
            name: category.name,
            description: `${productsByCategoryId.get(category.id)?.length ?? 0} product${(productsByCategoryId.get(category.id)?.length ?? 0) === 1 ? "" : "s"}`,
            leading: <Tags className="size-4 shrink-0 text-primary" />,
        })),
        [categories, productsByCategoryId],
    );

    const saveCategoryOrder = async (categoryIds: string[]) => {
        const response = await reorderCategories(organizationId, { categoryIds });
        if (response.status === "success") {
            await queryClient.invalidateQueries({ queryKey: catalogKeys.categories(organizationId) });
            await queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
        }
        return response;
    };

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return categories;
        const query = searchQuery.toLowerCase().trim();
        return categories.filter((category) => category.name.toLowerCase().includes(query));
    }, [categories, searchQuery]);

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
                            <EmptyTitle>Unable to load categories</EmptyTitle>
                            <EmptyDescription>
                                {(categoriesQuery.error as { message?: string })?.message
                                    ?? (productsQuery.error as { message?: string })?.message
                                    ?? categoriesQuery.data?.message
                                    ?? productsQuery.data?.message
                                    ?? "Categories could not be loaded right now."}
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
        <div className="space-y-4">
            {categories.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Tags />
                                </EmptyMedia>
                                <EmptyTitle>No categories yet</EmptyTitle>
                                <EmptyDescription>
                                    Start by creating a category like "Beverages" or "Snacks" to organize your product catalog.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertCategoryDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative flex-1 min-w-[180px] max-w-sm group/search">
                            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                            <Input
                                type="text"
                                placeholder="Search categories..."
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
                            <ReorderListDialog
                                title="Reorder categories"
                                description="Choose the order categories appear in the catalog and POS."
                                items={categoryOrderItems}
                                onSave={saveCategoryOrder}
                                trigger={
                                    <Button variant="outline" className="rounded-full h-10 px-4 text-xs sm:text-sm font-medium">
                                        <ListOrdered className="size-3.5" />
                                        Reorder
                                    </Button>
                                }
                            />
                            <UpsertCategoryDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 sm:px-5 text-xs sm:text-sm font-medium shadow-xs shadow-primary/20">
                                        <PlusCircle className="size-3.5" />
                                        Add category
                                    </Button>
                                }
                            />
                        </div>
                    </div>

                    {filteredCategories.length > 0 && (
                        <div className="flex items-center px-1 py-0.5">
                            <span className="text-xs text-muted-foreground/70">
                                Showing {filteredCategories.length} categor{filteredCategories.length === 1 ? "y" : "ies"}
                            </span>
                        </div>
                    )}

                    {filteredCategories.length === 0 ? (
                        <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                            No categories match your search.
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredCategories.map((category) => {
                                const categoryProducts = productsByCategoryId.get(category.id) ?? [];
                                return (
                                    <Card
                                        key={category.id}
                                        className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                    >
                                        <div className="flex items-center justify-between gap-2.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                    <Tags className="size-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                        {category.name}
                                                    </h4>
                                                    <p className="text-[11px] text-muted-foreground/70">
                                                        Created {formatDateTime(category.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            <CategoryStatusBadge status={category.status} />
                                        </div>

                                        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                                            <Badge variant="outline" className="rounded-full text-[11px] px-2.5 py-0.5">
                                                {categoryProducts.length} product{categoryProducts.length === 1 ? "" : "s"}
                                            </Badge>

                                            <div className="flex items-center gap-1.5">
                                                <UpsertCategoryDialog
                                                    organizationId={organizationId}
                                                    category={category}
                                                    trigger={
                                                        <Button variant="outline" size="sm" className="rounded-full h-8 text-xs px-3">
                                                            <Pencil className="size-3" />
                                                            Edit
                                                        </Button>
                                                    }
                                                />
                                                <DeleteCategoryButton organizationId={organizationId} category={category} />
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;
