import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCategory } from "@repo/services";
import type { CategoryDTO } from "@repo/types";
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

type DeleteCategoryButtonProps = {
    organizationId: string;
    category: CategoryDTO;
};

const DeleteCategoryButton = ({ organizationId, category }: DeleteCategoryButtonProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => deleteCategory(organizationId, category.id),
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
            toast.error(error.message ?? "Failed to delete category");
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
                    <AlertDialogTitle>Delete category</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="font-medium text-foreground">{category.name}</span> will be removed. This only
                        works if there are no products left in the category.
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
                        Delete category
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeleteCategoryButton;
