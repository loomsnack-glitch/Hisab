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
import { Spinner } from "@repo/ui/components/spinner";
import { Pencil, PlusCircle, Puzzle, RefreshCw, Trash2 } from "lucide-react";
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
                    <Button variant="destructive" size="sm" className="rounded-full">
                        <Trash2 className="mr-1.5 size-3" />
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

    const addOnsQuery = useQuery({
        queryKey: catalogKeys.addOns(organizationId),
        queryFn: () => getAddOns(organizationId),
        enabled: Boolean(organizationId),
    });

    const addOns = addOnsQuery.data?.status === "success" ? addOnsQuery.data.data?.addOns ?? [] : [];

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
        <div className="space-y-5">
            {/* Add-Ons Content */}
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
            )}
        </div>
    );
};

export default AddOnsPage;
