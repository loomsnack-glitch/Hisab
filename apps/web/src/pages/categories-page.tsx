import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getCategories, getProducts } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Pencil, PlusCircle, RefreshCw, Tags } from "lucide-react";

import DeleteCategoryButton from "@/components/catalog/delete-category-button";
import CategoryStatusBadge from "@/components/catalog/category-status-badge";
import UpsertCategoryDialog from "@/components/catalog/upsert-category-dialog";
import { formatDateTime } from "@/lib/format";
import { catalogKeys } from "@/lib/query-keys";

const CategoriesPage = () => {
    const { organizationId = "" } = useParams();

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
        <div className="space-y-5">
            {/* Header with Add Category button */}
            {categories.length > 0 && (
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
                        </p>
                    </div>
                    <UpsertCategoryDialog
                        organizationId={organizationId}
                        trigger={
                            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5">
                                <PlusCircle className="mr-2 size-4" />
                                Add category
                            </Button>
                        }
                    />
                </div>
            )}

            {/* Categories Content */}
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
                <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/30">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/50 bg-muted/20 text-left text-muted-foreground sticky top-0 backdrop-blur-md z-10">
                                <th className="px-4 py-3 font-medium">Category name</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Products</th>
                                <th className="px-4 py-3 font-medium">Created</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {categories.map((category, index) => {
                                const categoryProducts = productsByCategoryId.get(category.id) ?? [];
                                return (
                                    <tr
                                        key={category.id}
                                        className={`transition-colors duration-150 hover:bg-muted/30 ${index % 2 !== 0 ? "bg-muted/10" : ""}`}
                                    >
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <Tags className="size-3.5" />
                                                </div>
                                                <span className="font-medium text-foreground">{category.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <CategoryStatusBadge status={category.status} />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <Badge variant="outline" className="rounded-full text-xs">
                                                {categoryProducts.length} product{categoryProducts.length === 1 ? "" : "s"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3.5 text-muted-foreground">
                                            {formatDateTime(category.createdAt)}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center justify-end gap-2">
                                                <UpsertCategoryDialog
                                                    organizationId={organizationId}
                                                    category={category}
                                                    trigger={
                                                        <Button variant="outline" size="sm" className="rounded-full">
                                                            <Pencil className="mr-1.5 size-3" />
                                                            Edit
                                                        </Button>
                                                    }
                                                />
                                                <DeleteCategoryButton organizationId={organizationId} category={category} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;
