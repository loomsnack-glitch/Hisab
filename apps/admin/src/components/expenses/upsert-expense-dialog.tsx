import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import {
    createDraftExpense,
    getExpenseCategories,
    getMoneyAccounts,
    getOrganizationDetails,
    recordExpense,
    updateDraftExpense,
} from "@repo/services";
import {
    expenseCalendarDateInTimeZone,
    isExpenseCategorySelectableForDraftExpense,
    isMoneyAccountAvailableToStore,
    isMoneyAccountEligibleForOutgoingMethod,
    OUTGOING_PAYMENT_METHOD_LABELS,
    roundOutgoingPaymentMoney,
    TRACKED_OUTGOING_PAYMENT_METHODS,
    UNTRACKED_OUTGOING_PAYMENT_METHODS,
    type CreateDraftExpenseJSON,
    type CreateOutgoingPaymentJSON,
    type ExpenseDTO,
    type OutgoingPaymentMethod,
    type RecordExpenseJSON,
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
import { cn } from "@repo/ui/lib/utils";
import { Banknote, Pencil, Plus, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import {
    readExpenseFormPreferences,
    writeExpenseFormPreferences,
    type ExpenseFormPreferences,
    type ExpenseSettlementMode,
} from "@/lib/expense-form-preferences";
import { formatCurrency } from "@/lib/format";
import { expenseCategoryKeys, expenseKeys, moneyAccountKeys, organizationKeys } from "@/lib/query-keys";

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

const settlementOptions: Array<{
    value: ExpenseSettlementMode;
    label: string;
    activeClassName: string;
}> = [
    { value: "full", label: "Paid", activeClassName: "bg-emerald-500 text-white" },
    { value: "partial", label: "Partial", activeClassName: "bg-sky-500 text-white" },
    { value: "due", label: "Due", activeClassName: "bg-amber-500 text-white" },
];

const defaultSettlement = (): {
    mode: ExpenseSettlementMode;
    paymentMethod: OutgoingPaymentMethod;
    partialAmount: string;
    moneyAccountId: string | null;
} => ({
    mode: "due",
    paymentMethod: "cash",
    partialAmount: "",
    moneyAccountId: null,
});

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
    const [settlementMode, setSettlementMode] = useState<ExpenseSettlementMode>("due");
    const [paymentMethod, setPaymentMethod] = useState<OutgoingPaymentMethod>("cash");
    const [partialAmount, setPartialAmount] = useState("");
    const [moneyAccountId, setMoneyAccountId] = useState<string | null>(null);
    const [settlementError, setSettlementError] = useState<string | null>(null);
    const pendingPreferencesRef = useRef<ExpenseFormPreferences | null>(null);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(expense);
    const sourceExpense = expense ?? copyFrom;

    const form = useForm<UpsertExpenseFormInput, unknown, z.output<typeof UpsertExpenseFormSchema>>({
        resolver: zodResolver(UpsertExpenseFormSchema),
        defaultValues: defaultValues(),
    });
    const storeId = useWatch({ control: form.control, name: "storeId" });
    const watchedTotal = useWatch({ control: form.control, name: "total" }) ?? "";

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
    const moneyAccountsQuery = useQuery({
        queryKey: moneyAccountKeys.list(organizationId),
        queryFn: () => getMoneyAccounts(organizationId),
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
    const moneyAccounts =
        moneyAccountsQuery.data?.status === "success"
            ? moneyAccountsQuery.data.data?.moneyAccounts ?? []
            : [];
    const selectedStore = stores.find((store) => store.id === storeId);
    const trackingActive = Boolean(selectedStore?.moneyAccountTrackingEnabled);
    const selectableCategories = categories.filter(
        (category) =>
            isExpenseCategorySelectableForDraftExpense(category)
            || category.id === sourceExpense?.expenseCategoryId,
    );

    const paymentMethods = trackingActive
        ? TRACKED_OUTGOING_PAYMENT_METHODS
        : UNTRACKED_OUTGOING_PAYMENT_METHODS;
    const eligibleAccounts = useMemo(() => {
        if (!trackingActive || !storeId) {
            return [];
        }
        return moneyAccounts.filter(
            (account) =>
                isMoneyAccountAvailableToStore(account, storeId) &&
                isMoneyAccountEligibleForOutgoingMethod(account, paymentMethod),
        );
    }, [moneyAccounts, paymentMethod, storeId, trackingActive]);
    const accountOptions = eligibleAccounts.map((account) => ({
        label: `${account.name} · ${formatCurrency(account.balance)}`,
        value: account.id,
    }));
    const selectedAccount = eligibleAccounts.find((account) => account.id === moneyAccountId);

    const applySettlementPreferences = (preferences: ExpenseFormPreferences | null) => {
        const reset = defaultSettlement();
        setSettlementMode(preferences?.settlementMode ?? reset.mode);
        setPaymentMethod(preferences?.paymentMethod ?? reset.paymentMethod);
        setPartialAmount(reset.partialAmount);
        setMoneyAccountId(preferences?.moneyAccountId ?? reset.moneyAccountId);
    };

    const buildExpenseFormPreferences = (
        values: Pick<UpsertExpenseFormInput, "storeId">,
        payment?: CreateOutgoingPaymentJSON,
    ): ExpenseFormPreferences => ({
        storeId: values.storeId || undefined,
        settlementMode,
        paymentMethod,
        moneyAccountId: payment?.moneyAccountId ?? (trackingActive ? moneyAccountId : null),
    });

    const persistExpenseFormPreferences = (
        values: Pick<UpsertExpenseFormInput, "storeId">,
        payment?: CreateOutgoingPaymentJSON,
    ) => {
        if (expense) {
            return;
        }
        const next = buildExpenseFormPreferences(values, payment);
        const existing = readExpenseFormPreferences(organizationId);
        writeExpenseFormPreferences(organizationId, {
            ...existing,
            ...next,
            storeId: next.storeId ?? existing?.storeId,
            moneyAccountId:
                next.moneyAccountId !== undefined ? next.moneyAccountId : existing?.moneyAccountId,
        });
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            persistExpenseFormPreferences(form.getValues());
            pendingPreferencesRef.current = null;
        }
        setOpen(nextOpen);
    };

    useEffect(() => {
        if (!open) {
            setPendingAction(null);
            setSettlementError(null);
            return;
        }

        if (expense) {
            pendingPreferencesRef.current = null;
            form.reset(toFormValues(expense));
            applySettlementPreferences(null);
            return;
        }

        const preferences = readExpenseFormPreferences(organizationId);
        pendingPreferencesRef.current = preferences;

        if (copyFrom) {
            form.reset(toFormValues(copyFrom));
            applySettlementPreferences(preferences);
            return;
        }

        const values = defaultValues();
        if (preferences?.storeId) {
            values.storeId = preferences.storeId;
        }
        form.reset(values);
        applySettlementPreferences(preferences);
    }, [copyFrom, form, open, organizationId, expense]);

    useEffect(() => {
        if (!open || expense || copyFrom || stores.length === 0) {
            return;
        }

        const preferences = pendingPreferencesRef.current;
        const currentStoreId = form.getValues("storeId");

        if (currentStoreId) {
            if (!stores.some((store) => store.id === currentStoreId)) {
                form.setValue("storeId", "");
            }
            return;
        }

        if (preferences?.storeId && stores.some((store) => store.id === preferences.storeId)) {
            form.setValue("storeId", preferences.storeId);
        }
    }, [copyFrom, form, open, expense, stores]);

    useEffect(() => {
        if (!open || expense || !pendingPreferencesRef.current?.moneyAccountId) {
            return;
        }
        if (eligibleAccounts.length === 0) {
            return;
        }

        const preferredAccountId = pendingPreferencesRef.current.moneyAccountId;
        if (
            preferredAccountId &&
            eligibleAccounts.some((account) => account.id === preferredAccountId)
        ) {
            setMoneyAccountId(preferredAccountId);
        }
    }, [eligibleAccounts, expense, open]);

    useEffect(() => {
        if (!open) {
            return;
        }
        if (!trackingActive && (paymentMethod === "bank_transfer" || paymentMethod === "other")) {
            setPaymentMethod("cash");
        }
    }, [open, paymentMethod, trackingActive]);

    useEffect(() => {
        if (!open || expense || !moneyAccountId || eligibleAccounts.length === 0) {
            return;
        }
        if (!eligibleAccounts.some((account) => account.id === moneyAccountId)) {
            setMoneyAccountId(null);
        }
    }, [eligibleAccounts, expense, moneyAccountId, open]);

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
            payment?: CreateOutgoingPaymentJSON;
            preferences: ExpenseFormPreferences;
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

            writeExpenseFormPreferences(organizationId, input.preferences);

            if (!input.record) {
                return saved;
            }

            const recordPayload: RecordExpenseJSON = input.payment
                ? { payment: input.payment }
                : {};
            return recordExpense(organizationId, saved.data.expense.id, recordPayload);
        },
        onSuccess: (response, variables) => {
            if (response.status === "success" && response.data && "expense" in response.data) {
                writeExpenseFormPreferences(organizationId, variables.preferences);
                toast.success(response.message);
                void invalidateExpenses(response.data.expense);
                if (variables.payment) {
                    void queryClient.invalidateQueries({ queryKey: moneyAccountKeys.all });
                }
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
        payment?: CreateOutgoingPaymentJSON,
    ) => {
        setPendingAction(record ? "record" : "draft");
        saveMutation.mutate({
            values,
            record,
            payment,
            preferences: buildExpenseFormPreferences(values, payment),
        });
    };

    const handleDraft: SubmitHandler<z.output<typeof UpsertExpenseFormSchema>> = (values) => {
        setSettlementError(null);
        onSubmit(values, false);
    };

    const resolveRecordPayment = (): CreateOutgoingPaymentJSON | undefined | "invalid" => {
        if (settlementMode === "due") {
            return undefined;
        }

        const total = roundOutgoingPaymentMoney(Number(watchedTotal));
        if (!Number.isFinite(total) || total <= 0) {
            setSettlementError("Enter a payable total before recording a payment.");
            return "invalid";
        }

        let amount = total;
        if (settlementMode === "partial") {
            const parsedAmount = roundOutgoingPaymentMoney(Number(partialAmount));
            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                setSettlementError("Enter the amount being paid now.");
                return "invalid";
            }
            if (parsedAmount > total) {
                setSettlementError("Payment cannot exceed the Expense total.");
                return "invalid";
            }
            if (parsedAmount === total) {
                setSettlementError('Select "Paid" when settling the entire Expense total.');
                return "invalid";
            }
            amount = parsedAmount;
        }

        if (trackingActive && !moneyAccountId) {
            setSettlementError("Select an eligible Money Account for this Outgoing Payment.");
            return "invalid";
        }

        return {
            amount,
            paymentMethod,
            moneyAccountId: trackingActive ? moneyAccountId : null,
        };
    };

    const handleRecord: SubmitHandler<z.output<typeof UpsertExpenseFormSchema>> = (values) => {
        const payment = resolveRecordPayment();
        if (payment === "invalid") {
            return;
        }
        setSettlementError(null);
        onSubmit(values, true, payment);
    };

    const storeOptions = stores.map((store) => ({ label: store.name, value: store.id }));
    const categoryOptions = selectableCategories.map((category) => ({
        label: category.status === "inactive" ? `${category.name} (inactive)` : category.name,
        value: category.id,
    }));

    return (
        <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
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
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
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

                    <section className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                            <span>Settlement</span>
                            <span className="text-muted-foreground">
                                {settlementMode === "full"
                                    ? "Paid in full"
                                    : settlementMode === "partial"
                                      ? "Balance remains"
                                      : "Pay later"}
                            </span>
                        </div>
                        <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                            <div className="grid grid-cols-3 gap-1">
                                {settlementOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setSettlementMode(option.value);
                                            setSettlementError(null);
                                        }}
                                        aria-pressed={settlementMode === option.value}
                                        className={cn(
                                            "h-8 min-h-8 rounded-lg px-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                            settlementMode === option.value
                                                ? `${option.activeClassName} shadow-md`
                                                : "border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            {settlementMode !== "due" ? (
                                <div className="space-y-2 border-t border-border/50 pt-2">
                                    <p className="text-xs font-semibold text-foreground">Payment method</p>
                                    <div className="grid grid-cols-3 gap-1">
                                        {paymentMethods.map((method) => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => {
                                                    setPaymentMethod(method);
                                                    setSettlementError(null);
                                                }}
                                                aria-pressed={paymentMethod === method}
                                                className={cn(
                                                    "h-8 min-h-8 rounded-lg px-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                    paymentMethod === method
                                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                                        : "border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                {OUTGOING_PAYMENT_METHOD_LABELS[method]}
                                            </button>
                                        ))}
                                    </div>

                                    {trackingActive ? (
                                        <Field>
                                            <FieldLabel required>Money Account</FieldLabel>
                                            <FieldContent>
                                                <ReactSelect
                                                    options={accountOptions}
                                                    value={
                                                        accountOptions.find((option) => option.value === moneyAccountId) ??
                                                        null
                                                    }
                                                    onChange={(option) => {
                                                        setMoneyAccountId(option?.value ?? null);
                                                        setSettlementError(null);
                                                    }}
                                                    placeholder="Select an eligible account"
                                                    classNames={{ control: () => "!min-h-11 rounded-xl" }}
                                                />
                                                {selectedAccount ? (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Available {formatCurrency(selectedAccount.balance)}
                                                    </p>
                                                ) : null}
                                                {eligibleAccounts.length === 0 ? (
                                                    <p className="text-[11px] text-muted-foreground">
                                                        No active eligible Money Account is available to this Store for the selected method.
                                                    </p>
                                                ) : null}
                                            </FieldContent>
                                        </Field>
                                    ) : (
                                        <p className="text-[11px] text-muted-foreground">
                                            Money Account Tracking is off for this Store. Cash, UPI, and Card payments will not change a Money Account Balance.
                                        </p>
                                    )}
                                </div>
                            ) : null}

                            {settlementMode === "partial" ? (
                                <Input
                                    inputMode="decimal"
                                    className="h-8 rounded-lg bg-background/60 text-sm"
                                    placeholder="Amount paid now"
                                    value={partialAmount}
                                    onChange={(event) => {
                                        event.target.value = sanitizeTwoDecimalInput(event.target.value);
                                        setPartialAmount(event.target.value);
                                        setSettlementError(null);
                                    }}
                                    aria-label="Amount paid now"
                                />
                            ) : null}

                            {settlementError ? (
                                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                                    {settlementError}
                                </p>
                            ) : null}
                        </div>
                    </section>

                    <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => handleOpenChange(false)}>
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
                            onClick={form.handleSubmit(handleRecord)}
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
