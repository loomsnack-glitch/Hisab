import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type SubmitHandler } from "react-hook-form";
import { createCustomer, createPosCustomer } from "@repo/services";
import { CreateCustomerSchema, type CreateCustomerJSON, type CustomerDTO } from "@repo/types";
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
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { toast } from "sonner";

import type { BillingWorkspaceMode } from "@/lib/billing-mode";
import { billingKeys } from "@/lib/query-keys";

type CustomerQuickCreateDialogProps = {
    organizationId: string;
    mode?: BillingWorkspaceMode;
    suggestedName?: string;
    trigger?: React.ReactElement;
    onCreated?: (customer: CustomerDTO) => void;
};

const CustomerQuickCreateDialog = ({
    organizationId,
    mode = "admin",
    suggestedName,
    trigger,
    onCreated,
}: CustomerQuickCreateDialogProps) => {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const form = useForm<CreateCustomerJSON>({
        resolver: zodResolver(CreateCustomerSchema),
        defaultValues: {
            name: suggestedName?.trim() || "",
            phone: "",
            isActive: true,
        },
    });

    useEffect(() => {
        if (!open) {
            form.reset({
                name: suggestedName?.trim() || "",
                phone: "",
                isActive: true,
            });
        }
    }, [form, open, suggestedName]);

    const createCustomerMutation = useMutation({
        mutationFn: (payload: CreateCustomerJSON) =>
            mode === "device" ? createPosCustomer(payload) : createCustomer(organizationId, payload),
        onSuccess: (response) => {
            if (response.status !== "success" || !response.data?.customer) {
                toast.error(response.message || "Failed to create customer");
                return;
            }

            queryClient.invalidateQueries({ queryKey: billingKeys.organization(organizationId) });
            onCreated?.(response.data.customer);
            toast.success("Customer created");
            setOpen(false);
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Failed to create customer");
        },
    });

    const onSubmit: SubmitHandler<CreateCustomerJSON> = (values) => {
        createCustomerMutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            {trigger ? <DialogTrigger render={trigger} /> : null}
            <DialogContent className="max-w-md rounded-[28px] border-border/70 bg-background/95 p-6 shadow-2xl backdrop-blur-xl">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="font-display text-2xl font-semibold">Quick customer add</DialogTitle>
                    <DialogDescription>
                        Create a customer without leaving the billing flow. Use this for credit bills and repeat buyers.
                    </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Name</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-2xl"
                                placeholder="Customer name"
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.phone}>
                        <FieldLabel>Phone</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-2xl"
                                placeholder="Optional phone number"
                                {...form.register("phone")}
                            />
                            <FieldError errors={[form.formState.errors.phone]} />
                        </FieldContent>
                    </Field>

                    <DialogFooter className="pt-2">
                        <Button
                            type="submit"
                            className="rounded-2xl"
                            disabled={createCustomerMutation.isPending}
                        >
                            {createCustomerMutation.isPending ? "Creating..." : "Create customer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CustomerQuickCreateDialog;
