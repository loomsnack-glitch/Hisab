import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import {
    createProductAddOnAttachment,
    getAddOns,
    getProductAddOnAttachments,
    updateProductAddOnAttachment,
} from "@repo/services";
import {
    CreateProductAddOnAttachmentSchema,
    ProductAddOnAttachmentStatusSchema,
    type CreateProductAddOnAttachmentJSON,
    type ProductAddOnAttachmentResponseDTO,
    type ProductResponseDTO,
} from "@repo/types";
import { z } from "zod";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Spinner } from "@repo/ui/components/spinner";
import { Link2, Puzzle } from "lucide-react";
import { toast } from "sonner";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import ProductStatusBadge from "@/components/catalog/product-status-badge";
import { catalogKeys } from "@/lib/query-keys";

type ManageProductAddOnsDialogProps = {
    organizationId: string;
    product: ProductResponseDTO;
    trigger?: React.ReactElement;
};

const AttachAddOnFormSchema = CreateProductAddOnAttachmentSchema.extend({
    selectionCap: z
        .string()
        .optional()
        .transform((value) => (value === undefined || value === "" ? undefined : Number(value)))
        .pipe(z.number().int().min(1).optional()),
});

type AttachAddOnFormInput = z.input<typeof AttachAddOnFormSchema>;

const statusSelectOptions = ProductAddOnAttachmentStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const ManageProductAddOnsDialog = ({
    organizationId,
    product,
    trigger,
}: ManageProductAddOnsDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const addOnsQuery = useQuery({
        queryKey: catalogKeys.addOns(organizationId),
        queryFn: () => getAddOns(organizationId),
        enabled: open && Boolean(organizationId),
    });

    const attachmentsQuery = useQuery({
        queryKey: catalogKeys.productAttachments(organizationId, product.id),
        queryFn: () => getProductAddOnAttachments(organizationId, product.id),
        enabled: open && Boolean(organizationId),
    });

    const addOns = addOnsQuery.data?.status === "success" ? addOnsQuery.data.data?.addOns ?? [] : [];
    const attachments =
        attachmentsQuery.data?.status === "success" ? attachmentsQuery.data.data?.attachments ?? [] : [];

    const attachedAddOnIds = useMemo(
        () => new Set(attachments.map((attachment) => attachment.addOnId)),
        [attachments],
    );

    const availableAddOnOptions = useMemo(
        () =>
            addOns
                .filter((addOn) => !attachedAddOnIds.has(addOn.id))
                .map((addOn) => ({
                    label: `${addOn.name}${addOn.status === "inactive" ? " (inactive)" : ""}`,
                    value: addOn.id,
                })),
        [addOns, attachedAddOnIds],
    );

    const form = useForm<AttachAddOnFormInput, unknown, CreateProductAddOnAttachmentJSON>({
        resolver: zodResolver(AttachAddOnFormSchema),
        defaultValues: {
            addOnId: "",
            selectionCap: "1",
        },
    });

    const invalidateAttachments = () => {
        queryClient.invalidateQueries({
            queryKey: catalogKeys.productAttachments(organizationId, product.id),
        });
    };

    const createMutation = useMutation({
        mutationFn: (data: CreateProductAddOnAttachmentJSON) =>
            createProductAddOnAttachment(organizationId, product.id, data),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                invalidateAttachments();
                form.reset({ addOnId: "", selectionCap: "1" });
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to attach add-on");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({
            attachmentId,
            selectionCap,
            status,
        }: {
            attachmentId: string;
            selectionCap?: number;
            status?: ProductAddOnAttachmentResponseDTO["status"];
        }) => updateProductAddOnAttachment(organizationId, product.id, attachmentId, { selectionCap, status }),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                invalidateAttachments();
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to update attachment");
        },
    });

    const onSubmit: SubmitHandler<CreateProductAddOnAttachmentJSON> = (values) => {
        createMutation.mutate({
            addOnId: values.addOnId,
            selectionCap: values.selectionCap ?? 1,
        });
    };

    const isLoading = addOnsQuery.isPending || attachmentsQuery.isPending;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" size="sm" className="rounded-full">
                            <Link2 className="mr-2 size-4" />
                            Add-ons
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="mb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Link2 className="size-5" />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="font-display text-xl font-semibold">
                                Add-ons for {product.name}
                            </DialogTitle>
                            <DialogDescription className="text-xs mt-0.5">
                                Attach organization add-ons and set the selection cap for this product.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 space-y-5 pr-1">
                    {isLoading ? (
                        <div className="flex min-h-[20vh] items-center justify-center">
                            <Spinner className="size-6 text-primary" />
                        </div>
                    ) : (
                        <>
                            <form
                                className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-4"
                                onSubmit={form.handleSubmit(onSubmit)}
                            >
                                <div className="grid gap-3 sm:grid-cols-[1fr_7rem_auto]">
                                    <Controller
                                        control={form.control}
                                        name="addOnId"
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel required>Add-on</FieldLabel>
                                                <FieldContent>
                                                    <ReactSelect
                                                        options={availableAddOnOptions}
                                                        value={
                                                            availableAddOnOptions.find(
                                                                (option) => option.value === field.value,
                                                            ) ?? null
                                                        }
                                                        onChange={(option) => field.onChange(option?.value ?? "")}
                                                        placeholder={
                                                            availableAddOnOptions.length === 0
                                                                ? "No add-ons left to attach"
                                                                : "Select add-on"
                                                        }
                                                        isDisabled={availableAddOnOptions.length === 0}
                                                        classNames={{
                                                            control: () => "!min-h-11 rounded-xl",
                                                        }}
                                                    />
                                                    <FieldError errors={[fieldState.error]} />
                                                </FieldContent>
                                            </Field>
                                        )}
                                    />

                                    <Field data-invalid={!!form.formState.errors.selectionCap}>
                                        <FieldLabel>Cap</FieldLabel>
                                        <FieldContent>
                                            <Input
                                                className="h-11 rounded-xl"
                                                inputMode="numeric"
                                                placeholder="1"
                                                {...form.register("selectionCap")}
                                            />
                                            <FieldError errors={[form.formState.errors.selectionCap]} />
                                        </FieldContent>
                                    </Field>

                                    <div className="flex items-end">
                                        <Button
                                            type="submit"
                                            className="h-11 rounded-xl w-full sm:w-auto"
                                            disabled={createMutation.isPending || availableAddOnOptions.length === 0}
                                        >
                                            {createMutation.isPending ? "Attaching..." : "Attach"}
                                        </Button>
                                    </div>
                                </div>
                            </form>

                            {attachments.length === 0 ? (
                                <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <Puzzle />
                                        </EmptyMedia>
                                        <EmptyTitle>No add-ons attached</EmptyTitle>
                                        <EmptyDescription>
                                            Attach an organization add-on to make it selectable for this product in POS.
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/30">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border/50 bg-muted/20 text-left text-muted-foreground">
                                                <th className="px-4 py-3 font-medium">Add-on</th>
                                                <th className="px-4 py-3 font-medium">Price</th>
                                                <th className="px-4 py-3 font-medium">Cap</th>
                                                <th className="px-4 py-3 font-medium">Attachment</th>
                                                <th className="px-4 py-3 font-medium">Add-on status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attachments.map((attachment) => (
                                                <tr key={attachment.id} className="border-b border-border/40 last:border-0">
                                                    <td className="px-4 py-3 font-medium">{attachment.addOn.name}</td>
                                                    <td className="px-4 py-3">
                                                        <ProductPriceDisplay
                                                            price={attachment.addOn.price}
                                                            discount={attachment.addOn.discount}
                                                            size="sm"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Input
                                                            className="h-9 w-20 rounded-xl"
                                                            inputMode="numeric"
                                                            defaultValue={String(attachment.selectionCap)}
                                                            onBlur={(event) => {
                                                                const nextCap = Number(event.target.value);
                                                                if (
                                                                    !Number.isInteger(nextCap)
                                                                    || nextCap < 1
                                                                    || nextCap === attachment.selectionCap
                                                                ) {
                                                                    event.target.value = String(attachment.selectionCap);
                                                                    if (!Number.isInteger(nextCap) || nextCap < 1) {
                                                                        toast.error("Selection cap must be a whole number of at least 1");
                                                                    }
                                                                    return;
                                                                }

                                                                updateMutation.mutate({
                                                                    attachmentId: attachment.id,
                                                                    selectionCap: nextCap,
                                                                });
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 min-w-[9rem]">
                                                        <ReactSelect
                                                            options={statusSelectOptions}
                                                            value={
                                                                statusSelectOptions.find(
                                                                    (option) => option.value === attachment.status,
                                                                ) ?? null
                                                            }
                                                            onChange={(option) => {
                                                                const nextStatus = option?.value;
                                                                if (!nextStatus || nextStatus === attachment.status) {
                                                                    return;
                                                                }

                                                                updateMutation.mutate({
                                                                    attachmentId: attachment.id,
                                                                    status: nextStatus,
                                                                });
                                                            }}
                                                            classNames={{
                                                                control: () => "!min-h-9 rounded-xl",
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <ProductStatusBadge status={attachment.addOn.status} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ManageProductAddOnsDialog;
