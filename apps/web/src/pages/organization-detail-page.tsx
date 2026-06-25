import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCategories, getOrganizationDetails, getProducts } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/components/tabs";
import { ArrowLeft, MonitorSmartphone, Package2, PlusCircle, Store } from "lucide-react";

import CatalogSection from "@/components/catalog/catalog-section";
import UpsertCategoryDialog from "@/components/catalog/upsert-category-dialog";
import UpsertProductDialog from "@/components/catalog/upsert-product-dialog";
import CreateStoreDialog from "@/components/organizations/create-store-dialog";
import StoresSection from "@/components/organizations/stores-section";
import { formatDateTime } from "@/lib/format";
import { catalogKeys, organizationKeys } from "@/lib/query-keys";

const OrganizationDetailPage = () => {
    const { organizationId = "" } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "stores";

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

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

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;

    const categories =
        categoriesQuery.data?.status === "success" ? categoriesQuery.data.data?.categories ?? [] : [];

    const products =
        productsQuery.data?.status === "success" ? productsQuery.data.data?.products ?? [] : [];

    if (organizationQuery.isPending) {
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

    const storeCount = organization.stores.length;
    const deviceCount = organization.stores.reduce((total, store) => total + store.devices.length, 0);
    const activeDeviceCount = organization.stores.reduce(
        (total, store) => total + store.devices.filter((device) => device.status === "active").length,
        0,
    );
    const productCount = products.length;

    return (
        <div className="space-y-8">
            {/* Back button */}
            <Button
                variant="ghost"
                className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                render={<Link to="/organizations" />}
            >
                <ArrowLeft className="mr-2 size-4" />
                Back to organizations
            </Button>

            {/* Hero — org name, date, inline stats, and CTA */}
            <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="relative p-6 sm:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.10),_transparent_30%)]" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-3">
                            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                Organization workspace
                            </Badge>
                            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                                {organization.name}
                            </h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Created {formatDateTime(organization.createdAt)} · Stores, devices, and catalog in one
                                operational view.
                            </p>

                            {/* Inline stat badges */}
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-sm">
                                    <Store className="mr-1.5 size-3.5 text-primary" />
                                    {storeCount} {storeCount === 1 ? "store" : "stores"}
                                </Badge>
                                <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-sm">
                                    <MonitorSmartphone className="mr-1.5 size-3.5 text-primary" />
                                    {deviceCount} {deviceCount === 1 ? "device" : "devices"}
                                </Badge>
                                <Badge variant="outline" className="rounded-full border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-700 dark:text-emerald-300">
                                    {activeDeviceCount} active
                                </Badge>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {activeTab === "stores" ? (
                                <CreateStoreDialog
                                    organizationId={organization.id}
                                    trigger={
                                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                                            <PlusCircle className="mr-2 size-4" />
                                            Add store
                                        </Button>
                                    }
                                />
                            ) : (
                                <>
                                    <UpsertCategoryDialog
                                        organizationId={organization.id}
                                        trigger={
                                            <Button variant="outline" className="rounded-full border-border/70 hover:bg-muted/50">
                                                <PlusCircle className="mr-2 size-4" />
                                                Add category
                                            </Button>
                                        }
                                    />
                                    <UpsertProductDialog
                                        organizationId={organization.id}
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
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs Navigation and Panels */}
            <Tabs
                value={activeTab}
                onValueChange={(val) => setSearchParams({ tab: val })}
                className="w-full space-y-6"
            >
                <TabsList
                    variant="line"
                    color="primary"
                    className="h-auto w-full justify-start gap-6 border-b border-border/60 bg-transparent p-0 pb-px"
                >
                    <TabsTrigger
                        value="stores"
                        className="h-auto gap-2 rounded-none border-b-2 border-transparent px-1 py-3 text-sm font-semibold transition-all hover:text-foreground data-active:border-primary data-active:text-primary sm:text-base cursor-pointer"
                    >
                        <Store className="size-4" />
                        Stores & Devices
                        <Badge variant="secondary" className="rounded-full bg-muted/60 px-2 py-0.5 text-xs font-normal">
                            {storeCount}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="catalog"
                        className="h-auto gap-2 rounded-none border-b-2 border-transparent px-1 py-3 text-sm font-semibold transition-all hover:text-foreground data-active:border-primary data-active:text-primary sm:text-base cursor-pointer"
                    >
                        <Package2 className="size-4" />
                        Categories & Products
                        {(!categoriesQuery.isPending && !productsQuery.isPending) && (
                            <Badge variant="secondary" className="rounded-full bg-muted/60 px-2 py-0.5 text-xs font-normal">
                                {productCount} {productCount === 1 ? "product" : "products"}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ─── STEP 1: Stores & Devices ────────────────────────────── */}
                <TabsContent value="stores" className="space-y-4 focus-visible:outline-none">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Store className="size-4" />
                            </div>
                            <div>
                                <h3 className="font-display text-xl font-semibold text-foreground">
                                    Step 1 — Stores & Devices
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Add your branches first, then register POS devices under each store.
                                </p>
                            </div>
                        </div>
                        <StoresSection organizationId={organization.id} stores={organization.stores} />
                    </section>
                </TabsContent>

                {/* ─── STEP 2: Categories & Products ───────────────────────── */}
                <TabsContent value="catalog" className="space-y-4 focus-visible:outline-none">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Package2 className="size-4" />
                            </div>
                            <div>
                                <h3 className="font-display text-xl font-semibold text-foreground">
                                    Step 2 — Categories & Products
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Create categories to group items, then add products with pricing and images.
                                </p>
                            </div>
                        </div>
                        <CatalogSection organizationId={organization.id} />
                    </section>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default OrganizationDetailPage;

