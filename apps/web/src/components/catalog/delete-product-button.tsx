import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteProduct } from "@repo/services";
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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { catalogKeys } from "@/lib/query-keys";

type DeleteProductButtonProps = {
    organizationId: string;
    product: ProductResponseDTO;
};

const DeleteProductButton = ({ organizationId, product }: DeleteProductButtonProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => deleteProduct(organizationId, product.id),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: catalogKeys.categories(organizationId) });
                queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to delete product");
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger
                render={
                    <Button variant="destructive" size="sm" className="rounded-full">
                        <Trash2 className="mr-2 size-4" />
                        Delete
                    </Button>
                }
            />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia>
                        <Trash2 />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Delete product</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="font-medium text-foreground">{product.name}</span> will be removed from the
                        catalog. Its stored image will also be cleaned up on the backend.
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
                        Delete product
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeleteProductButton;
