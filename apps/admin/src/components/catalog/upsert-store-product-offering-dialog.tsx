import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStoreProductOffering } from "@repo/services";
import {
    ProductStatusSchema,
    type StoreProductOfferingResponseDTO,
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
            price: String(offering.price),
            discount: offering.discount ? String(offering.discount) : "",
            status: offering.status,
        });
    }, [form, offering, open]);

    const mutation = useMutation({
        mutationFn: async (data: z.output<typeof offeringFormSchema>) =>
            updateStoreProductOffering(organizationId, storeId, offering.id, {
                price: data.price,
                discount: data.discount,
                status: data.status,
            }),
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
            toast.error(error.message ?? "Unable to save Store Product Offering");
        },
    });

    const onSubmit: SubmitHandler<z.output<typeof offeringFormSchema>> = (values) => {
        mutation.mutate(values);
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
            <DialogContent className="max-w-lg">
                <DialogHeader
                    icon={<Package2 className="size-5" />}
                    title="Edit Store price"
                    subtitle="Change this Store's selling price, discount, and menu status. Shared Catalog Product details stay in the Organization workspace."
                />
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field>
                        <FieldLabel>Catalog Product</FieldLabel>
                        <FieldContent>
                            <div className="flex h-11 items-center rounded-xl border border-border/60 bg-muted/20 px-3 text-sm">
                                {offering.product.name}
                            </div>
                        </FieldContent>
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Controller
                            control={form.control}
                            name="price"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Selling price (₹)</FieldLabel>
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
                                    <FieldLabel>Discount (₹)</FieldLabel>
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
                                <FieldLabel required>Menu status</FieldLabel>
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

export default UpsertStoreProductOfferingDialog;
