import { useMemo, useState } from "react";
import type { StoreWithDevicesDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { MonitorSmartphone, PlusCircle, Store, Search } from "lucide-react";

import CreateDeviceDialog from "@/components/organizations/create-device-dialog";
import CreateStoreDialog from "@/components/organizations/create-store-dialog";
import DeviceStatusBadge from "@/components/organizations/device-status-badge";
import RevealDeviceSecretButton from "@/components/organizations/reveal-device-secret-button";
import { formatDateTime } from "@/lib/format";

type StoresSectionProps = {
    organizationId: string;
    stores: StoreWithDevicesDTO[];
};

const StoresSection = ({ organizationId, stores }: StoresSectionProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredStores = useMemo(() => {
        if (!searchQuery.trim()) return stores;
        const query = searchQuery.toLowerCase().trim();
        return stores.filter((store) => store.name.toLowerCase().includes(query));
    }, [stores, searchQuery]);

    if (stores.length === 0) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
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
                            <CreateStoreDialog organizationId={organizationId} />
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <section className="space-y-5">
            {/* Search store branches bar */}
            <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Search stores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 rounded-full border-border/60 bg-card/60 focus-visible:ring-primary w-full"
                />
            </div>

            {filteredStores.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Store />
                                </EmptyMedia>
                                <EmptyTitle>No stores found</EmptyTitle>
                                <EmptyDescription>
                                    Try adjusting your search query.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                filteredStores.map((store) => (
                    <Card key={store.id} className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                        <CardHeader className="gap-4 border-b border-border/50">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <Store className="size-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="font-display text-2xl">{store.name}</CardTitle>
                                            <CardDescription className="mt-0.5">
                                                {store.address ?? "Address not added yet"}
                                            </CardDescription>
                                            <p className="text-xs text-muted-foreground/70">
                                                Created {formatDateTime(store.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="rounded-full">
                                            {store.devices.length} device{store.devices.length === 1 ? "" : "s"}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        >
                                            {store.devices.filter((device) => device.status === "active").length} active
                                        </Badge>
                                    </div>
                                </div>

                                <CreateDeviceDialog
                                    organizationId={organizationId}
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
                                <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <MonitorSmartphone />
                                        </EmptyMedia>
                                        <EmptyTitle>No devices registered</EmptyTitle>
                                        <EmptyDescription>
                                            Add a cashier or POS device, define its secret yourself, and reveal it only when the
                                            device is being configured.
                                        </EmptyDescription>
                                    </EmptyHeader>
                                    <EmptyContent>
                                        <CreateDeviceDialog
                                            organizationId={organizationId}
                                            storeId={store.id}
                                            storeName={store.name}
                                        />
                                    </EmptyContent>
                                </Empty>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-border/60">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border/50 bg-muted/20 text-left text-muted-foreground">
                                                <th className="px-4 py-3 font-medium">Device</th>
                                                <th className="px-4 py-3 font-medium">Status</th>
                                                <th className="px-4 py-3 font-medium">Last seen</th>
                                                <th className="px-4 py-3 font-medium">Created</th>
                                                <th className="px-4 py-3 font-medium">Secret</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/40">
                                            {store.devices.map((device, index) => (
                                                <tr
                                                    key={device.id}
                                                    className={`transition-colors duration-150 hover:bg-muted/30 ${index % 2 === 0 ? "" : "bg-muted/10"}`}
                                                >
                                                    <td className="px-4 py-3.5">
                                                        <div>
                                                            <p className="font-medium text-foreground">{device.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                ID: {device.id.slice(0, 8)}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <DeviceStatusBadge status={device.status} />
                                                    </td>
                                                    <td className="px-4 py-3.5 text-muted-foreground">
                                                        {formatDateTime(device.lastSeenAt)}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-muted-foreground">
                                                        {formatDateTime(device.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <code className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                                                                ••••••••
                                                            </code>
                                                            <RevealDeviceSecretButton
                                                                organizationId={organizationId}
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
                        </CardContent>
                    </Card>
                ))
            )}
        </section>
    );
};

export default StoresSection;
