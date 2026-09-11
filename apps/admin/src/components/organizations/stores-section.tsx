import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { StoreWithDevicesDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Pencil, PlusCircle, Store, Search, Settings2, X } from "lucide-react";

import CreateStoreDialog from "@/components/organizations/create-store-dialog";
import EditStoreDialog from "@/components/organizations/edit-store-dialog";
import StoreWhatsAppDialog from "@/components/organizations/store-whatsapp-dialog";
import { getStoreDetailPath } from "@/lib/store-routes";
import { getStoreWorkspacePath } from "@/lib/store-workspace-routes";

type StoresSectionProps = {
    organizationId: string;
    organizationUsername?: string;
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
                        <EmptyContent className="flex flex-wrap justify-center gap-2">
                            <Button variant="outline" className="rounded-full" render={<Link to={`/organizations/${organizationId}/whatsapp/accounts`} />}>
                                <Settings2 className="size-4" />
                                WhatsApp accounts
                            </Button>
                            <CreateStoreDialog organizationId={organizationId} />
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <section className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 min-w-[180px] max-w-sm group/search">
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

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        className="rounded-full h-10 px-4 text-xs sm:text-sm font-medium"
                        render={<Link to={`/organizations/${organizationId}/whatsapp/accounts`} />}
                    >
                        <Settings2 className="size-3.5" />
                        WhatsApp accounts
                    </Button>
                    <CreateStoreDialog
                        organizationId={organizationId}
                        trigger={
                            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 sm:px-5 text-xs sm:text-sm font-medium shadow-xs shadow-primary/20">
                                <PlusCircle className="size-3.5" />
                                Add store
                            </Button>
                        }
                    />
                </div>
            </div>

            {filteredStores.length > 0 && (
                <div className="flex items-center px-1 py-0.5">
                    <span className="text-xs text-muted-foreground/70">
                        Showing {filteredStores.length} store{filteredStores.length === 1 ? "" : "s"}
                    </span>
                </div>
            )}

            {filteredStores.length === 0 ? (
                <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                    No stores match your search.
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredStores.map((store) => {
                        const activeDeviceCount = store.devices.filter((device) => device.status === "active").length;

                        return (
                            <div
                                key={store.id}
                                className="group relative rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                            >
                                <Link
                                    to={getStoreDetailPath(organizationId, store.id)}
                                    className="absolute inset-0 z-0 rounded-2xl"
                                    aria-label={`Open ${store.name}`}
                                />

                                <div className="relative z-[1] flex flex-col">
                                    <div className="pointer-events-none flex items-center gap-3 min-w-0">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <Store className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                {store.name}
                                            </h4>
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                {store.address ?? "Address not added yet"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pointer-events-auto mt-3 flex flex-col gap-2.5 border-t border-border/40 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex flex-wrap gap-1.5">
                                            <Badge variant="outline" className="rounded-full text-[11px] px-2.5 py-0.5">
                                                {store.devices.length} device{store.devices.length === 1 ? "" : "s"}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="rounded-full border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300"
                                            >
                                                {activeDeviceCount} active
                                            </Badge>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-full px-3 text-xs"
                                                render={<Link to={getStoreWorkspacePath(organizationId, store.id)} />}
                                            >
                                                Open workspace
                                            </Button>
                                            <StoreWhatsAppDialog
                                                organizationId={organizationId}
                                                storeId={store.id}
                                                storeName={store.name}
                                            />
                                            <EditStoreDialog
                                                organizationId={organizationId}
                                                store={store}
                                                trigger={
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 rounded-full px-3 text-xs"
                                                        aria-label={`Edit ${store.name}`}
                                                    >
                                                        <Pencil className="size-3" />
                                                        Edit
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default StoresSection;
