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
import { PremiumTable, type ColumnDef } from "@repo/ui/components/premium-table";

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

    const columns = useMemo<ColumnDef<typeof categories[number]>[]>(() => [
        {
            id: "name",
            header: "Category name",
            accessor: (category) => (
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Tags className="size-3.5" />
                    </div>
                    <span className="font-medium text-foreground">{category.name}</span>
                </div>
            ),
            sortable: true,
            getSortValue: (category) => category.name,
        },
        {
            id: "status",
            header: "Status",
            accessor: (category) => <CategoryStatusBadge status={category.status} />,
            sortable: true,
            getSortValue: (category) => category.status,
            filterOptions: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
            ],
            getFilterValue: (category) => category.status,
        },
        {
            id: "products",
            header: "Products",
            accessor: (category) => {
                const categoryProducts = productsByCategoryId.get(category.id) ?? [];
                return (
                    <Badge variant="outline" className="rounded-full text-xs">
                        {categoryProducts.length} product{categoryProducts.length === 1 ? "" : "s"}
                    </Badge>
                );
            },
            sortable: true,
            getSortValue: (category) => (productsByCategoryId.get(category.id) ?? []).length,
        },
        {
            id: "createdAt",
            header: "Created",
            accessor: (category) => formatDateTime(category.createdAt),
            sortable: true,
            getSortValue: (category) => category.createdAt,
        },
    ], [productsByCategoryId]);

    const renderActions = (category: typeof categories[number]) => (
        <>
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
        </>
    );

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
                <PremiumTable
                    data={categories}
                    columns={columns}
                    actions={renderActions}
                    rowIdKey="id"
                    defaultPageSize={15}
                    searchPlaceholder="Search categories..."
                    searchKeys={[
                        (category) => category.name,
                    ]}
                    infoText={`${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}
                    toolbarActions={
                        <UpsertCategoryDialog
                            organizationId={organizationId}
                            trigger={
                                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-4">
                                    <PlusCircle className="mr-1.5 size-3.5" />
                                    Add category
                                </Button>
                            }
                        />
                    }
                />
            )}
        </div>
    );
};

export default CategoriesPage;
