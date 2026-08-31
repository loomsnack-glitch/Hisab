import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import {
    createOutgoingPurchasePayment,
    getMoneyAccounts,
    getOrganizationDetails,
} from "@repo/services";
import {
    CreateOutgoingPaymentSchema,
    OUTGOING_PAYMENT_METHOD_LABELS,
    TRACKED_OUTGOING_PAYMENT_METHODS,
    UNTRACKED_OUTGOING_PAYMENT_METHODS,
    isMoneyAccountAvailableToStore,
    isMoneyAccountEligibleForOutgoingMethod,
    type CreateOutgoingPaymentJSON,
    type OutgoingPaymentMethod,
    type PurchaseDTO,
} from "@repo/types";
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
import { Banknote } from "lucide-react";
import { toast } from "sonner";

import { formatCurrency } from "@/lib/format";
import { moneyAccountKeys, organizationKeys, purchaseKeys } from "@/lib/query-keys";

type RecordOutgoingPaymentDialogProps = {
    organizationId: string;
    purchase: PurchaseDTO;
};

const sanitizeTwoDecimalInput = (value: string) => {
    const digitsAndDot = value.replace(/[^\d.]/g, "");
    const dotIndex = digitsAndDot.indexOf(".");
    if (dotIndex === -1) {
        return digitsAndDot;
    }
    return digitsAndDot.slice(0, dotIndex + 1) + digitsAndDot.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
};

const RecordOutgoingPaymentDialog = ({ organizationId, purchase }: RecordOutgoingPaymentDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const remainingDue = purchase.dueAmount ?? 0;

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
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
    const store = stores.find((candidate) => candidate.id === purchase.storeId);
    const trackingActive = Boolean(store?.moneyAccountTrackingEnabled);
    const moneyAccounts =
        moneyAccountsQuery.data?.status === "success"
            ? moneyAccountsQuery.data.data?.moneyAccounts ?? []
            : [];

    const methods = trackingActive
        ? TRACKED_OUTGOING_PAYMENT_METHODS
        : UNTRACKED_OUTGOING_PAYMENT_METHODS;
    const methodOptions = methods.map((method) => ({
        label: OUTGOING_PAYMENT_METHOD_LABELS[method],
        value: method,
    }));

    const form = useForm<CreateOutgoingPaymentJSON>({
        resolver: zodResolver(CreateOutgoingPaymentSchema),
        defaultValues: {
            amount: remainingDue,
            paymentMethod: "cash",
            moneyAccountId: null,
            reference: "",
            notes: "",
        },
    });
    const paymentMethod = form.watch("paymentMethod") as OutgoingPaymentMethod | undefined;
    const selectedAccountId = form.watch("moneyAccountId");

    const eligibleAccounts = useMemo(() => {
        if (!trackingActive || !paymentMethod) {
            return [];
        }
        return moneyAccounts.filter(
            (account) =>
                isMoneyAccountAvailableToStore(account, purchase.storeId) &&
                isMoneyAccountEligibleForOutgoingMethod(account, paymentMethod),
        );
    }, [moneyAccounts, paymentMethod, purchase.storeId, trackingActive]);

    const accountOptions = eligibleAccounts.map((account) => ({
        label: `${account.name} · ${formatCurrency(account.balance)}`,
        value: account.id,
    }));
    const selectedAccount = eligibleAccounts.find((account) => account.id === selectedAccountId);

    const mutation = useMutation({
        mutationFn: (values: CreateOutgoingPaymentJSON) =>
            createOutgoingPurchasePayment(organizationId, purchase.id, {
                amount: values.amount,
                paymentMethod: values.paymentMethod,
                moneyAccountId: trackingActive ? values.moneyAccountId : null,
                reference: values.reference,
                notes: values.notes,
            }),
        onSuccess: async (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                await queryClient.invalidateQueries({ queryKey: purchaseKeys.list(organizationId) });
                await queryClient.invalidateQueries({
                    queryKey: purchaseKeys.detail(organizationId, purchase.id),
                });
                await queryClient.invalidateQueries({ queryKey: moneyAccountKeys.all });
                setOpen(false);
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to record Outgoing Payment");
        },
    });

    const onSubmit: SubmitHandler<CreateOutgoingPaymentJSON> = (values) => {
        mutation.mutate(values);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (nextOpen) {
                    form.reset({
                        amount: remainingDue,
                        paymentMethod: "cash",
                        moneyAccountId: null,
                        reference: "",
                        notes: "",
                    });
                }
            }}
        >
            <DialogTrigger
                render={
                    <Button className="rounded-full">
                        <Banknote className="size-4" />
                        Record payment
                    </Button>
                }
            />
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                    <p className="font-display text-lg font-semibold">Record Outgoing Payment</p>
                    <p className="text-sm text-muted-foreground">
                        {purchase.vendorName} · due {formatCurrency(remainingDue)}
                    </p>
                </DialogHeader>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field>
                        <FieldLabel>Amount</FieldLabel>
                        <FieldContent>
                            <Input
                                inputMode="decimal"
                                {...form.register("amount", {
                                    setValueAs: (value) => {
                                        if (value === "" || value == null) return undefined;
                                        const numeric = Number(value);
                                        return Number.isFinite(numeric) ? numeric : value;
                                    },
                                })}
                                onChange={(event) => {
                                    event.target.value = sanitizeTwoDecimalInput(event.target.value);
                                    form.setValue("amount", Number(event.target.value), { shouldValidate: true });
                                }}
                            />
                            <FieldError errors={[form.formState.errors.amount]} />
                        </FieldContent>
                    </Field>

                    <Field>
                        <FieldLabel>Payment method</FieldLabel>
                        <FieldContent>
                            <Controller
                                control={form.control}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <ReactSelect
                                        options={methodOptions}
                                        value={methodOptions.find((option) => option.value === field.value) ?? null}
                                        onChange={(option) => {
                                            field.onChange(option?.value ?? "cash");
                                            form.setValue("moneyAccountId", null);
                                        }}
                                    />
                                )}
                            />
                            <FieldError errors={[form.formState.errors.paymentMethod]} />
                        </FieldContent>
                    </Field>

                    {trackingActive ? (
                        <Field>
                            <FieldLabel>Money Account</FieldLabel>
                            <FieldContent>
                                <Controller
                                    control={form.control}
                                    name="moneyAccountId"
                                    render={({ field }) => (
                                        <ReactSelect
                                            options={accountOptions}
                                            value={accountOptions.find((option) => option.value === field.value) ?? null}
                                            onChange={(option) => field.onChange(option?.value ?? null)}
                                            placeholder="Select an eligible account"
                                        />
                                    )}
                                />
                                {selectedAccount ? (
                                    <p className="text-xs text-muted-foreground">
                                        Available {formatCurrency(selectedAccount.balance)}
                                    </p>
                                ) : null}
                                {eligibleAccounts.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        No active eligible Money Account is available to this Store for the selected method.
                                    </p>
                                ) : null}
                                <FieldError errors={[form.formState.errors.moneyAccountId]} />
                            </FieldContent>
                        </Field>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Money Account Tracking is off for this Store. Cash, UPI, and Card payments will not change a Money Account Balance.
                        </p>
                    )}

                    <Field>
                        <FieldLabel>Reference</FieldLabel>
                        <FieldContent>
                            <Input {...form.register("reference")} />
                            <FieldError errors={[form.formState.errors.reference]} />
                        </FieldContent>
                    </Field>

                    <Field>
                        <FieldLabel>Notes</FieldLabel>
                        <FieldContent>
                            <Textarea rows={3} {...form.register("notes")} />
                            <FieldError errors={[form.formState.errors.notes]} />
                        </FieldContent>
                    </Field>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button className="rounded-full" disabled={mutation.isPending} type="submit">
                            {mutation.isPending ? "Recording..." : "Record payment"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default RecordOutgoingPaymentDialog;
