import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createExpenseCategory, updateExpenseCategory } from "@repo/services";
import {
    CreateExpenseCategorySchema,
    ExpenseCategoryStatusSchema,
    type CreateExpenseCategoryJSON,
    type ExpenseCategoryDTO,
    type ExpenseCategoryStatus,
} from "@repo/types";
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
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Pencil, Plus, Tags } from "lucide-react";
import { toast } from "sonner";

import { expenseCategoryKeys } from "@/lib/query-keys";

type UpsertExpenseCategoryDialogProps = {
    organizationId: string;
    expenseCategory?: ExpenseCategoryDTO;
    trigger?: React.ReactElement;
};

const defaultValues: CreateExpenseCategoryJSON = {
    name: "",
    status: "active",
};

const statusSelectOptions = ExpenseCategoryStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const UpsertExpenseCategoryDialog = ({
    organizationId,
    expenseCategory,
    trigger,
}: UpsertExpenseCategoryDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(expenseCategory);
    const isPredefined = expenseCategory?.kind === "predefined";

    const form = useForm<CreateExpenseCategoryJSON>({
        resolver: zodResolver(CreateExpenseCategorySchema),
        defaultValues,
    });

    useEffect(() => {
        if (!open) {
            form.reset(
                expenseCategory
                    ? { name: expenseCategory.name, status: expenseCategory.status }
                    : defaultValues,
            );
        }
    }, [form, open, expenseCategory]);

    const mutation = useMutation({
        mutationFn: (data: CreateExpenseCategoryJSON) =>
            expenseCategory
                ? updateExpenseCategory(
                    organizationId,
                    expenseCategory.id,
                    isPredefined
                        ? { status: data.status }
                        : { name: data.name, status: data.status },
                )
                : createExpenseCategory(organizationId, {
                    name: data.name,
                    status: data.status,
                }),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.list(organizationId) });
                setOpen(false);
                form.reset(defaultValues);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? `Failed to ${isEditMode ? "update" : "create"} Expense Category`);
        },
    });

    const onSubmit: SubmitHandler<CreateExpenseCategoryJSON> = (values) => {
        mutation.mutate({
            name: values.name.trim(),
            status: (values.status ?? "active") as ExpenseCategoryStatus,
        });
    };

    const title = isEditMode
        ? isPredefined
            ? "Edit standard category"
            : "Edit custom category"
        : "Create custom category";

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full">
                            {isEditMode ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                            {isEditMode ? "Edit" : "Add category"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader icon={<Tags className="size-5" />} title={title} />

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Category name</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                placeholder="e.g. Packaging"
                                readOnly={isPredefined}
                                disabled={isPredefined}
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                            {isPredefined ? (
                                <p className="text-xs text-muted-foreground">
                                    Standard Expense Categories supplied by Hisab cannot be renamed.
                                </p>
                            ) : null}
                        </FieldContent>
                    </Field>

                    {isEditMode && (
                        <Controller
                            control={form.control}
                            name="status"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Availability</FieldLabel>
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

export default UpsertExpenseCategoryDialog;
