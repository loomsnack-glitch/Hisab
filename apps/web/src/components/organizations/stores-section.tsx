import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { StoreWithDevicesDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { ExternalLink, MonitorSmartphone, Pencil, PlusCircle, Store, Search, X } from "lucide-react";

import CreateDeviceDialog from "@/components/organizations/create-device-dialog";
import CreateStoreDialog from "@/components/organizations/create-store-dialog";
import DeviceActionsMenu from "@/components/organizations/device-actions-menu";
import DeviceStatusBadge from "@/components/organizations/device-status-badge";
import EditDeviceDialog from "@/components/organizations/edit-device-dialog";
import EditStoreDialog from "@/components/organizations/edit-store-dialog";
import SaleNumberSettingsDialog from "@/components/organizations/sale-number-settings-dialog";
import { formatDateTime } from "@/lib/format";

type StoresSectionProps = {
    organizationId: string;
    organizationUsername: string;
    stores: StoreWithDevicesDTO[];
};

const StoresSection = ({ organizationId, organizationUsername, stores }: StoresSectionProps) => {
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
            {/* Search & Actions bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md w-full group/search">
                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                    <Input
                        type="text"
                        placeholder="Search stores..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all duration-200 text-sm w-full shadow-2xs"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                            aria-label="Clear search"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <CreateStoreDialog
                        organizationId={organizationId}
                        trigger={
                            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5">
                                <PlusCircle className="mr-2 size-4" />
                                Add store
                            </Button>
                        }
                    />
                </div>
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
                    <Card key={store.id} className="border-border/60 bg-card/80 shadow-sm sm:shadow-md">
                        <CardHeader className="p-4 sm:p-6 gap-3 sm:gap-4 border-b border-border/50">
                            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2.5 sm:space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                            <Store className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <CardTitle className="font-display text-xl sm:text-2xl truncate">{store.name}</CardTitle>
                                            <CardDescription className="mt-0.5 text-xs sm:text-sm truncate">
                                                {store.address ?? "Address not added yet"}
                                            </CardDescription>
                                            <p className="text-[11px] sm:text-xs text-muted-foreground/70">
                                                Created {formatDateTime(store.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="rounded-full text-xs">
                                            {store.devices.length} device{store.devices.length === 1 ? "" : "s"}
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs"
                                        >
                                            {store.devices.filter((device) => device.status === "active").length} active
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pt-1 lg:pt-0">
                                    <SaleNumberSettingsDialog
                                        organizationId={organizationId}
                                        store={store}
                                    />
                                    <EditStoreDialog
                                        organizationId={organizationId}
                                        store={store}
                                        trigger={
                                            <Button variant="outline" className="rounded-full h-9 text-xs sm:h-10 sm:text-sm px-3.5 sm:px-4">
                                                <Pencil className="size-3.5 sm:size-4" />
                                                Edit store
                                            </Button>
                                        }
                                    />
                                    <CreateDeviceDialog
                                        organizationId={organizationId}
                                        organizationUsername={organizationUsername}
                                        storeId={store.id}
                                        storeName={store.name}
                                        trigger={
                                            <Button variant="outline" className="rounded-full h-9 text-xs sm:h-10 sm:text-sm px-3.5 sm:px-4">
                                                <PlusCircle className="size-3.5 sm:size-4" />
                                                Add device
                                            </Button>
                                        }
                                    />
                                </div>
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
                                            organizationUsername={organizationUsername}
                                            storeId={store.id}
                                            storeName={store.name}
                                        />
                                    </EmptyContent>
                                </Empty>
                            ) : (
                                <>
                                    {/* Desktop table */}
                                    <div className="hidden xl:block overflow-x-auto rounded-2xl border border-border/60">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border/50 bg-muted/20 text-left text-muted-foreground">
                                                    <th className="px-4 py-3 font-medium">Device</th>
                                                    <th className="px-4 py-3 font-medium">Status</th>
                                                    <th className="px-4 py-3 font-medium">Last seen</th>
                                                    <th className="px-4 py-3 font-medium">Created</th>
                                                    <th className="px-4 py-3 font-medium">Actions</th>
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
                                                                <div className="mt-1 flex items-center gap-1">
                                                                    <code className="break-all font-mono text-xs text-muted-foreground">
                                                                        {device.loginUsername}
                                                                    </code>
                                                                </div>
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
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {device.status !== "active" ? (
                                                                    <span className="text-xs text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                                                                        {device.status === "revoked" ? "Revoked" : "Inactive"} — POS login disabled
                                                                    </span>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="rounded-full"
                                                                        render={<Link target="_blank" rel="noopener noreferrer" to={`/pos/login?org=${encodeURIComponent(organizationUsername)}&device=${encodeURIComponent(device.loginUsername)}`} />}
                                                                    >
                                                                        <ExternalLink className="mr-2 size-4" />
                                                                        Open POS
                                                                    </Button>
                                                                )}
                                                                <DeviceActionsMenu
                                                                    organizationId={organizationId}
                                                                    organizationUsername={organizationUsername}
                                                                    storeId={store.id}
                                                                    device={device}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Tablet/mobile cards */}
                                    <div className="block xl:hidden space-y-3">
                                        {store.devices.map((device) => (
                                            <div
                                                key={device.id}
                                                className="rounded-2xl border border-border/60 bg-card p-4 space-y-3"
                                            >
                                                {/* Header: name + status */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-foreground truncate">{device.name}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Last seen: {formatDateTime(device.lastSeenAt)}
                                                        </p>
                                                    </div>
                                                    <DeviceStatusBadge status={device.status} className="shrink-0" />
                                                </div>

                                                {/* Status warning for non-active devices */}
                                                {device.status !== "active" && (
                                                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                                                        {device.status === "revoked" ? "Revoked" : "Inactive"} — POS login disabled
                                                    </div>
                                                )}

                                                {/* Device username row */}
                                                <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-muted-foreground">Device username</p>
                                                        <code className="break-all font-mono text-sm text-foreground">
                                                            {device.loginUsername}
                                                        </code>
                                                    </div>
                                                </div>

                                                {/* Created date */}
                                                <p className="text-xs text-muted-foreground">
                                                    Created {formatDateTime(device.createdAt)}
                                                </p>

                                                {/* Actions grid */}
                                                <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-2 pt-1">
                                                    {device.status === "active" && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-full"
                                                            render={<Link target="_blank" rel="noopener noreferrer" to={`/pos/login?org=${encodeURIComponent(organizationUsername)}&device=${encodeURIComponent(device.loginUsername)}`} />}
                                                        >
                                                            <ExternalLink className="mr-2 size-4" />
                                                            Open POS
                                                        </Button>
                                                    )}
                                                    <DeviceActionsMenu
                                                        organizationId={organizationId}
                                                        organizationUsername={organizationUsername}
                                                        storeId={store.id}
                                                        device={device}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}
        </section>
    );
};

export default StoresSection;
