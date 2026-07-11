import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Pencil, PlusCircle, Puzzle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertAddOnDialog from "@/components/catalog/upsert-add-on-dialog";
import { formatDateTime } from "@/lib/format";
import { catalogKeys } from "@/lib/query-keys";

type ManageAddOnsDialogProps = {
    organizationId: string;
    trigger?: React.ReactElement;
};

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

const ManageAddOnsDialog = ({ organizationId, trigger }: ManageAddOnsDialogProps) => {
    const [open, setOpen] = useState(false);

    const addOnsQuery = useQuery({
        queryKey: catalogKeys.addOns(organizationId),
        queryFn: () => getAddOns(organizationId),
        enabled: open && Boolean(organizationId),
    });

    const addOns = addOnsQuery.data?.status === "success" ? addOnsQuery.data.data?.addOns ?? [] : [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" className="rounded-full">
                            <Puzzle className="mr-2 size-4" />
                            Manage add-ons
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Puzzle className="size-5" />
                            </div>
                            <div className="text-left">
                                <DialogTitle className="font-display text-xl font-semibold">
                                    Manage Add-Ons
                                </DialogTitle>
                                <DialogDescription className="text-xs mt-0.5">
                                    Organization-level extras with their own price, discount, and status.
                                </DialogDescription>
                            </div>
                        </div>
                        {addOns.length > 0 && (
                            <UpsertAddOnDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs">
                                        <PlusCircle className="mr-2 size-3.5" />
                                        Add add-on
                                    </Button>
                                }
                            />
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                    {addOnsQuery.isPending ? (
                        <div className="flex min-h-[20vh] items-center justify-center">
                            <Spinner className="size-6 text-primary" />
                        </div>
                    ) : addOns.length === 0 ? (
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
            </DialogContent>
        </Dialog>
    );
};

export default ManageAddOnsDialog;
