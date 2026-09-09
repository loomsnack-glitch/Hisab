import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStoreProductOffering } from "@repo/services";
import {
    ProductStatusSchema,
    type StoreProductOfferingResponseDTO,
    type UpdateStoreProductOfferingJSON,
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
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Package2, Pencil } from "lucide-react";
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
    status: ProductStatusSchema,
});

type OfferingFormInput = z.input<typeof offeringFormSchema>;

type UpsertStoreProductOfferingDialogProps = {
    organizationId: string;
    storeId: string;
    offering: StoreProductOfferingResponseDTO;
    trigger?: React.ReactElement;
};

const UpsertStoreProductOfferingDialog = ({
    organizationId,
    storeId,
    offering,
    trigger,
}: UpsertStoreProductOfferingDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const statusOptions = ProductStatusSchema.options.map((status) => ({
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

    const buildUpdatePayload = (
        values: z.output<typeof offeringFormSchema>,
    ): UpdateStoreProductOfferingJSON => {
        const orgPrice = Number(offering.product.price);
        const orgDiscount = Number(offering.product.discount ?? 0);
        const payload: UpdateStoreProductOfferingJSON = {
            status: values.status,
        };

        if (values.price === orgPrice) {
            if (!offering.isPriceInherited) {
                payload.clearPriceOverride = true;
            }
        } else {
            payload.priceOverride = values.price;
        }

        if (values.discount === orgDiscount) {
            if (!offering.isDiscountInherited) {
                payload.clearDiscountOverride = true;
            }
        } else {
            payload.discountOverride = values.discount;
        }

        return payload;
    };

    const mutation = useMutation({
        mutationFn: async (data: z.output<typeof offeringFormSchema>) =>
            updateStoreProductOffering(
                organizationId,
                storeId,
                offering.id,
                buildUpdatePayload(data),
            ),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success(response.message);
            queryClient.invalidateQueries({
                queryKey: catalogKeys.storeProductOfferings(organizationId, storeId),
            });
            setOpen(false);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to save store price");
        },
    });

    const onSubmit: SubmitHandler<z.output<typeof offeringFormSchema>> = (values) => {
        mutation.mutate(values);
    };

    const orgDefaultPrice = offering.product.price;
    const orgDefaultDiscount = offering.product.discount;
    const watchedPrice = form.watch("price");
    const watchedDiscount = form.watch("discount") ?? "";
    const priceDiffersFromDefault = Number(watchedPrice) !== Number(orgDefaultPrice);
    const discountDiffersFromDefault =
        Number(watchedDiscount || 0) !== Number(orgDefaultDiscount ?? 0);

    const applyDefaultPrice = () => {
        form.setValue("price", String(orgDefaultPrice), {
            shouldDirty: true,
            shouldValidate: true,
        });
    };

    const applyDefaultDiscount = () => {
        const defaultDiscount = Number(orgDefaultDiscount ?? 0);
        form.setValue("discount", defaultDiscount > 0 ? String(defaultDiscount) : "", {
            shouldDirty: true,
            shouldValidate: true,
        });
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
                    icon={<Package2 className="size-5" />}
                    title="Edit price"
                    subtitle={offering.product.name}
                />
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5">
                        <span className="text-xs font-medium text-muted-foreground">Organization</span>
                        <ProductPriceDisplay
                            price={orgDefaultPrice}
                            discount={orgDefaultDiscount}
                            size="sm"
                            align="right"
                            compact
                            singleTone="foreground"
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Controller
                            control={form.control}
                            name="price"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Price ₹</FieldLabel>
                                    <FieldContent>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="h-10 rounded-xl"
                                            value={field.value}
                                            onChange={(event) =>
                                                field.onChange(sanitizeDecimalInput(event.target.value))
                                            }
                                            onBlur={field.onBlur}
                                        />
                                        {priceDiffersFromDefault ? (
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="h-auto px-0 text-xs text-muted-foreground"
                                                onClick={applyDefaultPrice}
                                            >
                                                Use default
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
                                    <FieldLabel>Discount ₹</FieldLabel>
                                    <FieldContent>
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            className="h-10 rounded-xl"
                                            value={field.value ?? ""}
                                            onChange={(event) =>
                                                field.onChange(sanitizeDecimalInput(event.target.value))
                                            }
                                            onBlur={field.onBlur}
                                        />
                                        {discountDiffersFromDefault ? (
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="h-auto px-0 text-xs text-muted-foreground"
                                                onClick={applyDefaultDiscount}
                                            >
                                                Use default
                                            </Button>
                                        ) : null}
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />
                    </div>

                    <Controller
                        control={form.control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Status</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={statusOptions}
                                        placeholder=""
                                        value={
                                            statusOptions.find((option) => option.value === field.value) ?? null
                                        }
                                        onChange={(option) => field.onChange(option?.value ?? "active")}
                                        classNames={{
                                            control: () => "!min-h-10 rounded-xl",
                                        }}
                                    />
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" className="rounded-xl" disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertStoreProductOfferingDialog;
