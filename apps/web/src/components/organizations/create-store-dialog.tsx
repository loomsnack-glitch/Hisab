import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { createStore } from "@repo/services";
import { CreateStoreSchema, type CreateStoreJSON } from "@repo/types";
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
import { Plus, Store } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";

type CreateStoreDialogProps = {
    organizationId: string;
    trigger?: React.ReactElement;
};

const defaultValues: CreateStoreJSON = { name: "", address: "" };

const CreateStoreDialog = ({ organizationId, trigger }: CreateStoreDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm<CreateStoreJSON>({
        resolver: zodResolver(CreateStoreSchema),
        defaultValues,
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateStoreJSON) => createStore(organizationId, data),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) });
                form.reset(defaultValues);
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to create store");
        },
    });

    const onSubmit: SubmitHandler<CreateStoreJSON> = (values) => {
        createMutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" className="rounded-full">
                            <Plus className="mr-2 size-4" />
                            Add store
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Store className="size-5" />
                    </div>
                    <DialogTitle className="text-center text-lg font-semibold">Create store</DialogTitle>
                    <DialogDescription className="text-center">
                        Add a branch or outlet. Each store can have its own POS devices.
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
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? "Creating..." : "Create store"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateStoreDialog;
