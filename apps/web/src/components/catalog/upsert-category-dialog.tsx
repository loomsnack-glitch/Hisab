import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createCategory, updateCategory } from "@repo/services";
import {
    CategoryStatusSchema,
    CreateCategorySchema,
    type CategoryDTO,
    type CategoryStatus,
    type CreateCategoryJSON,
} from "@repo/types";
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
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Pencil, Plus, Tags } from "lucide-react";
import { toast } from "sonner";

import { catalogKeys } from "@/lib/query-keys";

type UpsertCategoryDialogProps = {
    organizationId: string;
    category?: CategoryDTO;
    trigger?: React.ReactElement;
};

const defaultValues: CreateCategoryJSON = {
    name: "",
    status: "active",
};

const statusSelectOptions = CategoryStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const UpsertCategoryDialog = ({ organizationId, category, trigger }: UpsertCategoryDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(category);

    const form = useForm<CreateCategoryJSON>({
        resolver: zodResolver(CreateCategorySchema),
        defaultValues,
    });

    useEffect(() => {
        if (!open) {
            form.reset(category ? { name: category.name, status: category.status } : defaultValues);
        }
    }, [category, form, open]);

    const mutation = useMutation({
        mutationFn: (data: CreateCategoryJSON) =>
            category
                ? updateCategory(organizationId, category.id, data)
                : createCategory(organizationId, data),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: catalogKeys.categories(organizationId) });
                queryClient.invalidateQueries({ queryKey: catalogKeys.products(organizationId) });
                setOpen(false);
                form.reset(defaultValues);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? `Failed to ${isEditMode ? "update" : "create"} category`);
        },
    });

    const onSubmit: SubmitHandler<CreateCategoryJSON> = (values) => {
        mutation.mutate({
            name: values.name.trim(),
            status: (values.status ?? "active") as CategoryStatus,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full">
                            {isEditMode ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
                            {isEditMode ? "Edit category" : "Add category"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Tags className="size-5" />
                    </div>
                    <DialogTitle className="text-center text-lg font-semibold">
                        {isEditMode ? "Edit category" : "Create category"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {isEditMode
                            ? "Update the name or status. Products in this category stay linked."
                            : "Create a group to organize products — e.g. Burgers, Drinks."}
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Category name</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" placeholder="e.g. Beverages" {...form.register("name")} />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    {isEditMode && (
                        <Controller
                            control={form.control}
                            name="status"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Status</FieldLabel>
                                    <FieldContent>
                                        <ReactSelect
                                            options={statusSelectOptions}
                                            value={
                                                statusSelectOptions.find(
                                                    (option) => option.value === (field.value ?? "active"),
                                                ) ?? null
                                            }
                                            onChange={(option) => field.onChange(option?.value ?? "active")}
                                            classNames={{
                                                control: () => "!min-h-11 rounded-xl",
                                            }}
                                        />
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending
                                ? isEditMode ? "Saving..." : "Creating..."
                                : isEditMode ? "Save changes" : "Create category"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertCategoryDialog;
