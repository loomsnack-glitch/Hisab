import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

import {
    catalogProductStatusChangedMessage,
    markCatalogProductStatusAriaLabel,
    markCatalogProductStatusLabel,
    markCatalogProductStatusProgress,
    markCatalogProductStatusTitle,
} from "@/lib/catalog-product-status-copy";
import { catalogKeys } from "@/lib/query-keys";
import { updateCatalogProductStatus } from "@/lib/update-catalog-product-status";

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
            updateCatalogProductStatus(organizationId, product, nextStatus),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(catalogProductStatusChangedMessage(product.name, nextStatus));
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
                    `Could not ${markCatalogProductStatusLabel(nextStatus).toLowerCase()}`,
            );
        },
    });

    const defaultButton = (
        <Button
            variant="ghost"
            size="icon"
            aria-label={markCatalogProductStatusAriaLabel(product.name, nextStatus)}
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
                    {markCatalogProductStatusLabel(nextStatus)}
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
                        {markCatalogProductStatusTitle(product.name, nextStatus)}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {isActive
                            ? `"${product.name}" will be marked inactive at the organization level. Stores inheriting organization defaults will no longer offer it to customers.`
                            : `"${product.name}" will be marked active at the organization level. Stores inheriting organization defaults will offer it to customers.`}
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
                        loadingText={markCatalogProductStatusProgress(nextStatus)}
                        onClick={() => mutation.mutate()}
                    >
                        {markCatalogProductStatusLabel(nextStatus)}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ToggleProductStatusButton;
