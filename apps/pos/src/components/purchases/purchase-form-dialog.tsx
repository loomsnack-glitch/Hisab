import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { CreatePurchaseSchema, type CreatePurchaseJSON, type PurchaseDetailDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { Plus, Trash2 } from "lucide-react";

import { formatCurrency } from "@/lib/format";

const numericInputSchema = (label: string) => z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => Number.isFinite(Number(value)), `Enter a valid ${label.toLowerCase()}`);

const PurchaseFormSchema = z.object({
    purchaseDate: z.string().date("Enter a valid purchase date"),
    supplierName: z.string().trim().min(1, "Supplier name is required").max(255, "Supplier name must be at most 255 characters"),
    invoiceNumber: z.string().trim().max(255, "Invoice number must be at most 255 characters"),
    notes: z.string().trim().max(2000, "Notes must be at most 2000 characters"),
    items: z.array(z.object({
        itemName: z.string().trim().min(1, "Item name is required").max(255, "Item name must be at most 255 characters"),
        description: z.string().trim().max(2000, "Description must be at most 2000 characters"),
        quantity: numericInputSchema("Quantity"),
        rate: numericInputSchema("Rate"),
    })).min(1, "Add at least one purchase item"),
}).transform((value) => ({
    ...value,
    items: value.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
    })),
})).pipe(CreatePurchaseSchema as never);

type PurchaseFormInput = z.input<typeof PurchaseFormSchema>;

type PurchaseFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase?: PurchaseDetailDTO | null;
    isLoading?: boolean;
    isPending?: boolean;
    onSubmit: (data: CreatePurchaseJSON) => Promise<void>;
};

type FormItem = PurchaseFormInput["items"][number];

const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const emptyItem = (): FormItem => ({ itemName: "", description: "", quantity: "1", rate: "" });

const PurchaseFormDialog = ({ open, onOpenChange, purchase, isLoading = false, isPending = false, onSubmit }: PurchaseFormDialogProps) => {
    const isEdit = Boolean(purchase);
    const form = useForm<PurchaseFormInput, unknown, CreatePurchaseJSON>({
        resolver: zodResolver(PurchaseFormSchema),
        defaultValues: {
            purchaseDate: getToday(),
            supplierName: "",
            invoiceNumber: "",
            notes: "",
            items: [emptyItem()],
        },
    });
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
    const watchedItems = useWatch({ control: form.control, name: "items" }) ?? [];

    useEffect(() => {
        if (!open) return;
        form.reset({
            purchaseDate: purchase?.purchaseDate ?? getToday(),
            supplierName: purchase?.supplierName ?? "",
            invoiceNumber: purchase?.invoiceNumber ?? "",
            notes: purchase?.notes ?? "",
            items: purchase?.items?.length
                ? purchase.items.map((item) => ({
                      itemName: item.itemName,
                      description: item.description ?? "",
                      quantity: String(item.quantity),
                      rate: String(item.rate),
                  }))
                : [emptyItem()],
        });
    }, [form, open, purchase]);

    const total = useMemo(
        () => watchedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0),
        [watchedItems],
    );

    const handleSubmit: SubmitHandler<CreatePurchaseJSON> = async (values) => {
        await onSubmit(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-6xl flex-col overflow-hidden rounded-2xl p-4 sm:p-5">
                <DialogHeader className="shrink-0">
                    <DialogTitle>{isLoading ? "Loading purchase..." : isEdit ? "Edit purchase" : "Add purchase"}</DialogTitle>
                    <DialogDescription>{isLoading ? "Loading purchase details." : "Record supplier items and the invoice total. This does not update stock yet."}</DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                        <Spinner className="size-6 text-primary" />
                        Loading purchase details...
                    </div>
                ) : <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field data-invalid={!!form.formState.errors.supplierName} className="col-span-1 sm:col-span-2">
                            <FieldLabel required>Supplier name</FieldLabel>
                            <FieldContent>
                                <Input placeholder="Supplier name" {...form.register("supplierName")} />
                                <FieldError errors={[form.formState.errors.supplierName]} />
                            </FieldContent>
                        </Field>
                        <Field data-invalid={!!form.formState.errors.purchaseDate}>
                            <FieldLabel required>Purchase date</FieldLabel>
                            <FieldContent>
                                <Input type="date" {...form.register("purchaseDate")} />
                                <FieldError errors={[form.formState.errors.purchaseDate]} />
                            </FieldContent>
                        </Field>
                        <Field data-invalid={!!form.formState.errors.invoiceNumber}>
                            <FieldLabel>Invoice number <span className="text-muted-foreground">(optional)</span></FieldLabel>
                            <FieldContent>
                                <Input maxLength={255} placeholder="e.g. INV-1024" {...form.register("invoiceNumber")} />
                                <FieldError errors={[form.formState.errors.invoiceNumber]} />
                            </FieldContent>
                        </Field>
                    </div>

                    <div className="rounded-xl border border-border/70">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-2.5">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold">Items</p>
                                <p className="text-xs text-muted-foreground">Add each item from the supplier invoice.</p>
                            </div>
                            <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => append(emptyItem())}>
                                <Plus className="size-4" /> Add item
                            </Button>
                        </div>

                        <div className="space-y-3 p-3">
                            {fields.map((field, index) => {
                                const item = watchedItems[index] ?? field;
                                const itemErrors = form.formState.errors.items?.[index];
                                const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                                return (
                                    <div key={field.id} className="space-y-3 rounded-lg bg-muted/30 p-3">
                                        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                                            <Field data-invalid={!!itemErrors?.itemName} className="min-w-0 gap-1">
                                                <FieldLabel>Item name</FieldLabel>
                                                <FieldContent>
                                                    <Input className="h-9 min-w-0 bg-background text-sm" placeholder="Item name" {...form.register(`items.${index}.itemName` as const)} />
                                                    <FieldError errors={[itemErrors?.itemName]} />
                                                </FieldContent>
                                            </Field>
                                            <Field data-invalid={!!itemErrors?.description} className="min-w-0 gap-1">
                                                <FieldLabel>Description</FieldLabel>
                                                <FieldContent>
                                                    <Input className="h-9 min-w-0 bg-background text-sm" placeholder="Optional" {...form.register(`items.${index}.description` as const)} />
                                                    <FieldError errors={[itemErrors?.description]} />
                                                </FieldContent>
                                            </Field>
                                        </div>

                                        <div className="grid min-w-0 grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_36px]">
                                            <Field data-invalid={!!itemErrors?.quantity} className="min-w-0 gap-1">
                                                <FieldLabel>Qty</FieldLabel>
                                                <FieldContent>
                                                    <Input className="h-9 min-w-0 bg-background text-sm" type="number" min="0.001" step="0.001" {...form.register(`items.${index}.quantity` as const)} />
                                                    <FieldError errors={[itemErrors?.quantity]} />
                                                </FieldContent>
                                            </Field>
                                            <Field data-invalid={!!itemErrors?.rate} className="min-w-0 gap-1">
                                                <FieldLabel>Rate</FieldLabel>
                                                <FieldContent>
                                                    <Input className="h-9 min-w-0 bg-background text-sm" type="number" min="0" max="9999999999.99" step="0.01" {...form.register(`items.${index}.rate` as const)} />
                                                    <FieldError errors={[itemErrors?.rate]} />
                                                </FieldContent>
                                            </Field>
                                            <div className="min-w-14 space-y-1 text-xs">
                                                <span className="font-medium">Total</span>
                                                <p className="flex h-9 items-center px-1 font-semibold">{formatCurrency(lineTotal)}</p>
                                            </div>
                                            <Button type="button" size="icon-xs" variant="ghost" className="self-end text-destructive hover:text-destructive" disabled={fields.length === 1} onClick={() => remove(index)} aria-label={`Remove item ${index + 1}`}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <FieldError errors={[form.formState.errors.items]} className="px-3 pb-3" />
                    </div>

                    <Field data-invalid={!!form.formState.errors.notes}>
                        <FieldLabel>Purchase notes <span className="text-muted-foreground">(optional)</span></FieldLabel>
                        <FieldContent>
                            <Textarea rows={2} placeholder="Additional details about this purchase" {...form.register("notes")} />
                            <FieldError errors={[form.formState.errors.notes]} />
                        </FieldContent>
                    </Field>

                    <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
                        <span className="text-sm font-medium">Purchase total</span>
                        <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
                    </div>

                    </div>

                    <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-border/70 bg-background/95 pt-4 sm:flex-row">
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>{isPending ? "Saving..." : isEdit ? "Save changes" : "Save purchase"}</Button>
                    </DialogFooter>
                </form>}
            </DialogContent>
        </Dialog>
    );
};

export default PurchaseFormDialog;
