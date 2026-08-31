import { useEffect, useMemo, useState, type ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import {
    createDraftPurchase,
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
    isVendorItemSelectableForDraftPurchase,
    isVendorSelectableForDraftPurchase,
    type CreateDraftPurchaseJSON,
    type PurchaseDTO,
    type PurchaseLineInputJSON,
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
import { Pencil, Plus, PlusCircle, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatCurrency } from "@/lib/format";
import { organizationKeys, purchaseKeys, unitKeys, vendorKeys } from "@/lib/query-keys";

type UpsertPurchaseDialogProps = {
    organizationId: string;
    purchase?: PurchaseDTO;
    copyFrom?: PurchaseDTO;
    trigger?: ReactElement;
    onRecorded?: (purchase: PurchaseDTO) => void;
};

const decimalAmountPattern = /^-?\d+(\.\d{0,2})?$/;
const quantityPattern = /^\d+(\.\d{0,3})?$/;

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
    adjustment: z
        .string()
        .refine((value) => value.length === 0 || decimalAmountPattern.test(value), "Use at most two decimal places")
        .transform((value) => (value.length === 0 || value === "-" ? 0 : Number(value))),
    lines: z.array(lineFormSchema),
});

type UpsertPurchaseFormInput = z.input<typeof UpsertPurchaseFormSchema>;

const emptyLine = { vendorItemId: "", quantity: "1", agreedUnitPrice: "" };

const defaultValues = (): UpsertPurchaseFormInput => ({
    storeId: "",
    vendorId: "",
    effectiveDate: calendarDateInTimeZone(),
    invoiceReference: "",
    notes: "",
    adjustment: "0",
    lines: [],
});

const toFormValues = (purchase: PurchaseDTO): UpsertPurchaseFormInput => ({
    storeId: purchase.storeId,
    vendorId: purchase.vendorId,
    effectiveDate: purchase.effectiveDate,
    invoiceReference: purchase.invoiceReference ?? "",
    notes: purchase.notes ?? "",
    adjustment: String(purchase.adjustment),
    lines: purchase.lines.map((line) => ({
        vendorItemId: line.vendorItemId,
        quantity: String(line.quantity),
        agreedUnitPrice: String(line.agreedUnitPrice),
    })),
});

const toLinePayload = (lines: z.output<typeof UpsertPurchaseFormSchema>["lines"]): PurchaseLineInputJSON[] =>
    lines.map((line) => ({
        vendorItemId: line.vendorItemId,
        quantity: line.quantity,
        agreedUnitPrice: line.agreedUnitPrice,
    }));

const UpsertPurchaseDialog = ({
    organizationId,
    purchase,
    copyFrom,
    trigger,
    onRecorded,
}: UpsertPurchaseDialogProps) => {
    const [open, setOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<"draft" | "record" | null>(null);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(purchase);
    const sourcePurchase = purchase ?? copyFrom;

    const form = useForm<UpsertPurchaseFormInput, unknown, z.output<typeof UpsertPurchaseFormSchema>>({
        resolver: zodResolver(UpsertPurchaseFormSchema),
        defaultValues: defaultValues(),
    });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
    const vendorId = useWatch({ control: form.control, name: "vendorId" });
    const watchedLines = useWatch({ control: form.control, name: "lines" }) ?? [];
    const watchedAdjustment = useWatch({ control: form.control, name: "adjustment" }) ?? "0";

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

    const stores =
        organizationQuery.data?.status === "success"
            ? organizationQuery.data.data?.organization.stores ?? []
            : [];
    const vendors = vendorsQuery.data?.status === "success" ? vendorsQuery.data.data?.vendors ?? [] : [];
    const vendorItems =
        vendorItemsQuery.data?.status === "success" ? vendorItemsQuery.data.data?.vendorItems ?? [] : [];
    const units = unitsQuery.data?.status === "success" ? unitsQuery.data.data?.units ?? [] : [];
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

    useEffect(() => {
        if (!open) {
            form.reset(sourcePurchase ? toFormValues(sourcePurchase) : defaultValues());
            setPendingAction(null);
        }
    }, [form, open, sourcePurchase]);

    const previewTotals = useMemo(() => {
        const parsedLines = watchedLines.flatMap((line) => {
            const quantity = Number(line.quantity);
            const agreedUnitPrice = Number(line.agreedUnitPrice);
            if (!Number.isFinite(quantity) || !Number.isFinite(agreedUnitPrice) || quantity <= 0) {
                return [];
            }
            return [{ quantity, agreedUnitPrice }];
        });
        const adjustmentValue =
            watchedAdjustment === "" || watchedAdjustment === "-" ? 0 : Number(watchedAdjustment);
        return calculatePurchaseTotals(
            parsedLines,
            Number.isFinite(adjustmentValue) ? adjustmentValue : 0,
        );
    }, [watchedAdjustment, watchedLines]);

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

            if (!input.record) {
                return saved;
            }

            return recordPurchase(organizationId, saved.data.purchase.id);
        },
        onSuccess: (response, variables) => {
            if (response.status === "success" && response.data && "purchase" in response.data) {
                toast.success(response.message);
                void invalidatePurchases(response.data.purchase);
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
    ) => {
        setPendingAction(record ? "record" : "draft");
        saveMutation.mutate({ values, record });
    };

    const handleDraft: SubmitHandler<z.output<typeof UpsertPurchaseFormSchema>> = (values) => {
        onSubmit(values, false);
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
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
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
            <DialogContent className="sm:max-w-3xl">
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
                                <Input
                                    className="h-11 rounded-xl"
                                    inputMode="decimal"
                                    placeholder="Freight, discount, or rounding"
                                    {...form.register("adjustment", {
                                        onChange: (event) => {
                                            event.target.value = sanitizeTwoDecimalInput(event.target.value, true);
                                        },
                                    })}
                                />
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
                            {pendingAction === "record" ? "Recording..." : "Record purchase"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertPurchaseDialog;
