import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStoreAddOnOffering } from "@repo/services";
import {
    AddOnStatusSchema,
    type StoreAddOnOfferingResponseDTO,
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
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Pencil, Puzzle } from "lucide-react";
import { toast } from "sonner";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import { catalogKeys } from "@/lib/query-keys";

const decimalAmountPattern = /^\d+(\.\d*)?$/;

const sanitizeDecimalInput = (value: string) => {
    const digitsAndDot = value.replace(/[^\d.]/g, "");
    const dotIndex = digitsAndDot.indexOf(".");
    if (dotIndex === -1) {
        return digitsAndDot;
    }
    return (
        digitsAndDot.slice(0, dotIndex + 1) +
        digitsAndDot.slice(dotIndex + 1).replace(/\./g, "")
    );
};

const offeringFormSchema = z.object({
    price: z
        .string()
        .refine((value) => value.length > 0, "Price is required")
        .refine((value) => decimalAmountPattern.test(value), "Enter a valid price")
        .transform((value) => Number(value))
        .pipe(z.number().min(0, "Price must be 0 or more")),
    discount: z
        .string()
        .refine(
            (value) => value === "" || decimalAmountPattern.test(value),
            "Enter a valid discount",
        )
        .transform((value) => (value === "" ? 0 : Number(value)))
        .pipe(z.number().min(0, "Discount must be 0 or more")),
    status: AddOnStatusSchema,
});

type OfferingFormInput = z.input<typeof offeringFormSchema>;

type UpsertStoreAddOnOfferingDialogProps = {
    organizationId: string;
    storeId: string;
    offering: StoreAddOnOfferingResponseDTO;
    trigger?: React.ReactElement;
};

const UpsertStoreAddOnOfferingDialog = ({
    organizationId,
    storeId,
    offering,
    trigger,
}: UpsertStoreAddOnOfferingDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const statusOptions = AddOnStatusSchema.options.map((status) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: status,
    }));

    const form = useForm<OfferingFormInput, unknown, z.output<typeof offeringFormSchema>>({
        resolver: zodResolver(offeringFormSchema),
        defaultValues: {
            price: "",
            discount: "",
            status: "active",
        },
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        form.reset({
            price: String(offering.effectivePrice),
            discount: offering.effectiveDiscount ? String(offering.effectiveDiscount) : "",
            status: offering.status,
        });
    }, [form, offering, open]);

    const mutation = useMutation({
        mutationFn: async (data: z.output<typeof offeringFormSchema>) =>
            updateStoreAddOnOffering(organizationId, storeId, offering.id, {
                priceOverride: data.price,
                discountOverride: data.discount,
                status: data.status,
            }),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success(response.message);
            queryClient.invalidateQueries({
                queryKey: catalogKeys.storeAddOnOfferings(organizationId, storeId),
            });
            setOpen(false);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to save Store Add-On Offering");
        },
    });

    const clearPriceOverrideMutation = useMutation({
        mutationFn: async () =>
            updateStoreAddOnOffering(organizationId, storeId, offering.id, {
                clearPriceOverride: true,
            }),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success("Price now inherits the Organization default");
            queryClient.invalidateQueries({
                queryKey: catalogKeys.storeAddOnOfferings(organizationId, storeId),
            });
            setOpen(false);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to clear the price override");
        },
    });

    const clearDiscountOverrideMutation = useMutation({
        mutationFn: async () =>
            updateStoreAddOnOffering(organizationId, storeId, offering.id, {
                clearDiscountOverride: true,
            }),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success("Discount now inherits the Organization default");
            queryClient.invalidateQueries({
                queryKey: catalogKeys.storeAddOnOfferings(organizationId, storeId),
            });
            setOpen(false);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to clear the discount override");
        },
    });

    const onSubmit: SubmitHandler<z.output<typeof offeringFormSchema>> = (values) => {
        mutation.mutate(values);
    };

    const orgDefaultPrice = offering.addOn.price;
    const orgDefaultDiscount = offering.addOn.discount;

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
            <DialogContent className="max-w-lg">
                <DialogHeader
                    icon={<Puzzle className="size-5" />}
                    title="Edit Store add-on"
                    subtitle="Set local overrides or return to Organization defaults. Menu status is Store-specific."
                />
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field>
                        <FieldLabel>Add-on</FieldLabel>
                        <FieldContent>
                            <div className="flex h-11 items-center rounded-xl border border-border/60 bg-muted/20 px-3 text-sm">
                                {offering.addOn.name}
                            </div>
                        </FieldContent>
                    </Field>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <p className="text-xs font-medium text-muted-foreground">Organization defaults</p>
                        <ProductPriceDisplay
                            price={orgDefaultPrice}
                            discount={orgDefaultDiscount}
                            size="sm"
                            align="left"
                            singleTone="foreground"
                        />
                        <p className="mt-2 text-xs text-muted-foreground">
                            Global publication: {offering.addOn.status === "active" ? "Published" : "Paused"}
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={form.control}
                            name="price"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>
                                        Effective price (₹)
                                        <span className="ml-1 font-normal text-muted-foreground">
                                            {offering.isPriceInherited ? "· inherited" : "· overridden"}
                                        </span>
                                    </FieldLabel>
                                    <FieldContent>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="h-11 rounded-xl"
                                            value={field.value}
                                            onChange={(event) =>
                                                field.onChange(sanitizeDecimalInput(event.target.value))
                                            }
                                            onBlur={field.onBlur}
                                        />
                                        {!offering.isPriceInherited ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="mt-1 h-auto px-0 text-xs"
                                                disabled={clearPriceOverrideMutation.isPending}
                                                onClick={() => clearPriceOverrideMutation.mutate()}
                                            >
                                                Use Organization default price
                                            </Button>
                                        ) : null}
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="discount"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>
                                        Effective discount (₹)
                                        <span className="ml-1 font-normal text-muted-foreground">
                                            {offering.isDiscountInherited ? "· inherited" : "· overridden"}
                                        </span>
                                    </FieldLabel>
                                    <FieldContent>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="h-11 rounded-xl"
                                            value={field.value ?? ""}
                                            onChange={(event) =>
                                                field.onChange(sanitizeDecimalInput(event.target.value))
                                            }
                                            onBlur={field.onBlur}
                                        />
                                        {!offering.isDiscountInherited ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="mt-1 h-auto px-0 text-xs"
                                                disabled={clearDiscountOverrideMutation.isPending}
                                                onClick={() => clearDiscountOverrideMutation.mutate()}
                                            >
                                                Use Organization default discount
                                            </Button>
                                        ) : null}
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />
                    </div>
                    <FieldDescription>
                        Saving a new price or discount creates a Store override. Use the reset actions to inherit Organization defaults again.
                    </FieldDescription>
                    <Controller
                        control={form.control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Store menu status</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={statusOptions}
                                        value={
                                            statusOptions.find((option) => option.value === field.value) ?? null
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
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertStoreAddOnOfferingDialog;
