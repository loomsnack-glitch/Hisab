import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCategories, getProducts } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { Layers3, Package2, PlusCircle, RefreshCw, Tags } from "lucide-react";

import DeleteCategoryButton from "@/components/catalog/delete-category-button";
import DeleteProductButton from "@/components/catalog/delete-product-button";
import CategoryStatusBadge from "@/components/catalog/category-status-badge";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertCategoryDialog from "@/components/catalog/upsert-category-dialog";
import UpsertProductDialog from "@/components/catalog/upsert-product-dialog";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { catalogKeys } from "@/lib/query-keys";

type CatalogSectionProps = {
    organizationId: string;
};

const CatalogSection = ({ organizationId }: CatalogSectionProps) => {
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

    const activeCategoryCount = categories.filter((category) => category.status === "active").length;
    const activeProductCount = products.filter((product) => product.status === "active").length;

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
            {/* Consolidated stats — 2 instead of 4 */}
            <section className="grid gap-4 sm:grid-cols-2">
                <Card className="border-border/60 bg-card/80 shadow-lg shadow-black/5 transition-colors duration-200 hover:border-primary/20">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Tags className="size-4" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                    Categories
                                </p>
                                <p className="text-2xl font-semibold text-foreground">
                                    {categories.length}
                                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                                        ({activeCategoryCount} active)
                                    </span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/60 bg-card/80 shadow-lg shadow-black/5 transition-colors duration-200 hover:border-primary/20">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Package2 className="size-4" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                    Products
                                </p>
                                <p className="text-2xl font-semibold text-foreground">
                                    {products.length}
                                    <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                                        ({activeProductCount} active)
                                    </span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                {/* Categories */}
                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle className="font-display text-2xl">Categories</CardTitle>
                            <CardDescription>
                                Organize products into clean catalog groups before they appear across your selling flows.
                            </CardDescription>
                        </div>
                        <UpsertCategoryDialog
                            organizationId={organizationId}
                            trigger={
                                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                                    <PlusCircle className="mr-2 size-4" />
                                    Add category
                                </Button>
                            }
                        />
                    </CardHeader>
                    <CardContent>
                        {categories.length === 0 ? (
                            <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Tags />
                                    </EmptyMedia>
                                    <EmptyTitle>No categories yet</EmptyTitle>
                                    <EmptyDescription>
                                        Start with a category like beverages, groceries, or household to structure the
                                        product catalog.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <UpsertCategoryDialog organizationId={organizationId} />
                                </EmptyContent>
                            </Empty>
                        ) : (
                            <div className="space-y-3">
                                {categories.map((category) => {
                                    const categoryProducts = productsByCategoryId.get(category.id) ?? [];
                                    return (
                                        <div
                                            key={category.id}
                                            className="rounded-2xl border border-border/60 bg-background/70 p-4 transition-colors duration-200 hover:border-border"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                        <Tags className="size-3.5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-foreground">{category.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDateTime(category.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <CategoryStatusBadge status={category.status} />
                                                    <Badge variant="outline" className="rounded-full text-xs">
                                                        {categoryProducts.length} product{categoryProducts.length === 1 ? "" : "s"}
                                                    </Badge>
                                                    <UpsertCategoryDialog
                                                        organizationId={organizationId}
                                                        category={category}
                                                        trigger={
                                                            <Button variant="outline" size="sm" className="rounded-full">
                                                                Edit
                                                            </Button>
                                                        }
                                                    />
                                                    <DeleteCategoryButton organizationId={organizationId} category={category} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Products */}
                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle className="font-display text-2xl">Products</CardTitle>
                            <CardDescription>
                                Create products, attach optional images, and keep pricing and status current for the web app.
                            </CardDescription>
                        </div>
                        <UpsertProductDialog
                            organizationId={organizationId}
                            categories={categories}
                            trigger={
                                <Button
                                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                                    disabled={categories.length === 0}
                                >
                                    <PlusCircle className="mr-2 size-4" />
                                    Add product
                                </Button>
                            }
                        />
                    </CardHeader>
                    <CardContent>
                        {categories.length === 0 ? (
                            <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Layers3 />
                                    </EmptyMedia>
                                    <EmptyTitle>Categories come first</EmptyTitle>
                                    <EmptyDescription>
                                        Create at least one category before adding products so the catalog has clear structure.
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        ) : products.length === 0 ? (
                            <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Package2 />
                                    </EmptyMedia>
                                    <EmptyTitle>No products yet</EmptyTitle>
                                    <EmptyDescription>
                                        Add the first product with its category, pricing, and optional image to start building
                                        the sales catalog.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <UpsertProductDialog organizationId={organizationId} categories={categories} />
                                </EmptyContent>
                            </Empty>
                        ) : (
                            <Table tableContainerClassname="rounded-2xl border border-border/60 bg-background/70">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="px-4 py-3">Product</TableHead>
                                        <TableHead className="px-4 py-3">Category</TableHead>
                                        <TableHead className="px-4 py-3">Status</TableHead>
                                        <TableHead className="px-4 py-3">Price</TableHead>
                                        <TableHead className="px-4 py-3">Discount</TableHead>
                                        <TableHead className="px-4 py-3">Updated</TableHead>
                                        <TableHead className="px-4 py-3">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="px-4 py-3.5 align-top">
                                                <div className="flex items-start gap-3">
                                                    {product.imageSignedUrl ? (
                                                        <img
                                                            src={product.imageSignedUrl}
                                                            alt={product.name}
                                                            className="h-12 w-12 rounded-xl border border-border/70 object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/40 text-muted-foreground">
                                                            <Package2 className="size-4" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-foreground">{product.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Created {formatDateTime(product.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3.5 text-muted-foreground">
                                                {categoryMap.get(product.categoryId)?.name ?? "Unknown category"}
                                            </TableCell>
                                            <TableCell className="px-4 py-3.5">
                                                <ProductStatusBadge status={product.status} />
                                            </TableCell>
                                            <TableCell className="px-4 py-3.5 font-medium text-foreground">
                                                {formatCurrency(product.price)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3.5 text-muted-foreground">
                                                {formatCurrency(product.discount)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3.5 text-muted-foreground">
                                                {formatDateTime(product.updatedAt)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3.5">
                                                <div className="flex flex-wrap gap-2">
                                                    <UpsertProductDialog
                                                        organizationId={organizationId}
                                                        categories={categories}
                                                        product={product}
                                                        trigger={
                                                            <Button variant="outline" size="sm" className="rounded-full">
                                                                Edit
                                                            </Button>
                                                        }
                                                    />
                                                    <DeleteProductButton organizationId={organizationId} product={product} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};

export default CatalogSection;
