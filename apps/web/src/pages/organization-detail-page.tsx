import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationDetails } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { ArrowLeft, MonitorSmartphone, PlusCircle, ShieldCheck, Store } from "lucide-react";

import CreateDeviceDialog from "@/components/organizations/create-device-dialog";
import CreateStoreDialog from "@/components/organizations/create-store-dialog";
import DeviceStatusBadge from "@/components/organizations/device-status-badge";
import RevealDeviceSecretButton from "@/components/organizations/reveal-device-secret-button";
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

            {organization.stores.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardContent className="p-0">
                        <Empty className="rounded-[28px] border-0">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Store />
                                </EmptyMedia>
                                <EmptyTitle>No stores yet</EmptyTitle>
                                <EmptyDescription>
                                    Add your first branch to begin registering POS devices and operational endpoints.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <CreateStoreDialog organizationId={organization.id} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <section className="space-y-5">
                    {organization.stores.map((store) => (
                        <Card key={store.id} className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                            <CardHeader className="gap-4 border-b border-border/50">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                                <Store className="size-4" />
                                            </div>
                                            <div>
                                                <CardTitle className="font-display text-2xl">{store.name}</CardTitle>
                                                <CardDescription>
                                                    {store.address ?? "Address not added yet"} - Created {formatDateTime(store.createdAt)}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline" className="rounded-full">
                                                {store.devices.length} device{store.devices.length === 1 ? "" : "s"}
                                            </Badge>
                                            <Badge variant="outline" className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                                {store.devices.filter((device) => device.status === "active").length} active
                                            </Badge>
                                        </div>
                                    </div>

                                    <CreateDeviceDialog
                                        organizationId={organization.id}
                                        storeId={store.id}
                                        storeName={store.name}
                                        trigger={
                                            <Button variant="outline" className="rounded-full">
                                                <PlusCircle className="mr-2 size-4" />
                                                Add device
                                            </Button>
                                        }
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {store.devices.length === 0 ? (
                                    <Empty className="rounded-[28px] border border-dashed border-border bg-background/60">
                                        <EmptyHeader>
                                            <EmptyMedia variant="icon">
                                                <MonitorSmartphone />
                                            </EmptyMedia>
                                            <EmptyTitle>No devices registered</EmptyTitle>
                                            <EmptyDescription>
                                                Add a cashier or POS device, define its secret yourself, and reveal it only
                                                when the device is being configured.
                                            </EmptyDescription>
                                        </EmptyHeader>
                                        <EmptyContent>
                                            <CreateDeviceDialog
                                                organizationId={organization.id}
                                                storeId={store.id}
                                                storeName={store.name}
                                            />
                                        </EmptyContent>
                                    </Empty>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-border/60 text-sm">
                                            <thead>
                                                <tr className="text-left text-muted-foreground">
                                                    <th className="px-3 py-3 font-medium">Device</th>
                                                    <th className="px-3 py-3 font-medium">Status</th>
                                                    <th className="px-3 py-3 font-medium">Last seen</th>
                                                    <th className="px-3 py-3 font-medium">Created</th>
                                                    <th className="px-3 py-3 font-medium">Secret</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/50">
                                                {store.devices.map((device) => (
                                                    <tr key={device.id} className="transition-colors hover:bg-muted/30">
                                                        <td className="px-3 py-4">
                                                            <div>
                                                                <p className="font-medium text-foreground">{device.name}</p>
                                                                <p className="text-xs text-muted-foreground">Device ID: {device.id.slice(0, 8)}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            <DeviceStatusBadge status={device.status} />
                                                        </td>
                                                        <td className="px-3 py-4 text-muted-foreground">
                                                            {formatDateTime(device.lastSeenAt)}
                                                        </td>
                                                        <td className="px-3 py-4 text-muted-foreground">
                                                            {formatDateTime(device.createdAt)}
                                                        </td>
                                                        <td className="px-3 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <code className="rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                                                                    ********
                                                                </code>
                                                                <RevealDeviceSecretButton
                                                                    organizationId={organization.id}
                                                                    storeId={store.id}
                                                                    deviceId={device.id}
                                                                    deviceName={device.name}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mt-6 rounded-[24px] border border-border/60 bg-muted/40 p-4">
                                    <div className="flex items-start gap-3">
                                        <ShieldCheck className="mt-0.5 size-4 text-primary" />
                                        <p className="text-sm leading-6 text-muted-foreground">
                                            Device secrets are hidden by default and can be revealed on demand from the
                                            table above. This keeps setup practical without exposing secrets across the UI.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </section>
            )}
        </div>
    );
};

export default OrganizationDetailPage;
