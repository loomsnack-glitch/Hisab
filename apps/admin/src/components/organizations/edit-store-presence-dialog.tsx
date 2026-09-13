import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { updateStore } from "@repo/services";
import { UpdateStoreSchema, type StoreDTO, type UpdateStoreJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Pencil, Star } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

type EditStorePresenceDialogProps = {
    organizationId: string;
    store: StoreDTO;
    trigger?: React.ReactElement;
};

type EditStoreFormInput = z.input<typeof UpdateStoreSchema>;

const getDefaultValues = (store: StoreDTO): UpdateStoreJSON => ({
    name: store.name,
    reviewPlatform: store.reviewPlatform ?? "",
    reviewLink: store.reviewLink ?? "",
    socialMediaName: store.socialMediaName ?? "",
    socialMediaLink: store.socialMediaLink ?? "",
});

const EditStorePresenceDialog = ({ organizationId, store, trigger }: EditStorePresenceDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm<EditStoreFormInput, unknown, UpdateStoreJSON>({
        resolver: zodResolver(UpdateStoreSchema),
        defaultValues: getDefaultValues(store),
    });

    useEffect(() => {
        if (open) {
            form.reset(getDefaultValues(store));
        }
    }, [form, open, store]);

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
            toast.error(error.message ?? "Failed to update reviews and social");
        },
    });

    const { AlertDialogComponent, interceptClose } = useUnsavedChanges({
        isDirty: open && form.formState.isDirty,
        onSave: async () => {
            let result = false;
            await form.handleSubmit(async (values) => {
                try {
                    const response = await updateMutation.mutateAsync({
                        name: store.name,
                        reviewPlatform: values.reviewPlatform,
                        reviewLink: values.reviewLink,
                        socialMediaName: values.socialMediaName,
                        socialMediaLink: values.socialMediaLink,
                    });
                    if (response.status === "success") {
                        result = true;
                    }
                } catch {
                    result = false;
                }
            })();
            return result;
        },
        onDiscard: () => {
            form.reset(getDefaultValues(store));
        },
    });

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            interceptClose(() => {
                setOpen(false);
                form.reset(getDefaultValues(store));
            });
        } else {
            setOpen(true);
        }
    };

    const onSubmit: SubmitHandler<UpdateStoreJSON> = (values) => {
        updateMutation.mutate({
            name: store.name,
            reviewPlatform: values.reviewPlatform,
            reviewLink: values.reviewLink,
            socialMediaName: values.socialMediaName,
            socialMediaLink: values.socialMediaLink,
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
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
                <DialogHeader icon={<Star className="size-5" />} title="Reviews and social" />

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.reviewPlatform}>
                        <FieldLabel>Review platform</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" maxLength={100} {...form.register("reviewPlatform")} />
                            <FieldError errors={[form.formState.errors.reviewPlatform]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.reviewLink}>
                        <FieldLabel>Review link</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" type="url" maxLength={2048} {...form.register("reviewLink")} />
                            <FieldError errors={[form.formState.errors.reviewLink]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.socialMediaName}>
                        <FieldLabel>Social name</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" maxLength={100} {...form.register("socialMediaName")} />
                            <FieldError errors={[form.formState.errors.socialMediaName]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.socialMediaLink}>
                        <FieldLabel>Social link</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" type="url" maxLength={2048} {...form.register("socialMediaLink")} />
                            <FieldError errors={[form.formState.errors.socialMediaLink]} />
                        </FieldContent>
                    </Field>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => handleOpenChange(false)}
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
                {AlertDialogComponent}
            </DialogContent>
        </Dialog>
    );
};

export default EditStorePresenceDialog;
