import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { updateStore } from "@repo/services";
import { UpdateStoreSchema, type StoreDTO, type UpdateStoreJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Pencil, Store } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";

type EditStoreDialogProps = {
    organizationId: string;
    store: StoreDTO;
    trigger?: React.ReactElement;
};

const EditStoreDialog = ({ organizationId, store, trigger }: EditStoreDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm<UpdateStoreJSON>({
        resolver: zodResolver(UpdateStoreSchema),
        defaultValues: {
            name: store.name,
            address: store.address ?? "",
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: store.name,
                address: store.address ?? "",
            });
        }
    }, [form, open, store.address, store.name]);

    const updateMutation = useMutation({
        mutationFn: (values: UpdateStoreJSON) => updateStore(organizationId, store.id, values),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to update store");
        },
    });

    const onSubmit: SubmitHandler<UpdateStoreJSON> = (values) => {
        updateMutation.mutate({
            name: values.name.trim(),
            address: values.address,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" size="sm" className="rounded-full">
                            <Pencil className="size-4" />
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Store className="size-5" />
                    </div>
                    <DialogTitle className="text-center text-lg font-semibold">Edit store</DialogTitle>
                    <DialogDescription className="text-center">
                        Update the name or address for this branch.
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Store name</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" placeholder="e.g. Main Street Branch" {...form.register("name")} />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.address}>
                        <FieldLabel>Address <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                        <FieldContent>
                            <Textarea
                                className="min-h-20 rounded-xl"
                                placeholder="e.g. 123 Main St, City, State"
                                {...form.register("address")}
                            />
                            <FieldError errors={[form.formState.errors.address]} />
                        </FieldContent>
                    </Field>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditStoreDialog;
