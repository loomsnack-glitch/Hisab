import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct } from "@repo/services";
import type { ProductResponseDTO } from "@repo/types";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { catalogKeys } from "@/lib/query-keys";

type ToggleProductStatusButtonProps = {
    organizationId: string;
    product: ProductResponseDTO;
    trigger?: React.ReactElement;
};

const ToggleProductStatusButton = ({
    organizationId,
    product,
    trigger,
}: ToggleProductStatusButtonProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const isActive = product.status === "active";
    const nextStatus = isActive ? "inactive" : "active";

    const mutation = useMutation({
        mutationFn: () =>
            updateProduct(organizationId, product.id, { status: nextStatus }),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(
                    nextStatus === "active"
                        ? `${product.name} activated`
                        : `${product.name} deactivated`,
                );
                queryClient.invalidateQueries({
                    queryKey: catalogKeys.products(organizationId),
                });
                queryClient.invalidateQueries({
                    queryKey: catalogKeys.storeProductOfferingOverrideSummary(organizationId),
                });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(
                error.message ??
                    `Failed to ${isActive ? "deactivate" : "activate"} product`,
            );
        },
    });

    const defaultButton = (
        <Button
            variant="ghost"
            size="icon"
            aria-label={isActive ? `Deactivate ${product.name}` : `Activate ${product.name}`}
            className={`h-8 w-8 rounded-lg cursor-pointer touch-manipulation focus-visible:ring-2 ${
                isActive
                    ? "text-muted-foreground hover:bg-muted/80 hover:text-foreground focus-visible:ring-primary/40"
                    : "text-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-400 focus-visible:ring-emerald-500/40"
            }`}
        >
            {isActive ? (
                <EyeOff className="size-3.5" />
            ) : (
                <Eye className="size-3.5 text-emerald-400" />
            )}
        </Button>
    );

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                    <AlertDialogTrigger render={trigger ?? defaultButton} />
                </TooltipTrigger>
                <TooltipContent>
                    {isActive ? "Deactivate product" : "Activate product"}
                </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia
                        className={
                            isActive
                                ? "bg-muted/80 text-muted-foreground"
                                : "bg-emerald-500/15 text-emerald-500"
                        }
                    >
                        {isActive ? <EyeOff /> : <Eye />}
                    </AlertDialogMedia>
                    <AlertDialogTitle>
                        {isActive
                            ? `Deactivate ${product.name}?`
                            : `Activate ${product.name}?`}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isActive
                            ? `"${product.name}" will be deactivated at the organization level. Stores inheriting organization defaults will no longer offer it to customers.`
                            : `"${product.name}" will be activated at the organization level. Stores inheriting organization defaults will offer it to customers.`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className={`rounded-xl shadow-sm ${
                            isActive
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                        }`}
                        isLoading={mutation.isPending}
                        loadingText={isActive ? "Deactivating..." : "Activating..."}
                        onClick={() => mutation.mutate()}
                    >
                        {isActive ? "Deactivate product" : "Activate product"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ToggleProductStatusButton;
