import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getCategories, getProducts } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { LayoutGrid, Pencil, PlusCircle, RefreshCw, Search, Table as TableIcon, Tags, X } from "lucide-react";

import DeleteCategoryButton from "@/components/catalog/delete-category-button";
import CategoryStatusBadge from "@/components/catalog/category-status-badge";
import UpsertCategoryDialog from "@/components/catalog/upsert-category-dialog";
import { formatDateTime } from "@/lib/format";
import { catalogKeys } from "@/lib/query-keys";
import { PremiumTable, type ColumnDef } from "@repo/ui/components/premium-table";

const CategoriesPage = () => {
    const { organizationId = "" } = useParams();
    const [mobileViewMode, setMobileViewMode] = useState<"card" | "table">("card");
    const [mobileSearchQuery, setMobileSearchQuery] = useState("");

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

    const filteredCategories = useMemo(() => {
        if (!mobileSearchQuery.trim()) return categories;
        const query = mobileSearchQuery.toLowerCase().trim();
        return categories.filter((category) => category.name.toLowerCase().includes(query));
    }, [categories, mobileSearchQuery]);

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
                <>
                    {/* Desktop View: Pure Table (Unchanged) */}
                    <div className="hidden sm:block">
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
                    </div>

                    {/* Mobile View: Defaults to Card View with View Mode Toggle */}
                    <div className="block sm:hidden space-y-3">
                        {/* Mobile Search & Controls Header */}
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 group/search">
                                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                                    <Input
                                        type="text"
                                        placeholder="Search categories..."
                                        value={mobileSearchQuery}
                                        onChange={(e) => setMobileSearchQuery(e.target.value)}
                                        className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all duration-200 text-sm w-full shadow-2xs"
                                    />
                                    {mobileSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setMobileSearchQuery("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                                            aria-label="Clear search"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* View Mode Toggle Buttons (Mobile Only) */}
                                <div className="flex items-center p-1 rounded-full border border-border/60 bg-card/80 shrink-0">
                                    <Button
                                        variant={mobileViewMode === "card" ? "default" : "ghost"}
                                        size="icon"
                                        className={cn(
                                            "h-7 w-7 rounded-full transition-all",
                                            mobileViewMode === "card" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
                                        )}
                                        onClick={() => setMobileViewMode("card")}
                                        aria-label="Card view"
                                    >
                                        <LayoutGrid className="size-3.5" />
                                    </Button>
                                    <Button
                                        variant={mobileViewMode === "table" ? "default" : "ghost"}
                                        size="icon"
                                        className={cn(
                                            "h-7 w-7 rounded-full transition-all",
                                            mobileViewMode === "table" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
                                        )}
                                        onClick={() => setMobileViewMode("table")}
                                        aria-label="Table view"
                                    >
                                        <TableIcon className="size-3.5" />
                                    </Button>
                                </div>

                                <UpsertCategoryDialog
                                    organizationId={organizationId}
                                    trigger={
                                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-3 shrink-0">
                                            <PlusCircle className="mr-1 size-3.5" />
                                            Add
                                        </Button>
                                    }
                                />
                            </div>
                        </div>

                        {/* Mobile Content Display */}
                        {mobileViewMode === "card" ? (
                            filteredCategories.length === 0 ? (
                                <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                                    No categories match your search.
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5">
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
                                                                    <Pencil className="mr-1 size-3" />
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
                            )
                        ) : (
                            <PremiumTable
                                data={categories}
                                columns={columns}
                                actions={renderActions}
                                rowIdKey="id"
                                defaultPageSize={10}
                                searchPlaceholder="Search categories..."
                                searchKeys={[
                                    (category) => category.name,
                                ]}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CategoriesPage;
