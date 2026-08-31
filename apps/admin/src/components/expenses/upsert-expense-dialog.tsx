import { useEffect, useState, type ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import {
    createDraftExpense,
    getExpenseCategories,
    getOrganizationDetails,
    recordExpense,
    updateDraftExpense,
} from "@repo/services";
import {
    expenseCalendarDateInTimeZone,
    isExpenseCategorySelectableForDraftExpense,
    type CreateDraftExpenseJSON,
    type ExpenseDTO,
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
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Banknote, Pencil, Plus, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { expenseCategoryKeys, expenseKeys, organizationKeys } from "@/lib/query-keys";

type UpsertExpenseDialogProps = {
    organizationId: string;
    expense?: ExpenseDTO;
    copyFrom?: ExpenseDTO;
    trigger?: ReactElement;
    onRecorded?: (expense: ExpenseDTO) => void;
};

const decimalAmountPattern = /^\d+(\.\d{0,2})?$/;

const sanitizeTwoDecimalInput = (value: string) => {
    const digitsAndDot = value.replace(/[^\d.]/g, "");
    const dotIndex = digitsAndDot.indexOf(".");
    if (dotIndex === -1) {
        return digitsAndDot;
    }
    return digitsAndDot.slice(0, dotIndex + 1) + digitsAndDot.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
};

const UpsertExpenseFormSchema = z.object({
    storeId: z.uuid("Select a Store"),
    expenseCategoryId: z.uuid("Select an Expense Category"),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be YYYY-MM-DD"),
    invoiceReference: z.string(),
    notes: z.string(),
    total: z
        .string()
        .refine((value) => value.length > 0, "Payable total is required")
        .refine((value) => decimalAmountPattern.test(value), "Use at most two decimal places")
        .transform((value) => Number(value))
        .pipe(z.number().gt(0, "Payable total must be greater than 0")),
});

type UpsertExpenseFormInput = z.input<typeof UpsertExpenseFormSchema>;

const defaultValues = (): UpsertExpenseFormInput => ({
    storeId: "",
    expenseCategoryId: "",
    effectiveDate: expenseCalendarDateInTimeZone(),
    invoiceReference: "",
    notes: "",
    total: "",
});

const toFormValues = (expense: ExpenseDTO): UpsertExpenseFormInput => ({
    storeId: expense.storeId,
    expenseCategoryId: expense.expenseCategoryId,
    effectiveDate: expense.effectiveDate,
    invoiceReference: expense.invoiceReference ?? "",
    notes: expense.notes ?? "",
    total: String(expense.total),
});

const UpsertExpenseDialog = ({
    organizationId,
    expense,
    copyFrom,
    trigger,
    onRecorded,
}: UpsertExpenseDialogProps) => {
    const [open, setOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<"draft" | "record" | null>(null);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(expense);
    const sourceExpense = expense ?? copyFrom;

    const form = useForm<UpsertExpenseFormInput, unknown, z.output<typeof UpsertExpenseFormSchema>>({
        resolver: zodResolver(UpsertExpenseFormSchema),
        defaultValues: defaultValues(),
    });

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: open && Boolean(organizationId),
    });
    const categoriesQuery = useQuery({
        queryKey: expenseCategoryKeys.list(organizationId),
        queryFn: () => getExpenseCategories(organizationId),
        enabled: open && Boolean(organizationId),
    });

    const stores =
        organizationQuery.data?.status === "success"
            ? organizationQuery.data.data?.organization.stores ?? []
            : [];
    const categories =
        categoriesQuery.data?.status === "success"
            ? categoriesQuery.data.data?.expenseCategories ?? []
            : [];
    const selectableCategories = categories.filter(
        (category) =>
            isExpenseCategorySelectableForDraftExpense(category)
            || category.id === sourceExpense?.expenseCategoryId,
    );

    useEffect(() => {
        if (!open) {
            form.reset(sourceExpense ? toFormValues(sourceExpense) : defaultValues());
            setPendingAction(null);
        }
    }, [form, open, sourceExpense]);

    const invalidateExpenses = async (saved?: ExpenseDTO) => {
        await queryClient.invalidateQueries({ queryKey: expenseKeys.list(organizationId) });
        if (saved) {
            queryClient.setQueryData(expenseKeys.detail(organizationId, saved.id), {
                status: "success",
                data: { expense: saved },
                message: "Expense fetched successfully",
                code: 200,
            });
            await queryClient.invalidateQueries({
                queryKey: expenseKeys.detail(organizationId, saved.id),
            });
        }
    };

    const saveMutation = useMutation({
        mutationFn: async (input: {
            values: z.output<typeof UpsertExpenseFormSchema>;
            record: boolean;
        }) => {
            const payload: CreateDraftExpenseJSON = {
                storeId: input.values.storeId,
                expenseCategoryId: input.values.expenseCategoryId,
                effectiveDate: input.values.effectiveDate,
                invoiceReference: input.values.invoiceReference,
                notes: input.values.notes,
                total: input.values.total,
            };

            const saved = expense
                ? await updateDraftExpense(organizationId, expense.id, payload)
                : await createDraftExpense(organizationId, payload);

            if (saved.status !== "success" || !saved.data?.expense) {
                return saved;
            }

            if (!input.record) {
                return saved;
            }

            return recordExpense(organizationId, saved.data.expense.id);
        },
        onSuccess: (response, variables) => {
            if (response.status === "success" && response.data && "expense" in response.data) {
                toast.success(response.message);
                void invalidateExpenses(response.data.expense);
                if (variables.record || copyFrom) {
                    onRecorded?.(response.data.expense);
                }
                setOpen(false);
                form.reset(defaultValues());
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to save Expense");
        },
        onSettled: () => {
            setPendingAction(null);
        },
    });

    const onSubmit = (
        values: z.output<typeof UpsertExpenseFormSchema>,
        record: boolean,
    ) => {
        setPendingAction(record ? "record" : "draft");
        saveMutation.mutate({ values, record });
    };

    const handleDraft: SubmitHandler<z.output<typeof UpsertExpenseFormSchema>> = (values) => {
        onSubmit(values, false);
    };

    const storeOptions = stores.map((store) => ({ label: store.name, value: store.id }));
    const categoryOptions = selectableCategories.map((category) => ({
        label: category.status === "inactive" ? `${category.name} (inactive)` : category.name,
        value: category.id,
    }));

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full">
                            {isEditMode ? <Pencil className="size-4" /> : copyFrom ? <PlusCircle className="size-4" /> : <Plus className="size-4" />}
                            {isEditMode ? "Edit draft" : copyFrom ? "Create replacement" : "Add expense"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-xl">
                <DialogHeader
                    icon={<Banknote className="size-5" />}
                    title={
                        isEditMode
                            ? "Edit Draft Expense"
                            : copyFrom
                              ? "Create replacement Expense"
                              : "Create Draft Expense"
                    }
                />

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(handleDraft)}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={form.control}
                            name="storeId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Store</FieldLabel>
                                    <FieldContent>
                                        <ReactSelect
                                            options={storeOptions}
                                            value={storeOptions.find((option) => option.value === field.value) ?? null}
                                            onChange={(option) => field.onChange(option?.value ?? "")}
                                            placeholder="Select a Store"
                                            classNames={{ control: () => "!min-h-11 rounded-xl" }}
                                        />
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="expenseCategoryId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Expense Category</FieldLabel>
                                    <FieldContent>
                                        <ReactSelect
                                            options={categoryOptions}
                                            value={categoryOptions.find((option) => option.value === field.value) ?? null}
                                            onChange={(option) => field.onChange(option?.value ?? "")}
                                            placeholder="Select a category"
                                            classNames={{ control: () => "!min-h-11 rounded-xl" }}
                                        />
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field data-invalid={!!form.formState.errors.effectiveDate}>
                            <FieldLabel required>Effective date</FieldLabel>
                            <FieldContent>
                                <Input type="date" className="h-11 rounded-xl" {...form.register("effectiveDate")} />
                                <FieldError errors={[form.formState.errors.effectiveDate]} />
                            </FieldContent>
                        </Field>
                        <Field>
                            <FieldLabel>Invoice / reference</FieldLabel>
                            <FieldContent>
                                <Input className="h-11 rounded-xl" placeholder="Optional" {...form.register("invoiceReference")} />
                            </FieldContent>
                        </Field>
                    </div>

                    <Field data-invalid={!!form.formState.errors.total}>
                        <FieldLabel required>Payable total</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                inputMode="decimal"
                                placeholder="0.00"
                                {...form.register("total", {
                                    onChange: (event) => {
                                        event.target.value = sanitizeTwoDecimalInput(event.target.value);
                                    },
                                })}
                            />
                            <FieldError errors={[form.formState.errors.total]} />
                        </FieldContent>
                    </Field>

                    <Field>
                        <FieldLabel>Notes</FieldLabel>
                        <FieldContent>
                            <Textarea className="min-h-11 rounded-xl" rows={2} {...form.register("notes")} />
                        </FieldContent>
                    </Field>

                    <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="outline"
                            className="rounded-xl"
                            disabled={saveMutation.isPending}
                        >
                            {pendingAction === "draft" ? "Saving..." : "Save draft"}
                        </Button>
                        <Button
                            type="button"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={saveMutation.isPending}
                            onClick={form.handleSubmit((values) => onSubmit(values, true))}
                        >
                            {pendingAction === "record" ? "Recording..." : "Record expense"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertExpenseDialog;
