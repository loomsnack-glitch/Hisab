import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { ArrowLeft, MonitorSmartphone, Package2, PlusCircle, Store } from "lucide-react";

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
        <div className="space-y-6">
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

                            {/* Inline stat badges — replaces the 3 large stat cards */}
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
                </CardContent>
            </Card>

            {/* Tabs — clean, no duplicate badges */}
            <Tabs defaultValue="operations" className="space-y-5">
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

                <TabsContent value="operations" className="space-y-5">
                    <StoresSection organizationId={organization.id} stores={organization.stores} />
                </TabsContent>

                <TabsContent value="catalog" className="space-y-5">
                    <CatalogSection organizationId={organization.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default OrganizationDetailPage;
