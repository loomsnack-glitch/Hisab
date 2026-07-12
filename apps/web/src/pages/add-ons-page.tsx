import { useState } from "react";
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
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${addOn.name}`}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                        <Trash2 className="size-3.5" />
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
            {/* Header with Add Add-on button */}
            {addOns.length > 0 && (
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {addOns.length} add-on{addOns.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    <UpsertAddOnDialog
                        organizationId={organizationId}
                        trigger={
                            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5">
                                <PlusCircle className="mr-2 size-4" />
                                Add add-on
                            </Button>
                        }
                    />
                </div>
            )}

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
                <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/30">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/50 bg-muted/20 text-left text-muted-foreground sticky top-0 backdrop-blur-md z-10">
                                <th className="px-4 py-3 font-medium">Add-on</th>
                                <th className="px-4 py-3 font-medium">Price</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Updated</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {addOns.map((addOn) => (
                                <tr key={addOn.id} className="border-b border-border/40 last:border-0">
                                    <td className="px-4 py-3 font-medium text-foreground">{addOn.name}</td>
                                    <td className="px-4 py-3">
                                        <ProductPriceDisplay
                                            price={addOn.price}
                                            discount={addOn.discount}
                                            size="sm"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <ProductStatusBadge status={addOn.status} />
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {formatDateTime(addOn.updatedAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-0.5">
                                            <UpsertAddOnDialog
                                                organizationId={organizationId}
                                                addOn={addOn}
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Edit ${addOn.name}`}
                                                        className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </Button>
                                                }
                                            />
                                            <DeleteAddOnButton organizationId={organizationId} addOn={addOn} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AddOnsPage;
