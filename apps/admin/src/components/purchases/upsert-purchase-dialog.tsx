import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import {
    createDraftPurchase,
    getMoneyAccounts,
    getOrganizationDetails,
    getUnits,
    getVendorItems,
    getVendors,
    recordPurchase,
    updateDraftPurchase,
} from "@repo/services";
import {
    calculatePurchaseLineTotal,
    calculatePurchaseTotals,
    calendarDateInTimeZone,
    isMoneyAccountAvailableToStore,
    isMoneyAccountEligibleForOutgoingMethod,
    isVendorItemSelectableForDraftPurchase,
    isVendorSelectableForDraftPurchase,
    mergeSamePricePurchaseLines,
    OUTGOING_PAYMENT_METHOD_LABELS,
    roundOutgoingPaymentMoney,
    TRACKED_OUTGOING_PAYMENT_METHODS,
    UNTRACKED_OUTGOING_PAYMENT_METHODS,
    type CreateDraftPurchaseJSON,
    type CreateOutgoingPaymentJSON,
    type OutgoingPaymentMethod,
    type PurchaseDTO,
    type PurchaseLineInputJSON,
    type RecordPurchaseJSON,
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
import { Pencil, Plus, PlusCircle, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatCurrency } from "@/lib/format";
import {
    readPurchaseFormPreferences,
    writePurchaseFormPreferences,
    type PurchaseFormPreferences,
    type PurchaseSettlementMode,
} from "@/lib/purchase-form-preferences";
import { moneyAccountKeys, organizationKeys, purchaseKeys, unitKeys, vendorKeys } from "@/lib/query-keys";

type UpsertPurchaseDialogProps = {
    organizationId: string;
    purchase?: PurchaseDTO;
    copyFrom?: PurchaseDTO;
    trigger?: ReactElement;
    onRecorded?: (purchase: PurchaseDTO) => void;
};

const decimalAmountPattern = /^-?\d+(\.\d{0,2})?$/;
const positiveDecimalPattern = /^\d+(\.\d{0,2})?$/;
const quantityPattern = /^\d+(\.\d{0,3})?$/;

type PurchaseAdjustmentSign = "add" | "subtract";

const adjustmentSignOptions: Array<{
    value: PurchaseAdjustmentSign;
    label: string;
    activeClassName: string;
}> = [
    { value: "add", label: "+", activeClassName: "bg-emerald-500 text-white" },
    { value: "subtract", label: "-", activeClassName: "bg-rose-500 text-white" },
];

const parseAdjustmentAmount = (value: string): number => {
    if (!value) {
        return 0;
    }
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : 0;
};

const toSignedAdjustment = (amount: string, sign: PurchaseAdjustmentSign): number => {
    const parsed = parseAdjustmentAmount(amount);
    return sign === "subtract" ? -parsed : parsed;
};

const sanitizeTwoDecimalInput = (value: string, allowNegative = false) => {
    const negative = allowNegative && value.trim().startsWith("-");
    const digitsAndDot = value.replace(/[^\d.]/g, "");
    const dotIndex = digitsAndDot.indexOf(".");
    const sanitized =
        dotIndex === -1
            ? digitsAndDot
            : digitsAndDot.slice(0, dotIndex + 1) + digitsAndDot.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
    if (!sanitized) {
        return negative ? "-" : "";
    }
    return `${negative ? "-" : ""}${sanitized}`;
};

const sanitizeQuantityInput = (value: string) => {
    const digitsAndDot = value.replace(/[^\d.]/g, "");
    const dotIndex = digitsAndDot.indexOf(".");
    if (dotIndex === -1) {
        return digitsAndDot;
    }
    return digitsAndDot.slice(0, dotIndex + 1) + digitsAndDot.slice(dotIndex + 1).replace(/\./g, "").slice(0, 3);
};

const lineFormSchema = z.object({
    vendorItemId: z.uuid("Select a Vendor Item"),
    quantity: z
        .string()
        .refine((value) => value.length > 0, "Quantity is required")
        .refine((value) => quantityPattern.test(value), "Use at most three decimal places")
        .transform((value) => Number(value))
        .pipe(z.number().gt(0, "Quantity must be greater than 0")),
    agreedUnitPrice: z
        .string()
        .refine((value) => value.length > 0, "Agreed unit price is required")
        .refine((value) => decimalAmountPattern.test(value), "Use at most two decimal places")
        .transform((value) => Number(value))
        .pipe(z.number().min(0, "Agreed unit price must be 0 or more")),
});

const UpsertPurchaseFormSchema = z.object({
    storeId: z.uuid("Select a Store"),
    vendorId: z.uuid("Select a Vendor"),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be YYYY-MM-DD"),
    invoiceReference: z.string(),
    notes: z.string(),
    adjustmentSign: z.enum(["add", "subtract"]),
    adjustment: z
        .string()
        .refine(
            (value) => value.length === 0 || positiveDecimalPattern.test(value),
            "Use at most two decimal places",
        )
        .transform((value) => parseAdjustmentAmount(value)),
    lines: z.array(lineFormSchema),
})
    .transform((value) => ({
        ...value,
        adjustment: value.adjustmentSign === "subtract" ? -value.adjustment : value.adjustment,
    }));

type UpsertPurchaseFormInput = z.input<typeof UpsertPurchaseFormSchema>;

const emptyLine = { vendorItemId: "", quantity: "1", agreedUnitPrice: "" };

const settlementOptions: Array<{
    value: PurchaseSettlementMode;
    label: string;
    activeClassName: string;
}> = [
    { value: "full", label: "Paid", activeClassName: "bg-emerald-500 text-white" },
    { value: "partial", label: "Partial", activeClassName: "bg-sky-500 text-white" },
    { value: "due", label: "Due", activeClassName: "bg-amber-500 text-white" },
];

const defaultSettlement = (): {
    mode: PurchaseSettlementMode;
    paymentMethod: OutgoingPaymentMethod;
    partialAmount: string;
    moneyAccountId: string | null;
} => ({
    mode: "due",
    paymentMethod: "cash",
    partialAmount: "",
    moneyAccountId: null,
});

const defaultValues = (): UpsertPurchaseFormInput => ({
    storeId: "",
    vendorId: "",
    effectiveDate: calendarDateInTimeZone(),
    invoiceReference: "",
    notes: "",
    adjustmentSign: "add",
    adjustment: "0",
    lines: [],
});

const toFormValues = (purchase: PurchaseDTO): UpsertPurchaseFormInput => ({
    storeId: purchase.storeId,
    vendorId: purchase.vendorId,
    effectiveDate: purchase.effectiveDate,
    invoiceReference: purchase.invoiceReference ?? "",
    notes: purchase.notes ?? "",
    adjustmentSign: purchase.adjustment < 0 ? "subtract" : "add",
    adjustment: String(Math.abs(purchase.adjustment)),
    lines: purchase.lines.map((line) => ({
        vendorItemId: line.vendorItemId,
        quantity: String(line.quantity),
        agreedUnitPrice: String(line.agreedUnitPrice),
    })),
});

const toLinePayload = (lines: z.output<typeof UpsertPurchaseFormSchema>["lines"]): PurchaseLineInputJSON[] =>
    mergeSamePricePurchaseLines(
        lines.map((line) => ({
            vendorItemId: line.vendorItemId,
            quantity: line.quantity,
            agreedUnitPrice: line.agreedUnitPrice,
        })),
    );

const UpsertPurchaseDialog = ({
    organizationId,
    purchase,
    copyFrom,
    trigger,
    onRecorded,
}: UpsertPurchaseDialogProps) => {
    const [open, setOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<"draft" | "record" | null>(null);
    const [settlementMode, setSettlementMode] = useState<PurchaseSettlementMode>("due");
    const [paymentMethod, setPaymentMethod] = useState<OutgoingPaymentMethod>("cash");
    const [partialAmount, setPartialAmount] = useState("");
    const [moneyAccountId, setMoneyAccountId] = useState<string | null>(null);
    const [settlementError, setSettlementError] = useState<string | null>(null);
    const pendingPreferencesRef = useRef<PurchaseFormPreferences | null>(null);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(purchase);
    const sourcePurchase = purchase ?? copyFrom;

    const form = useForm<UpsertPurchaseFormInput, unknown, z.output<typeof UpsertPurchaseFormSchema>>({
        resolver: zodResolver(UpsertPurchaseFormSchema),
        defaultValues: defaultValues(),
    });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
    const vendorId = useWatch({ control: form.control, name: "vendorId" });
    const storeId = useWatch({ control: form.control, name: "storeId" });
    const watchedLines = useWatch({ control: form.control, name: "lines" }) ?? [];
    const watchedAdjustment = useWatch({ control: form.control, name: "adjustment" }) ?? "0";
    const watchedAdjustmentSign = useWatch({ control: form.control, name: "adjustmentSign" }) ?? "add";

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: open && Boolean(organizationId),
    });
    const vendorsQuery = useQuery({
        queryKey: vendorKeys.list(organizationId),
        queryFn: () => getVendors(organizationId),
        enabled: open && Boolean(organizationId),
    });
    const vendorItemsQuery = useQuery({
        queryKey: vendorKeys.items(organizationId),
        queryFn: () => getVendorItems(organizationId),
        enabled: open && Boolean(organizationId),
    });
    const unitsQuery = useQuery({
        queryKey: unitKeys.list(organizationId),
        queryFn: () => getUnits(organizationId),
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
    const vendors = vendorsQuery.data?.status === "success" ? vendorsQuery.data.data?.vendors ?? [] : [];
    const vendorItems =
        vendorItemsQuery.data?.status === "success" ? vendorItemsQuery.data.data?.vendorItems ?? [] : [];
    const units = unitsQuery.data?.status === "success" ? unitsQuery.data.data?.units ?? [] : [];
    const moneyAccounts =
        moneyAccountsQuery.data?.status === "success"
            ? moneyAccountsQuery.data.data?.moneyAccounts ?? []
            : [];
    const selectedStore = stores.find((store) => store.id === storeId);
    const trackingActive = Boolean(selectedStore?.moneyAccountTrackingEnabled);
    const selectedVendor = vendors.find((vendor) => vendor.id === vendorId);
    const unitLabelById = useMemo(
        () => new Map(units.map((unit) => [unit.id, unit.label])),
        [units],
    );

    const selectableVendors = vendors.filter(
        (vendor) =>
            isVendorSelectableForDraftPurchase(vendor) || vendor.id === sourcePurchase?.vendorId,
    );
    const selectableItems = vendorItems.filter((item) =>
        selectedVendor
            ? isVendorItemSelectableForDraftPurchase({
                vendorStatus: selectedVendor.status,
                itemStatus: item.status,
                vendorId: item.vendorId,
                selectedVendorId: selectedVendor.id,
            }) || watchedLines.some((line) => line.vendorItemId === item.id)
            : false,
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

    const applySettlementPreferences = (preferences: PurchaseFormPreferences | null) => {
        const reset = defaultSettlement();
        setSettlementMode(preferences?.settlementMode ?? reset.mode);
        setPaymentMethod(preferences?.paymentMethod ?? reset.paymentMethod);
        setPartialAmount(reset.partialAmount);
        setMoneyAccountId(preferences?.moneyAccountId ?? reset.moneyAccountId);
    };

    const buildPurchaseFormPreferences = (
        values: Pick<UpsertPurchaseFormInput, "storeId">,
        payment?: CreateOutgoingPaymentJSON,
    ): PurchaseFormPreferences => ({
        storeId: values.storeId || undefined,
        settlementMode,
        paymentMethod,
        moneyAccountId: payment?.moneyAccountId ?? (trackingActive ? moneyAccountId : null),
    });

    const persistPurchaseFormPreferences = (
        values: Pick<UpsertPurchaseFormInput, "storeId">,
        payment?: CreateOutgoingPaymentJSON,
    ) => {
        if (purchase) {
            return;
        }
        writePurchaseFormPreferences(
            organizationId,
            buildPurchaseFormPreferences(values, payment),
        );
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            persistPurchaseFormPreferences(form.getValues());
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

        if (purchase) {
            pendingPreferencesRef.current = null;
            form.reset(toFormValues(purchase));
            applySettlementPreferences(null);
            return;
        }

        const preferences = copyFrom ? readPurchaseFormPreferences(organizationId) : readPurchaseFormPreferences(organizationId);
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
    }, [copyFrom, form, open, organizationId, purchase]);

    useEffect(() => {
        if (!open || purchase || copyFrom || stores.length === 0) {
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
    }, [copyFrom, form, open, purchase, stores]);

    useEffect(() => {
        if (!open || purchase || !pendingPreferencesRef.current?.moneyAccountId) {
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
    }, [eligibleAccounts, open, purchase]);

    useEffect(() => {
        if (!open) {
            return;
        }
        if (!trackingActive && (paymentMethod === "bank_transfer" || paymentMethod === "other")) {
            setPaymentMethod("cash");
        }
    }, [open, paymentMethod, trackingActive]);

    useEffect(() => {
        if (!open || purchase || !moneyAccountId || eligibleAccounts.length === 0) {
            return;
        }
        if (!eligibleAccounts.some((account) => account.id === moneyAccountId)) {
            setMoneyAccountId(null);
        }
    }, [eligibleAccounts, moneyAccountId, open, purchase]);

    const previewTotals = useMemo(() => {
        const parsedLines = watchedLines.flatMap((line) => {
            const quantity = Number(line.quantity);
            const agreedUnitPrice = Number(line.agreedUnitPrice);
            if (!Number.isFinite(quantity) || !Number.isFinite(agreedUnitPrice) || quantity <= 0) {
                return [];
            }
            return [{ quantity, agreedUnitPrice }];
        });
        const adjustmentValue = toSignedAdjustment(
            watchedAdjustment,
            watchedAdjustmentSign === "subtract" ? "subtract" : "add",
        );
        return calculatePurchaseTotals(parsedLines, adjustmentValue);
    }, [watchedAdjustment, watchedAdjustmentSign, watchedLines]);

    const invalidatePurchases = async (saved?: PurchaseDTO) => {
        await queryClient.invalidateQueries({ queryKey: purchaseKeys.list(organizationId) });
        if (saved) {
            queryClient.setQueryData(purchaseKeys.detail(organizationId, saved.id), {
                status: "success",
                data: { purchase: saved },
                message: "Purchase fetched successfully",
                code: 200,
            });
            await queryClient.invalidateQueries({
                queryKey: purchaseKeys.detail(organizationId, saved.id),
            });
        }
    };

    const saveMutation = useMutation({
        mutationFn: async (input: {
            values: z.output<typeof UpsertPurchaseFormSchema>;
            record: boolean;
            payment?: CreateOutgoingPaymentJSON;
            preferences: PurchaseFormPreferences;
        }) => {
            const payload: CreateDraftPurchaseJSON = {
                storeId: input.values.storeId,
                vendorId: input.values.vendorId,
                effectiveDate: input.values.effectiveDate,
                invoiceReference: input.values.invoiceReference,
                notes: input.values.notes,
                adjustment: input.values.adjustment,
                lines: toLinePayload(input.values.lines),
            };

            const saved = purchase
                ? await updateDraftPurchase(organizationId, purchase.id, payload)
                : await createDraftPurchase(organizationId, payload);

            if (saved.status !== "success" || !saved.data?.purchase) {
                return saved;
            }

            writePurchaseFormPreferences(organizationId, input.preferences);

            if (!input.record) {
                return saved;
            }

            const recordPayload: RecordPurchaseJSON = input.payment
                ? { payment: input.payment }
                : {};
            return recordPurchase(organizationId, saved.data.purchase.id, recordPayload);
        },
        onSuccess: (response, variables) => {
            if (response.status === "success" && response.data && "purchase" in response.data) {
                writePurchaseFormPreferences(organizationId, variables.preferences);
                toast.success(response.message);
                void invalidatePurchases(response.data.purchase);
                if (variables.payment) {
                    void queryClient.invalidateQueries({ queryKey: moneyAccountKeys.all });
                }
                if (variables.record || copyFrom) {
                    onRecorded?.(response.data.purchase);
                }
                setOpen(false);
                form.reset(defaultValues());
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to save Purchase");
        },
        onSettled: () => {
            setPendingAction(null);
        },
    });

    const onSubmit = (
        values: z.output<typeof UpsertPurchaseFormSchema>,
        record: boolean,
        payment?: CreateOutgoingPaymentJSON,
    ) => {
        setPendingAction(record ? "record" : "draft");
        saveMutation.mutate({
            values,
            record,
            payment,
            preferences: buildPurchaseFormPreferences(values, payment),
        });
    };

    const handleDraft: SubmitHandler<z.output<typeof UpsertPurchaseFormSchema>> = (values) => {
        setSettlementError(null);
        onSubmit(values, false);
    };

    const resolveRecordPayment = (): CreateOutgoingPaymentJSON | undefined | "invalid" => {
        if (settlementMode === "due") {
            return undefined;
        }

        const total = roundOutgoingPaymentMoney(previewTotals.total);
        if (total <= 0) {
            setSettlementError("Add Purchase Lines before recording a payment.");
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
                setSettlementError("Payment cannot exceed the Purchase total.");
                return "invalid";
            }
            if (parsedAmount === total) {
                setSettlementError('Select "Paid" when settling the entire Purchase total.');
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

    const handleRecord: SubmitHandler<z.output<typeof UpsertPurchaseFormSchema>> = (values) => {
        const payment = resolveRecordPayment();
        if (payment === "invalid") {
            return;
        }
        setSettlementError(null);
        onSubmit(values, true, payment);
    };

    const storeOptions = stores.map((store) => ({ label: store.name, value: store.id }));
    const vendorOptions = selectableVendors.map((vendor) => ({
        label: vendor.status === "inactive" ? `${vendor.name} (inactive)` : vendor.name,
        value: vendor.id,
    }));
    const itemOptions = selectableItems.map((item) => ({
        label: `${item.name}${item.status === "inactive" ? " (inactive)" : ""}`,
        value: item.id,
        defaultPurchasePrice: item.defaultPurchasePrice,
        unitLabel: unitLabelById.get(item.unitId) ?? "",
    }));

    return (
        <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full">
                            {isEditMode ? <Pencil className="size-4" /> : copyFrom ? <PlusCircle className="size-4" /> : <Plus className="size-4" />}
                            {isEditMode ? "Edit draft" : copyFrom ? "Create replacement" : "Add purchase"}
                        </Button>
                    )
                }
            />
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader
                    icon={<ShoppingBag className="size-5" />}
                    title={
                        isEditMode
                            ? "Edit Draft Purchase"
                            : copyFrom
                              ? "Create replacement Purchase"
                              : "Create Draft Purchase"
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
                            name="vendorId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Vendor</FieldLabel>
                                    <FieldContent>
                                        <ReactSelect
                                            options={vendorOptions}
                                            value={vendorOptions.find((option) => option.value === field.value) ?? null}
                                            onChange={(option) => {
                                                field.onChange(option?.value ?? "");
                                                form.setValue("lines", []);
                                            }}
                                            placeholder="Select a Vendor"
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

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">Purchase Lines</p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                disabled={!vendorId}
                                onClick={() => append(emptyLine)}
                            >
                                <PlusCircle className="size-3.5" />
                                Add item
                            </Button>
                        </div>
                        {fields.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
                                Add active Vendor Items from the selected Vendor. Quantity and default purchase price are prefilled.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {fields.map((field, index) => {
                                    const line = watchedLines[index];
                                    const selectedItem = selectableItems.find((item) => item.id === line?.vendorItemId);
                                    const quantity = Number(line?.quantity);
                                    const agreedUnitPrice = Number(line?.agreedUnitPrice);
                                    const lineTotal =
                                        Number.isFinite(quantity) && Number.isFinite(agreedUnitPrice)
                                            ? calculatePurchaseLineTotal(quantity, agreedUnitPrice)
                                            : 0;

                                    return (
                                        <div
                                            key={field.id}
                                            className="grid gap-3 rounded-xl border border-border/60 bg-card/60 p-3 sm:grid-cols-[minmax(0,1.4fr)_5.5rem_7rem_auto_auto]"
                                        >
                                            <Controller
                                                control={form.control}
                                                name={`lines.${index}.vendorItemId`}
                                                render={({ field: itemField, fieldState }) => (
                                                    <Field data-invalid={fieldState.invalid}>
                                                        <FieldLabel required>Vendor Item</FieldLabel>
                                                        <FieldContent>
                                                            <ReactSelect
                                                                options={itemOptions}
                                                                value={
                                                                    itemOptions.find((option) => option.value === itemField.value) ?? null
                                                                }
                                                                onChange={(option) => {
                                                                    itemField.onChange(option?.value ?? "");
                                                                    if (option?.defaultPurchasePrice !== undefined) {
                                                                        form.setValue(
                                                                            `lines.${index}.agreedUnitPrice`,
                                                                            String(option.defaultPurchasePrice),
                                                                        );
                                                                    }
                                                                    if (!form.getValues(`lines.${index}.quantity`)) {
                                                                        form.setValue(`lines.${index}.quantity`, "1");
                                                                    }
                                                                }}
                                                                placeholder="Select item"
                                                                classNames={{ control: () => "!min-h-11 rounded-xl" }}
                                                            />
                                                            <FieldError errors={[fieldState.error]} />
                                                            {selectedItem ? (
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    Unit {unitLabelById.get(selectedItem.unitId) ?? "—"}
                                                                </p>
                                                            ) : null}
                                                        </FieldContent>
                                                    </Field>
                                                )}
                                            />
                                            <Field data-invalid={!!form.formState.errors.lines?.[index]?.quantity}>
                                                <FieldLabel required>Qty</FieldLabel>
                                                <FieldContent>
                                                    <Input
                                                        className="h-11 rounded-xl"
                                                        inputMode="decimal"
                                                        {...form.register(`lines.${index}.quantity`, {
                                                            onChange: (event) => {
                                                                event.target.value = sanitizeQuantityInput(event.target.value);
                                                            },
                                                        })}
                                                    />
                                                    <FieldError errors={[form.formState.errors.lines?.[index]?.quantity]} />
                                                </FieldContent>
                                            </Field>
                                            <Field data-invalid={!!form.formState.errors.lines?.[index]?.agreedUnitPrice}>
                                                <FieldLabel required>Unit price</FieldLabel>
                                                <FieldContent>
                                                    <Input
                                                        className="h-11 rounded-xl"
                                                        inputMode="decimal"
                                                        {...form.register(`lines.${index}.agreedUnitPrice`, {
                                                            onChange: (event) => {
                                                                event.target.value = sanitizeTwoDecimalInput(event.target.value);
                                                            },
                                                        })}
                                                    />
                                                    <FieldError errors={[form.formState.errors.lines?.[index]?.agreedUnitPrice]} />
                                                </FieldContent>
                                            </Field>
                                            <div className="flex flex-col justify-end pb-1">
                                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Line total</p>
                                                <p className="text-sm font-semibold tabular-nums">{formatCurrency(lineTotal)}</p>
                                            </div>
                                            <div className="flex items-end justify-end pb-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-full text-muted-foreground"
                                                    onClick={() => remove(index)}
                                                    aria-label="Remove line"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field data-invalid={!!form.formState.errors.adjustment}>
                            <FieldLabel>Purchase Adjustment</FieldLabel>
                            <FieldContent>
                                <div className="flex gap-2">
                                    <div className="grid w-20 shrink-0 grid-cols-2 gap-1">
                                        {adjustmentSignOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    form.setValue("adjustmentSign", option.value, {
                                                        shouldDirty: true,
                                                    });
                                                }}
                                                aria-pressed={watchedAdjustmentSign === option.value}
                                                className={cn(
                                                    "h-11 min-h-11 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                    watchedAdjustmentSign === option.value
                                                        ? `${option.activeClassName} shadow-md`
                                                        : "border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                    <Controller
                                        control={form.control}
                                        name="adjustment"
                                        render={({ field }) => (
                                            <Input
                                                {...field}
                                                className="h-11 rounded-xl"
                                                inputMode="decimal"
                                                placeholder="Freight, discount, or rounding"
                                                onChange={(event) => {
                                                    field.onChange(sanitizeTwoDecimalInput(event.target.value));
                                                }}
                                            />
                                        )}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Use + for extra charges and - for discounts.
                                </p>
                                <FieldError errors={[form.formState.errors.adjustment]} />
                            </FieldContent>
                        </Field>
                        <Field>
                            <FieldLabel>Notes</FieldLabel>
                            <FieldContent>
                                <Textarea className="min-h-11 rounded-xl" rows={2} {...form.register("notes")} />
                            </FieldContent>
                        </Field>
                    </div>

                    <div className="grid grid-cols-3 gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-3">
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Lines</p>
                            <p className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(previewTotals.linesTotal)}</p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Adjustment</p>
                            <p className="mt-1 text-sm font-semibold tabular-nums">
                                {formatCurrency(previewTotals.total - previewTotals.linesTotal)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Final total</p>
                            <p className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(previewTotals.total)}</p>
                        </div>
                    </div>

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
                            onClick={form.handleSubmit(handleRecord)}
                        >
                            {pendingAction === "record" ? "Recording..." : "Record purchase"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertPurchaseDialog;
