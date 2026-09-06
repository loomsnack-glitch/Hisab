import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStoreVendorItemOffering } from "@repo/services";
import { type StoreVendorItemOfferingResponseDTO } from "@repo/types";
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
import { Package, Pencil } from "lucide-react";
import { toast } from "sonner";

import { vendorKeys } from "@/lib/query-keys";

const decimalAmountPattern = /^\d+(\.\d{0,2})?$/;

const sanitizeTwoDecimalInput = (value: string) => {
    const digitsAndDot = value.replace(/[^\d.]/g, "");
    const dotIndex = digitsAndDot.indexOf(".");
    if (dotIndex === -1) {
        return digitsAndDot;
    }
    return digitsAndDot.slice(0, dotIndex + 1) + digitsAndDot.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
};

const offeringFormSchema = z.object({
    defaultPurchasePrice: z
        .string()
        .refine((value) => value.length > 0, "Default purchase price is required")
        .refine((value) => decimalAmountPattern.test(value), "Use at most two decimal places")
        .transform((value) => Number(value))
        .pipe(z.number().min(0, "Default purchase price must be 0 or more")),
});

type OfferingFormInput = z.input<typeof offeringFormSchema>;

type UpsertStoreVendorItemOfferingDialogProps = {
    organizationId: string;
    storeId: string;
    offering: StoreVendorItemOfferingResponseDTO;
};

const UpsertStoreVendorItemOfferingDialog = ({
    organizationId,
    storeId,
    offering,
}: UpsertStoreVendorItemOfferingDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const form = useForm<OfferingFormInput, unknown, z.output<typeof offeringFormSchema>>({
        resolver: zodResolver(offeringFormSchema),
        defaultValues: { defaultPurchasePrice: "" },
    });

    useEffect(() => {
        if (!open) {
            return;
        }
        form.reset({ defaultPurchasePrice: String(offering.defaultPurchasePrice) });
    }, [form, offering, open]);

    const mutation = useMutation({
        mutationFn: async (data: z.output<typeof offeringFormSchema>) =>
            updateStoreVendorItemOffering(organizationId, storeId, offering.id, {
                defaultPurchasePrice: data.defaultPurchasePrice,
            }),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success(response.message);
            queryClient.invalidateQueries({
                queryKey: vendorKeys.storeItemOfferings(organizationId, storeId),
            });
            setOpen(false);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Unable to save this Store default purchase price");
        },
    });

    const onSubmit: SubmitHandler<z.output<typeof offeringFormSchema>> = (values) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    <Button variant="outline" size="sm" className="rounded-full">
                        <Pencil className="size-3" />
                        Edit default
                    </Button>
                }
            />
            <DialogContent className="max-w-lg">
                <DialogHeader
                    icon={<Package className="size-5" />}
                    title="Edit Store default purchase price"
                    subtitle="This suggested price is used for new Purchases at this Store. The agreed Purchase Line price remains editable history."
                />
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field>
                        <FieldLabel>Vendor Item</FieldLabel>
                        <FieldContent>
                            <div className="flex h-11 items-center rounded-xl border border-border/60 bg-muted/20 px-3 text-sm">
                                {offering.vendorItem.name}
                            </div>
                        </FieldContent>
                    </Field>
                    <Controller
                        control={form.control}
                        name="defaultPurchasePrice"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Default purchase price (₹)</FieldLabel>
                                <FieldContent>
                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        className="h-11 rounded-xl"
                                        value={field.value}
                                        onChange={(event) =>
                                            field.onChange(sanitizeTwoDecimalInput(event.target.value))
                                        }
                                        onBlur={field.onBlur}
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

export default UpsertStoreVendorItemOfferingDialog;
