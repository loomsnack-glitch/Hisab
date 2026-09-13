import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { createCustomer, createPosCustomer } from "@repo/services";
import { CreateCustomerSchema, normalizePhoneNumber, type CreateCustomerJSON, type CustomerDTO } from "@repo/types";
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
import { PhoneInput } from "@repo/ui/components/phone-input";
import { User } from "lucide-react";
import { toast } from "sonner";

import type { BillingWorkspaceMode } from "@/lib/billing-mode";
import { billingKeys } from "@/lib/query-keys";

type CustomerQuickCreateDialogProps = {
    organizationId: string;
    mode?: BillingWorkspaceMode;
    suggestedName?: string;
    suggestedPhone?: string;
    trigger?: React.ReactElement;
    onCreated?: (customer: CustomerDTO) => void;
};

const CustomerQuickCreateDialog = ({
    organizationId,
    mode = "admin",
    suggestedName,
    suggestedPhone,
    trigger,
    onCreated,
}: CustomerQuickCreateDialogProps) => {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const form = useForm<CreateCustomerJSON>({
        resolver: zodResolver(CreateCustomerSchema),
        defaultValues: {
            name: suggestedName?.trim() || "",
            phone: normalizePhoneNumber(suggestedPhone) ?? "",
            isActive: true,
        },
    });

    useEffect(() => {
        if (!open) {
            form.reset({
                name: suggestedName?.trim() || "",
                phone: normalizePhoneNumber(suggestedPhone) ?? "",
                isActive: true,
            });
        }
    }, [form, open, suggestedName, suggestedPhone]);

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
            <DialogContent className="sm:max-w-md">
                <DialogHeader icon={<User className="size-5" />} title="Create customer" />

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Customer name</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" {...form.register("name")} />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.phone}>
                        <FieldLabel>Phone</FieldLabel>
                        <FieldContent>
                            <Controller
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <PhoneInput
                                        className="h-11 rounded-xl border"
                                        value={field.value || undefined}
                                        onChange={(value: string | undefined) => field.onChange(value ?? "")}
                                        onBlur={field.onBlur}
                                    />
                                )}
                            />
                            <FieldError errors={[form.formState.errors.phone]} />
                        </FieldContent>
                    </Field>

                    <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
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
