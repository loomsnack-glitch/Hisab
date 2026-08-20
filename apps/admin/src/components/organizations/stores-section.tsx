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
import { formatDateTime } from "@/lib/format";
import { getStoreDetailPath } from "@/lib/store-routes";

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
        <section className="space-y-5">
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
                    <Button variant="outline" className="rounded-full h-11 px-5" render={<Link to={`/organizations/${organizationId}/whatsapp/accounts`} />}>
                        <Settings2 className="size-4" />
                        WhatsApp accounts
                    </Button>
                    <CreateStoreDialog
                        organizationId={organizationId}
                        trigger={
                            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5">
                                <PlusCircle className="size-4" />
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
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredStores.map((store) => {
                        const activeDeviceCount = store.devices.filter((device) => device.status === "active").length;

                        return (
                            <div
                                key={store.id}
                                className="group relative rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                            >
                                <Link
                                    to={getStoreDetailPath(organizationId, store.id)}
                                    className="absolute inset-0 z-0 rounded-2xl"
                                    aria-label={`Open ${store.name}`}
                                />
                                <div className="pointer-events-none relative z-[1] flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Store className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-lg font-semibold text-foreground">{store.name}</p>
                                                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                                    {store.address ?? "Address not added yet"}
                                                </p>
                                            </div>
                                            <EditStoreDialog
                                                organizationId={organizationId}
                                                store={store}
                                                trigger={
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="pointer-events-auto relative z-10 shrink-0 rounded-lg text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                                                        aria-label={`Edit ${store.name}`}
                                                    >
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Badge variant="outline" className="rounded-full text-xs">
                                                {store.devices.length} device{store.devices.length === 1 ? "" : "s"}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs"
                                            >
                                                {activeDeviceCount} active
                                            </Badge>
                                        </div>
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            Created {formatDateTime(store.createdAt)}
                                        </p>
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
