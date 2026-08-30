import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { getVendors } from "@repo/services";
import type { VendorDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { cn } from "@repo/ui/lib/utils";
import { LayoutGrid, Package, Pencil, PlusCircle, RefreshCw, Search, Table as TableIcon, Truck, X } from "lucide-react";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertVendorDialog from "@/components/vendors/upsert-vendor-dialog";
import { formatDateTime } from "@/lib/format";
import { vendorKeys } from "@/lib/query-keys";
import { PremiumTable, type ColumnDef } from "@repo/ui/components/premium-table";

const VendorsPage = () => {
    const { organizationId = "" } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const [mobileViewMode, setMobileViewMode] = useState<"card" | "table">("card");
    const [mobileSearchQuery, setMobileSearchQuery] = useState("");
    const activeTab = searchParams.get("tab") === "items" ? "items" : "vendors";

    const vendorsQuery = useQuery({
        queryKey: vendorKeys.list(organizationId),
        queryFn: () => getVendors(organizationId),
        enabled: Boolean(organizationId),
    });

    const vendors = vendorsQuery.data?.status === "success" ? vendorsQuery.data.data?.vendors ?? [] : [];

    const filteredVendors = useMemo(() => {
        if (!mobileSearchQuery.trim()) return vendors;
        const query = mobileSearchQuery.toLowerCase().trim();
        return vendors.filter((vendor) =>
            vendor.name.toLowerCase().includes(query)
            || (vendor.description ?? "").toLowerCase().includes(query),
        );
    }, [mobileSearchQuery, vendors]);

    const columns = useMemo<ColumnDef<VendorDTO>[]>(() => [
        {
            id: "name",
            header: "Vendor",
            accessor: (vendor) => (
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Truck className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-medium text-foreground">{vendor.name}</span>
                        {vendor.description ? (
                            <p className="text-xs text-muted-foreground truncate">{vendor.description}</p>
                        ) : null}
                    </div>
                </div>
            ),
            sortable: true,
            getSortValue: (vendor) => vendor.name,
        },
        {
            id: "status",
            header: "Status",
            accessor: (vendor) => <ProductStatusBadge status={vendor.status} />,
            sortable: true,
            getSortValue: (vendor) => vendor.status,
            filterOptions: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
            ],
            getFilterValue: (vendor) => vendor.status,
        },
        {
            id: "updatedAt",
            header: "Updated",
            accessor: (vendor) => formatDateTime(vendor.updatedAt),
            sortable: true,
            getSortValue: (vendor) => String(vendor.updatedAt),
        },
    ], []);

    const renderActions = (vendor: VendorDTO) => (
        <UpsertVendorDialog
            organizationId={organizationId}
            vendor={vendor}
            trigger={
                <Button variant="outline" size="sm" className="rounded-full">
                    <Pencil className="size-3" />
                    Edit
                </Button>
            }
        />
    );

    const vendorsDirectory = () => {
        if (vendorsQuery.isPending) {
            return (
                <div className="flex min-h-[30vh] items-center justify-center">
                    <Spinner className="size-6 text-primary" />
                </div>
            );
        }

        if (vendorsQuery.isError || vendorsQuery.data?.status === "error") {
            return (
                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardContent className="p-0">
                        <Empty className="rounded-2xl border-0">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <RefreshCw />
                                </EmptyMedia>
                                <EmptyTitle>Unable to load vendors</EmptyTitle>
                                <EmptyDescription>
                                    {(vendorsQuery.error as { message?: string })?.message
                                        ?? vendorsQuery.data?.message
                                        ?? "Vendors could not be loaded right now."}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button
                                    variant="outline"
                                    className="rounded-full"
                                    onClick={() => vendorsQuery.refetch()}
                                >
                                    Try again
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            );
        }

        if (vendors.length === 0) {
            return (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Truck />
                                </EmptyMedia>
                                <EmptyTitle>No vendors yet</EmptyTitle>
                                <EmptyDescription>
                                    Add a Vendor your Organization buys goods from.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertVendorDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            );
        }

        return (
            <>
                <div className="hidden sm:block">
                    <PremiumTable
                        data={vendors}
                        columns={columns}
                        actions={renderActions}
                        rowIdKey="id"
                        defaultPageSize={20}
                        fillAvailableViewport
                        searchPlaceholder="Search vendors..."
                        searchKeys={[
                            (vendor) => vendor.name,
                            (vendor) => vendor.description ?? "",
                        ]}
                        infoText={`${vendors.length} vendor${vendors.length === 1 ? "" : "s"}`}
                        toolbarActions={
                            <UpsertVendorDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-4">
                                        <PlusCircle className="size-3.5" />
                                        Add vendor
                                    </Button>
                                }
                            />
                        }
                    />
                </div>

                <div className="block sm:hidden space-y-3">
                    <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 group/search">
                                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                                <Input
                                    type="text"
                                    placeholder="Search vendors..."
                                    value={mobileSearchQuery}
                                    onChange={(event) => setMobileSearchQuery(event.target.value)}
                                    className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all duration-200 text-sm w-full shadow-2xs"
                                />
                                {mobileSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setMobileSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                                        aria-label="Clear search"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center p-1 rounded-full border border-border/60 bg-card/80 shrink-0">
                                <Button
                                    variant={mobileViewMode === "card" ? "default" : "ghost"}
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 rounded-full transition-all",
                                        mobileViewMode === "card" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground",
                                    )}
                                    onClick={() => setMobileViewMode("card")}
                                    aria-label="Card view"
                                >
                                    <LayoutGrid className="size-3.5" />
                                </Button>
                                <Button
                                    variant={mobileViewMode === "table" ? "default" : "ghost"}
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 rounded-full transition-all",
                                        mobileViewMode === "table" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground",
                                    )}
                                    onClick={() => setMobileViewMode("table")}
                                    aria-label="Table view"
                                >
                                    <TableIcon className="size-3.5" />
                                </Button>
                            </div>

                            <UpsertVendorDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-3 shrink-0">
                                        <PlusCircle className="size-3.5" />
                                        Add
                                    </Button>
                                }
                            />
                        </div>
                    </div>

                    {mobileViewMode === "card" ? (
                        filteredVendors.length === 0 ? (
                            <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                                No vendors match your search.
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 gap-2.5">
                                {filteredVendors.map((vendor) => (
                                    <Card
                                        key={vendor.id}
                                        className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                    >
                                        <div className="flex items-center justify-between gap-2.5">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                    <Truck className="size-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                        {vendor.name}
                                                    </h4>
                                                    {vendor.description ? (
                                                        <p className="text-[11px] text-muted-foreground/70 truncate">
                                                            {vendor.description}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <ProductStatusBadge status={vendor.status} />
                                        </div>

                                        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                                            <p className="text-[11px] text-muted-foreground">
                                                Updated {formatDateTime(vendor.updatedAt)}
                                            </p>
                                            <UpsertVendorDialog
                                                organizationId={organizationId}
                                                vendor={vendor}
                                                trigger={
                                                    <Button variant="outline" size="sm" className="rounded-full h-8 text-xs px-3">
                                                        <Pencil className="size-3" />
                                                        Edit
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )
                    ) : (
                        <PremiumTable
                            data={vendors}
                            columns={columns}
                            actions={renderActions}
                            rowIdKey="id"
                            defaultPageSize={10}
                            searchPlaceholder="Search vendors..."
                            searchKeys={[
                                (vendor) => vendor.name,
                                (vendor) => vendor.description ?? "",
                            ]}
                        />
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="space-y-6" data-testid="vendors-page">
            <Tabs
                value={activeTab}
                onValueChange={(tab) => setSearchParams(tab === "vendors" ? {} : { tab })}
                className="w-full space-y-6"
            >
                <TabsList
                    variant="line"
                    color="primary"
                    className="h-auto w-full justify-start gap-6 border-b border-border/60 bg-transparent p-0 pb-px"
                    aria-label="Vendors navigation tabs"
                >
                    <TabsTrigger
                        value="vendors"
                        className="h-auto gap-2 rounded-none px-1 py-3 text-sm font-semibold transition-all hover:text-foreground data-active:text-primary sm:text-base cursor-pointer"
                    >
                        <Truck className="size-4" />
                        Vendors
                    </TabsTrigger>
                    <TabsTrigger
                        value="items"
                        className="h-auto gap-2 rounded-none px-1 py-3 text-sm font-semibold transition-all hover:text-foreground data-active:text-primary sm:text-base cursor-pointer"
                    >
                        <Package className="size-4" />
                        Items
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="vendors" className="focus-visible:outline-none" data-testid="vendors-directory">
                    {vendorsDirectory()}
                </TabsContent>

                <TabsContent value="items" className="focus-visible:outline-none" data-testid="vendor-items-placeholder">
                    <Card className="border-border/60 bg-card/80 shadow-md">
                        <CardContent className="pt-6">
                            <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Package />
                                    </EmptyMedia>
                                    <EmptyTitle>No vendor items yet</EmptyTitle>
                                    <EmptyDescription>
                                        Vendor Items will appear here, grouped by Vendor.
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default VendorsPage;
