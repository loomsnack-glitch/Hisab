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
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

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

    const storeName = form.watch("name");
    const address = form.watch("address");

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

    const { AlertDialogComponent, interceptClose } = useUnsavedChanges({
        isDirty: form.formState.isDirty,
        onSave: async () => {
            let result = false;
            await form.handleSubmit(async (values) => {
                try {
                    const response = await createMutation.mutateAsync(values);
                    if (response.status === "success") {
                        result = true;
                    }
                } catch (err) {
                    result = false;
                }
            })();
            return result;
        },
        onDiscard: () => {
            form.reset(defaultValues);
        },
    });

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            interceptClose(() => {
                setOpen(false);
                form.reset(defaultValues);
            });
        } else {
            setOpen(true);
        }
    };

    const onSubmit: SubmitHandler<CreateStoreJSON> = (values) => {
        createMutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <DialogContent className="relative overflow-hidden sm:max-w-md border-border/80 shadow-2xl backdrop-blur-md">
                <DialogHeader
                    icon={<Store className="size-5 transition-transform duration-300" />}
                    title="Add store"
                />

                <form className="space-y-6 pt-3" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <div className="flex items-center justify-between">
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5" required>
                                Store name
                            </FieldLabel>
                            <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                {(storeName ?? "").length}/255
                            </span>
                        </div>
                        <FieldContent className="space-y-4">
                            <Input
                                variant="ringShadow"
                                className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                maxLength={255}
                                placeholder="e.g. Main Street Branch"
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.address}>
                        <div className="flex items-center justify-between">
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-1.5">
                                Address <span className="font-normal text-muted-foreground/60 lowercase normal-case">(optional)</span>
                            </FieldLabel>
                            <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                {(address ?? "").length}/500
                            </span>
                        </div>
                        <FieldContent className="space-y-4">
                            <Textarea
                                className="min-h-20 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner resize-none"
                                maxLength={500}
                                placeholder="e.g. 123 Main St, City, State"
                                {...form.register("address")}
                            />
                            <FieldError errors={[form.formState.errors.address]} />
                        </FieldContent>
                    </Field>

                    <DialogFooter className="mt-6 border-t border-border/30">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl px-5 font-semibold text-muted-foreground hover:text-foreground transition-all duration-200"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200"
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? "Adding..." : "Add store"}
                        </Button>
                    </DialogFooter>
                </form>
                {AlertDialogComponent}
            </DialogContent>
        </Dialog>
    );
};

export default CreateStoreDialog;
