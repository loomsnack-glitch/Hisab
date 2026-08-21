import type { StoreWithDevicesDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { ExternalLink, MonitorSmartphone, PlusCircle } from "lucide-react";

import CreateDeviceDialog from "@/components/organizations/create-device-dialog";
import DeviceActionsMenu from "@/components/organizations/device-actions-menu";
import DeviceStatusBadge from "@/components/organizations/device-status-badge";
import { formatDateTime } from "@/lib/format";
import { getPosLoginUrl } from "@/lib/pos-origin";

type StoreDevicesSectionProps = {
    organizationId: string;
    organizationUsername: string;
    store: StoreWithDevicesDTO;
};

const StoreDevicesSection = ({ organizationId, organizationUsername, store }: StoreDevicesSectionProps) => {
    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">Devices</h3>
                    <p className="text-sm text-muted-foreground">POS terminals registered to this store.</p>
                </div>
                <CreateDeviceDialog
                    organizationId={organizationId}
                    organizationUsername={organizationUsername}
                    storeId={store.id}
                    storeName={store.name}
                    deviceNumber={store.devices.length + 1}
                    trigger={
                        <Button variant="outline" className="rounded-full h-9 text-xs sm:h-10 sm:text-sm px-3.5 sm:px-4">
                            <PlusCircle className="size-3.5 sm:size-4" />
                            Add device
                        </Button>
                    }
                />
            </div>

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
                            deviceNumber={store.devices.length + 1}
                        />
                    </EmptyContent>
                </Empty>
            ) : (
                <>
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
                                                        render={
                                                            <a
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                href={getPosLoginUrl({
                                                                    organizationUsername,
                                                                    deviceUsername: device.loginUsername,
                                                                })}
                                                            />
                                                        }
                                                    >
                                                        <ExternalLink className="size-4" />
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

                    <div className="block xl:hidden space-y-3">
                        {store.devices.map((device) => (
                            <div
                                key={device.id}
                                className="rounded-2xl border border-border/60 bg-card p-4 space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-medium text-foreground truncate">{device.name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Last seen: {formatDateTime(device.lastSeenAt)}
                                        </p>
                                    </div>
                                    <DeviceStatusBadge status={device.status} className="shrink-0" />
                                </div>

                                {device.status !== "active" && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                                        {device.status === "revoked" ? "Revoked" : "Inactive"} — POS login disabled
                                    </div>
                                )}

                                <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">Device username</p>
                                        <code className="break-all font-mono text-sm text-foreground">
                                            {device.loginUsername}
                                        </code>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Created {formatDateTime(device.createdAt)}
                                </p>

                                <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-2 pt-1">
                                    {device.status === "active" && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-full"
                                            render={
                                                <a
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    href={getPosLoginUrl({
                                                        organizationUsername,
                                                        deviceUsername: device.loginUsername,
                                                    })}
                                                />
                                            }
                                        >
                                            <ExternalLink className="size-4" />
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
        </section>
    );
};

export default StoreDevicesSection;
