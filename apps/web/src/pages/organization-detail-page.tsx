import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { ArrowLeft, Layers3, MonitorSmartphone, Package2, PlusCircle, Store, Tags } from "lucide-react";

import CatalogSection from "@/components/catalog/catalog-section";
import CreateStoreDialog from "@/components/organizations/create-store-dialog";
import StoresSection from "@/components/organizations/stores-section";
import { formatDateTime } from "@/lib/format";
import { organizationKeys } from "@/lib/query-keys";

const OrganizationDetailPage = () => {
    const { organizationId = "" } = useParams();

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    const organization =
        organizationQuery.data?.status === "success" ? organizationQuery.data.data?.organization : null;

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

    return (
        <div className="space-y-8">
            <section className="space-y-5">
                <Button
                    variant="ghost"
                    className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                    render={<Link to="/organizations" />}
                >
                    <ArrowLeft className="mr-2 size-4" />
                    Back to organizations
                </Button>

                <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardContent className="relative p-8">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.12),_transparent_30%)]" />
                        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                            <div className="max-w-3xl space-y-4">
                                <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                    Organization workspace
                                </Badge>
                                <div>
                                    <h2 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                                        {organization.name}
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                        Created {formatDateTime(organization.createdAt)}. This is where stores, cashier
                                        devices, and rollout details come together in one operational view.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <CreateStoreDialog
                                    organizationId={organization.id}
                                    trigger={
                                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                                            <PlusCircle className="mr-2 size-4" />
                                            Add store
                                        </Button>
                                    }
                                />
                            </div>
                        </div>

                        <div className="relative mt-8 grid gap-4 md:grid-cols-3">
                            <div className="rounded-3xl border border-border/60 bg-background/80 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                    Stores
                                </p>
                                <p className="mt-3 text-3xl font-semibold text-foreground">{storeCount}</p>
                            </div>
                            <div className="rounded-3xl border border-border/60 bg-background/80 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                    Devices
                                </p>
                                <p className="mt-3 text-3xl font-semibold text-foreground">{deviceCount}</p>
                            </div>
                            <div className="rounded-3xl border border-border/60 bg-background/80 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                    Active devices
                                </p>
                                <p className="mt-3 text-3xl font-semibold text-foreground">{activeDeviceCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <Tabs defaultValue="operations" className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <TabsList variant="default" color="primary" className="rounded-2xl">
                        <TabsTrigger value="operations" className="rounded-xl px-4">
                            <Store className="mr-2 size-4" />
                            Stores & devices
                        </TabsTrigger>
                        <TabsTrigger value="catalog" className="rounded-xl px-4">
                            <Package2 className="mr-2 size-4" />
                            Categories & products
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full">
                            <MonitorSmartphone className="mr-2 size-3.5" />
                            {deviceCount} devices
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                            <Tags className="mr-2 size-3.5" />
                            Catalog ready
                        </Badge>
                    </div>
                </div>

                <TabsContent value="operations" className="space-y-5">
                    <Card className="border-border/60 bg-card/80 shadow-lg shadow-black/5">
                        <CardContent className="grid gap-4 p-5 md:grid-cols-3">
                            <div className="rounded-3xl border border-border/60 bg-background/80 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                    Branch network
                                </p>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    Stores define the physical operating surface of this organization.
                                </p>
                            </div>
                            <div className="rounded-3xl border border-border/60 bg-background/80 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                    Device control
                                </p>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    Register cashier hardware and reveal secrets only when configuration is happening.
                                </p>
                            </div>
                            <div className="rounded-3xl border border-border/60 bg-background/80 p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                    Live coverage
                                </p>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {activeDeviceCount} active devices are currently part of this workspace.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <StoresSection organizationId={organization.id} stores={organization.stores} />
                </TabsContent>

                <TabsContent value="catalog" className="space-y-5">
                    <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5">
                        <CardContent className="relative p-8">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.14),_transparent_30%)]" />
                            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                                <div className="max-w-3xl space-y-4">
                                    <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                        Catalog workspace
                                    </Badge>
                                    <div>
                                        <h3 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                                            Categories and products now live here too.
                                        </h3>
                                        <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                            Build a structured selling catalog for the web app with category CRUD, product CRUD,
                                            pricing, status control, and direct MinIO-backed image uploads.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <Badge variant="outline" className="rounded-full border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                        <Layers3 className="mr-2 size-3.5" />
                                        CRUD enabled
                                    </Badge>
                                    <Badge variant="outline" className="rounded-full">
                                        <Package2 className="mr-2 size-3.5" />
                                        Image upload ready
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <CatalogSection organizationId={organization.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default OrganizationDetailPage;
