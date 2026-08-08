import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { deleteAddOn, getAddOns } from "@repo/services";
import type { AddOnDTO } from "@repo/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { LayoutGrid, Pencil, PlusCircle, Puzzle, RefreshCw, Search, Table as TableIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertAddOnDialog from "@/components/catalog/upsert-add-on-dialog";
import { formatDateTime } from "@/lib/format";
import { catalogKeys } from "@/lib/query-keys";
import { PremiumTable, type ColumnDef } from "@repo/ui/components/premium-table";

const DeleteAddOnButton = ({
    organizationId,
    addOn,
}: {
    organizationId: string;
    addOn: AddOnDTO;
}) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => deleteAddOn(organizationId, addOn.id),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: catalogKeys.addOns(organizationId) });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to delete add-on");
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger
                render={
                    <Button variant="destructive" size="sm" className="rounded-full h-8 text-xs px-3">
                        <Trash2 className="mr-1 size-3" />
                        Delete
                    </Button>
                }
            />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia>
                        <Trash2 />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Delete add-on</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="font-medium text-foreground">{addOn.name}</span> will be removed. This only
                        works if it is not attached to any products. Prefer setting status to inactive once it has been
                        used.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        className="rounded-xl"
                        isLoading={mutation.isPending}
                        loadingText="Deleting..."
                        onClick={() => mutation.mutate()}
                    >
                        Delete add-on
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const AddOnsPage = () => {
    const { organizationId = "" } = useParams();
    const [mobileViewMode, setMobileViewMode] = useState<"card" | "table">("card");
    const [mobileSearchQuery, setMobileSearchQuery] = useState("");

    const addOnsQuery = useQuery({
        queryKey: catalogKeys.addOns(organizationId),
        queryFn: () => getAddOns(organizationId),
        enabled: Boolean(organizationId),
    });

    const addOns = addOnsQuery.data?.status === "success" ? addOnsQuery.data.data?.addOns ?? [] : [];

    const filteredAddOns = useMemo(() => {
        if (!mobileSearchQuery.trim()) return addOns;
        const query = mobileSearchQuery.toLowerCase().trim();
        return addOns.filter((addOn) => addOn.name.toLowerCase().includes(query));
    }, [addOns, mobileSearchQuery]);

    const columns = useMemo<ColumnDef<typeof addOns[number]>[]>(() => [
        {
            id: "name",
            header: "Add-on",
            accessor: (addOn) => (
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Puzzle className="size-3.5" />
                    </div>
                    <span className="font-medium text-foreground">{addOn.name}</span>
                </div>
            ),
            sortable: true,
            getSortValue: (addOn) => addOn.name,
        },
        {
            id: "price",
            header: "Price",
            accessor: (addOn) => (
                <ProductPriceDisplay
                    price={addOn.price}
                    discount={addOn.discount}
                    size="sm"
                    align="left"
                />
            ),
            sortable: true,
            getSortValue: (addOn) => addOn.price,
        },
        {
            id: "status",
            header: "Status",
            accessor: (addOn) => <ProductStatusBadge status={addOn.status} />,
            sortable: true,
            getSortValue: (addOn) => addOn.status,
            filterOptions: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
            ],
            getFilterValue: (addOn) => addOn.status,
        },
        {
            id: "updatedAt",
            header: "Updated",
            accessor: (addOn) => formatDateTime(addOn.updatedAt),
            sortable: true,
            getSortValue: (addOn) => addOn.updatedAt,
        },
    ], []);

    const renderActions = (addOn: typeof addOns[number]) => (
        <>
            <UpsertAddOnDialog
                organizationId={organizationId}
                addOn={addOn}
                trigger={
                    <Button variant="outline" size="sm" className="rounded-full">
                        <Pencil className="mr-1.5 size-3" />
                        Edit
                    </Button>
                }
            />
            <DeleteAddOnButton organizationId={organizationId} addOn={addOn} />
        </>
    );

    if (addOnsQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (addOnsQuery.isError || addOnsQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load add-ons</EmptyTitle>
                            <EmptyDescription>
                                {(addOnsQuery.error as { message?: string })?.message
                                    ?? addOnsQuery.data?.message
                                    ?? "Add-ons could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => addOnsQuery.refetch()}
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
        <div className="space-y-4">
            {addOns.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Puzzle />
                                </EmptyMedia>
                                <EmptyTitle>No add-ons yet</EmptyTitle>
                                <EmptyDescription>
                                    Create reusable extras like Extra Cheese or Mayo, then attach them to products.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertAddOnDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Desktop View: Pure Table (Unchanged) */}
                    <div className="hidden sm:block">
                        <PremiumTable
                            data={addOns}
                            columns={columns}
                            actions={renderActions}
                            rowIdKey="id"
                            defaultPageSize={15}
                            searchPlaceholder="Search add-ons..."
                            searchKeys={[
                                (addOn) => addOn.name,
                            ]}
                            infoText={`${addOns.length} add-on${addOns.length === 1 ? "" : "s"}`}
                            toolbarActions={
                                <UpsertAddOnDialog
                                    organizationId={organizationId}
                                    trigger={
                                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-4">
                                            <PlusCircle className="mr-1.5 size-3.5" />
                                            Add add-on
                                        </Button>
                                    }
                                />
                            }
                        />
                    </div>

                    {/* Mobile View: Defaults to Card View with View Mode Toggle */}
                    <div className="block sm:hidden space-y-3">
                        {/* Mobile Search & Controls Header */}
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 group/search">
                                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                                    <Input
                                        type="text"
                                        placeholder="Search add-ons..."
                                        value={mobileSearchQuery}
                                        onChange={(e) => setMobileSearchQuery(e.target.value)}
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

                                {/* View Mode Toggle Buttons (Mobile Only) */}
                                <div className="flex items-center p-1 rounded-full border border-border/60 bg-card/80 shrink-0">
                                    <Button
                                        variant={mobileViewMode === "card" ? "default" : "ghost"}
                                        size="icon"
                                        className={cn(
                                            "h-7 w-7 rounded-full transition-all",
                                            mobileViewMode === "card" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
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
                                            mobileViewMode === "table" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
                                        )}
                                        onClick={() => setMobileViewMode("table")}
                                        aria-label="Table view"
                                    >
                                        <TableIcon className="size-3.5" />
                                    </Button>
                                </div>

                                <UpsertAddOnDialog
                                    organizationId={organizationId}
                                    trigger={
                                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-3 shrink-0">
                                            <PlusCircle className="mr-1 size-3.5" />
                                            Add
                                        </Button>
                                    }
                                />
                            </div>
                        </div>

                        {/* Mobile Content Display */}
                        {mobileViewMode === "card" ? (
                            filteredAddOns.length === 0 ? (
                                <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                                    No add-ons match your search.
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5">
                                    {filteredAddOns.map((addOn) => (
                                        <Card
                                            key={addOn.id}
                                            className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                        >
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                        <Puzzle className="size-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                            {addOn.name}
                                                        </h4>
                                                        <p className="text-[11px] text-muted-foreground/70">
                                                            Updated {formatDateTime(addOn.updatedAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ProductStatusBadge status={addOn.status} />
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                                                <ProductPriceDisplay
                                                    price={addOn.price}
                                                    discount={addOn.discount}
                                                    size="sm"
                                                    align="left"
                                                />

                                                <div className="flex items-center gap-1.5">
                                                    <UpsertAddOnDialog
                                                        organizationId={organizationId}
                                                        addOn={addOn}
                                                        trigger={
                                                            <Button variant="outline" size="sm" className="rounded-full h-8 text-xs px-3">
                                                                <Pencil className="mr-1 size-3" />
                                                                Edit
                                                            </Button>
                                                        }
                                                    />
                                                    <DeleteAddOnButton organizationId={organizationId} addOn={addOn} />
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )
                        ) : (
                            <PremiumTable
                                data={addOns}
                                columns={columns}
                                actions={renderActions}
                                rowIdKey="id"
                                defaultPageSize={10}
                                searchPlaceholder="Search add-ons..."
                                searchKeys={[
                                    (addOn) => addOn.name,
                                ]}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AddOnsPage;
