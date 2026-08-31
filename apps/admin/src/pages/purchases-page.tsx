import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getOrganizationDetails, getPurchases } from "@repo/services";
import {
    PAYABLE_STATUS_LABELS,
    PURCHASE_LIFECYCLE_LABELS,
    type PurchaseDTO,
    type PurchaseLifecycle,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { LayoutGrid, Pencil, PlusCircle, RefreshCw, Search, ShoppingBag, Table as TableIcon, X } from "lucide-react";

import {
    PayableStatusBadge,
    PurchaseLifecycleBadge,
} from "@/components/purchases/purchase-status-badges";
import UpsertPurchaseDialog from "@/components/purchases/upsert-purchase-dialog";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { organizationKeys, purchaseKeys } from "@/lib/query-keys";
import { PremiumTable, type ColumnDef } from "@repo/ui/components/premium-table";

const PurchasesPage = () => {
    const { organizationId = "" } = useParams();
    const [mobileViewMode, setMobileViewMode] = useState<"card" | "table">("card");
    const [mobileSearchQuery, setMobileSearchQuery] = useState("");

    const purchasesQuery = useQuery({
        queryKey: purchaseKeys.list(organizationId),
        queryFn: () => getPurchases(organizationId),
        enabled: Boolean(organizationId),
    });

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    const purchases =
        purchasesQuery.data?.status === "success" ? purchasesQuery.data.data?.purchases ?? [] : [];
    const stores =
        organizationQuery.data?.status === "success"
            ? organizationQuery.data.data?.organization.stores ?? []
            : [];
    const storeNameById = useMemo(
        () => new Map(stores.map((store) => [store.id, store.name])),
        [stores],
    );

    const filteredPurchases = useMemo(() => {
        if (!mobileSearchQuery.trim()) return purchases;
        const query = mobileSearchQuery.toLowerCase().trim();
        return purchases.filter((purchase) =>
            purchase.vendorName.toLowerCase().includes(query)
            || (storeNameById.get(purchase.storeId) ?? purchase.storeName).toLowerCase().includes(query)
            || PURCHASE_LIFECYCLE_LABELS[purchase.lifecycle].toLowerCase().includes(query)
            || (purchase.invoiceReference ?? "").toLowerCase().includes(query),
        );
    }, [mobileSearchQuery, purchases, storeNameById]);

    const columns = useMemo<ColumnDef<PurchaseDTO>[]>(() => [
        {
            id: "vendor",
            header: "Vendor",
            accessor: (purchase) => (
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShoppingBag className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-medium text-foreground">{purchase.vendorName}</span>
                        {purchase.invoiceReference ? (
                            <p className="text-xs text-muted-foreground truncate">{purchase.invoiceReference}</p>
                        ) : null}
                    </div>
                </div>
            ),
            sortable: true,
            getSortValue: (purchase) => purchase.vendorName,
        },
        {
            id: "store",
            header: "Store",
            accessor: (purchase) => storeNameById.get(purchase.storeId) ?? purchase.storeName,
            sortable: true,
            getSortValue: (purchase) => storeNameById.get(purchase.storeId) ?? purchase.storeName,
            filterOptions: stores.map((store) => ({ label: store.name, value: store.id })),
            getFilterValue: (purchase) => purchase.storeId,
        },
        {
            id: "lifecycle",
            header: "Status",
            accessor: (purchase) => (
                <div className="flex flex-wrap items-center gap-1.5">
                    <PurchaseLifecycleBadge lifecycle={purchase.lifecycle} />
                    <PayableStatusBadge status={purchase.payableStatus} />
                </div>
            ),
            sortable: true,
            getSortValue: (purchase) => purchase.lifecycle,
            filterOptions: (["draft", "recorded", "voided"] as PurchaseLifecycle[]).map((lifecycle) => ({
                label: PURCHASE_LIFECYCLE_LABELS[lifecycle],
                value: lifecycle,
            })),
            getFilterValue: (purchase) => purchase.lifecycle,
        },
        {
            id: "effectiveDate",
            header: "Effective",
            accessor: (purchase) => formatDateOnly(purchase.effectiveDate),
            sortable: true,
            getSortValue: (purchase) => purchase.effectiveDate,
        },
        {
            id: "total",
            header: "Total",
            accessor: (purchase) => formatCurrency(purchase.total),
            sortable: true,
            getSortValue: (purchase) => purchase.total,
        },
        {
            id: "paidTotal",
            header: "Paid",
            accessor: (purchase) => formatCurrency(purchase.paidTotal),
            sortable: true,
            getSortValue: (purchase) => purchase.paidTotal,
        },
        {
            id: "dueAmount",
            header: "Due",
            accessor: (purchase) =>
                purchase.dueAmount === null ? "—" : formatCurrency(purchase.dueAmount),
            sortable: true,
            getSortValue: (purchase) => purchase.dueAmount ?? -1,
        },
    ], [storeNameById, stores]);

    const renderActions = (purchase: PurchaseDTO) => (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                render={<Link to={`/organizations/${organizationId}/purchases/${purchase.id}`} />}
            >
                View
            </Button>
            {purchase.lifecycle === "draft" ? (
                <UpsertPurchaseDialog
                    organizationId={organizationId}
                    purchase={purchase}
                    trigger={
                        <Button variant="outline" size="sm" className="rounded-full">
                            <Pencil className="size-3" />
                            Edit
                        </Button>
                    }
                />
            ) : null}
        </div>
    );

    if (purchasesQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (purchasesQuery.isError || purchasesQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load purchases</EmptyTitle>
                            <EmptyDescription>
                                {(purchasesQuery.error as { message?: string })?.message
                                    ?? purchasesQuery.data?.message
                                    ?? "Purchases could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => purchasesQuery.refetch()}
                            >
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4" data-testid="purchases-page">
            {purchases.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <ShoppingBag />
                                </EmptyMedia>
                                <EmptyTitle>No purchases yet</EmptyTitle>
                                <EmptyDescription>
                                    Create a Draft Purchase from an active Vendor, then record it when the buying details are ready.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertPurchaseDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="hidden sm:block">
                        <PremiumTable
                            data={purchases}
                            columns={columns}
                            actions={renderActions}
                            rowIdKey="id"
                            defaultPageSize={20}
                            fillAvailableViewport
                            searchPlaceholder="Search purchases..."
                            searchKeys={[
                                (purchase) => purchase.vendorName,
                                (purchase) => storeNameById.get(purchase.storeId) ?? purchase.storeName,
                                (purchase) => purchase.invoiceReference ?? "",
                            ]}
                            infoText={`${purchases.length} purchase${purchases.length === 1 ? "" : "s"}`}
                            toolbarActions={
                                <UpsertPurchaseDialog
                                    organizationId={organizationId}
                                    trigger={
                                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-4">
                                            <PlusCircle className="size-3.5" />
                                            Add purchase
                                        </Button>
                                    }
                                />
                            }
                        />
                    </div>

                    <div className="block sm:hidden space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 group/search">
                                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                                <Input
                                    type="text"
                                    placeholder="Search purchases..."
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
                            <UpsertPurchaseDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-3 shrink-0">
                                        <PlusCircle className="size-3.5" />
                                        Add
                                    </Button>
                                }
                            />
                        </div>

                        {mobileViewMode === "card" ? (
                            filteredPurchases.length === 0 ? (
                                <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                                    No purchases match your search.
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5">
                                    {filteredPurchases.map((purchase) => (
                                        <Card
                                            key={purchase.id}
                                            className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                        >
                                            <div className="flex items-start justify-between gap-2.5">
                                                <div className="min-w-0">
                                                    <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                        {purchase.vendorName}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {storeNameById.get(purchase.storeId) ?? purchase.storeName}
                                                        {" · "}
                                                        {formatDateOnly(purchase.effectiveDate)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <PurchaseLifecycleBadge lifecycle={purchase.lifecycle} />
                                                    <PayableStatusBadge status={purchase.payableStatus} />
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                                                <div>
                                                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(purchase.total)}</p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Due {purchase.dueAmount === null ? "—" : formatCurrency(purchase.dueAmount)}
                                                        {purchase.payableStatus
                                                            ? ` · ${PAYABLE_STATUS_LABELS[purchase.payableStatus]}`
                                                            : ""}
                                                    </p>
                                                </div>
                                                {renderActions(purchase)}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )
                        ) : (
                            <PremiumTable
                                data={purchases}
                                columns={columns}
                                actions={renderActions}
                                rowIdKey="id"
                                defaultPageSize={10}
                                searchPlaceholder="Search purchases..."
                                searchKeys={[
                                    (purchase) => purchase.vendorName,
                                    (purchase) => storeNameById.get(purchase.storeId) ?? purchase.storeName,
                                ]}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default PurchasesPage;
