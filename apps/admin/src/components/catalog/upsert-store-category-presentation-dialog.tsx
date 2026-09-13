import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStoreCategoryPresentation } from "@repo/services";
import {
    CategoryStatusSchema,
    type CategoryStatus,
    type StoreCategoryPresentationResponseDTO,
} from "@repo/types";
import { z } from "zod";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Pencil, Tags } from "lucide-react";
import { toast } from "sonner";

import { catalogKeys } from "@/lib/query-keys";

const presentationFormSchema = z.object({
    status: CategoryStatusSchema,
});

type PresentationFormValues = z.infer<typeof presentationFormSchema>;

type UpsertStoreCategoryPresentationDialogProps = {
    organizationId: string;
    storeId: string;
    presentation: StoreCategoryPresentationResponseDTO;
    trigger?: React.ReactElement;
};

const statusSelectOptions = CategoryStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const storeStatusFromVisible = (visible: boolean): CategoryStatus => (visible ? "active" : "inactive");

const UpsertStoreCategoryPresentationDialog = ({
    organizationId,
    storeId,
    presentation,
    trigger,
}: UpsertStoreCategoryPresentationDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const form = useForm<PresentationFormValues>({
        resolver: zodResolver(presentationFormSchema),
        defaultValues: {
            status: storeStatusFromVisible(presentation.visible),
        },
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        form.reset({
            status: storeStatusFromVisible(presentation.visible),
        });
    }, [form, open, presentation.visible]);

    const mutation = useMutation({
        mutationFn: (status: CategoryStatus) =>
            updateStoreCategoryPresentation(organizationId, storeId, presentation.id, {
                visible: status === "active",
            }),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success(response.message);
            queryClient.invalidateQueries({
                queryKey: catalogKeys.storeCategoryPresentations(organizationId, storeId),
            });
            setOpen(false);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to update this category");
        },
    });

    const onSubmit: SubmitHandler<PresentationFormValues> = (values) => {
        mutation.mutate(values.status);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" size="sm" className="rounded-full">
                            <Pencil className="size-3" />
                            Edit
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader
                    icon={<Tags className="size-5" />}
                    title="Edit category"
                    subtitle={presentation.category.name}
                />
                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Controller
                        control={form.control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Status</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={statusSelectOptions}
                                        placeholder=""
                                        value={
                                            statusSelectOptions.find((option) => option.value === field.value) ?? null
                                        }
                                        onChange={(option) => field.onChange(option?.value ?? "active")}
                                        classNames={{
                                            control: () => "!min-h-11 rounded-xl",
                                        }}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Inactive hides this category from this store's POS menu.
                                    </p>
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertStoreCategoryPresentationDialog;
