import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCategories, getOrganizationDetails, getProducts } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/components/tabs";
import { ArrowLeft, Package2, Store } from "lucide-react";

import CatalogSection from "@/components/catalog/catalog-section";
import EditOrganizationDialog from "@/components/organizations/edit-organization-dialog";
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
                <CardContent className="relative p-6 sm:px-8">
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
                        </div>

                        <div className="flex shrink-0 justify-end">
                            <EditOrganizationDialog organization={organization} />
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
                        className="h-auto gap-2 rounded-none px-1 py-3 text-sm font-semibold transition-all hover:text-foreground data-active:text-primary sm:text-base cursor-pointer"
                    >
                        <Store className="size-4" />
                        Stores
                        <span className="rounded-full bg-primary/10 text-primary dark:bg-primary/20 px-2 py-0.5 text-xs font-semibold shadow-inner border border-primary/10">
                            {storeCount}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="catalog"
                        className="h-auto gap-2 rounded-none px-1 py-3 text-sm font-semibold transition-all hover:text-foreground data-active:text-primary sm:text-base cursor-pointer"
                    >
                        <Package2 className="size-4" />
                        Products
                        {(!categoriesQuery.isPending && !productsQuery.isPending) && (
                            <span className="rounded-full bg-primary/10 text-primary dark:bg-primary/20 px-2 py-0.5 text-xs font-semibold shadow-inner border border-primary/10">
                                {productCount}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ─── Stores Panel ────────────────────────────── */}
                <TabsContent value="stores" className="space-y-4 focus-visible:outline-none">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Store className="size-4" />
                            </div>
                            <div>
                                <h3 className="font-display text-xl font-semibold text-foreground">
                                    Stores
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Manage your store branches and registered devices.
                                </p>
                            </div>
                        </div>
                        <StoresSection organizationId={organization.id} stores={organization.stores} />
                    </section>
                </TabsContent>

                {/* ─── Products Panel ───────────────────────── */}
                <TabsContent value="catalog" className="space-y-4 focus-visible:outline-none">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Package2 className="size-4" />
                            </div>
                            <div>
                                <h3 className="font-display text-xl font-semibold text-foreground">
                                    Products
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Manage your categories and product menu.
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
