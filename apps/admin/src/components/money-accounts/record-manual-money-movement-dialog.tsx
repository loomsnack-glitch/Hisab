import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type SubmitHandler } from "react-hook-form";
import { recordMoneyAccountDeposit, recordMoneyAccountWithdrawal } from "@repo/services";
import {
    RecordManualMoneyMovementSchema,
    type MoneyAccountDTO,
    type RecordManualMoneyMovementJSON,
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
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

import { formatCurrency } from "@/lib/format";
import { moneyAccountKeys } from "@/lib/query-keys";

const sanitizeTwoDecimalInput = (value: string) => {
    const digitsAndDot = value.replace(/[^\d.]/g, "");
    const dotIndex = digitsAndDot.indexOf(".");
    if (dotIndex === -1) {
        return digitsAndDot;
    }
    return digitsAndDot.slice(0, dotIndex + 1) + digitsAndDot.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
};

type ManualMoneyMovementMode = "deposit" | "withdrawal";

type RecordManualMoneyMovementDialogProps = {
    organizationId: string;
    moneyAccount: MoneyAccountDTO;
    mode: ManualMoneyMovementMode;
    defaultOpen?: boolean;
};

const MODE_COPY: Record<
    ManualMoneyMovementMode,
    {
        title: string;
        trigger: string;
        confirm: string;
        pending: string;
        amountLabel: string;
        notePlaceholder: string;
    }
> = {
    deposit: {
        title: "Add money",
        trigger: "Add money",
        confirm: "Add money",
        pending: "Adding...",
        amountLabel: "Amount to add",
        notePlaceholder: "e.g. Owner cash-in",
    },
    withdrawal: {
        title: "Withdraw money",
        trigger: "Withdraw money",
        confirm: "Withdraw money",
        pending: "Withdrawing...",
        amountLabel: "Amount to withdraw",
        notePlaceholder: "e.g. Till skim",
    },
};

const RecordManualMoneyMovementDialog = ({
    organizationId,
    moneyAccount,
    mode,
    defaultOpen = false,
}: RecordManualMoneyMovementDialogProps) => {
    const [open, setOpen] = useState(defaultOpen);
    const queryClient = useQueryClient();
    const copy = MODE_COPY[mode];

    const form = useForm<RecordManualMoneyMovementJSON>({
        resolver: zodResolver(RecordManualMoneyMovementSchema),
        defaultValues: {
            amount: undefined,
            note: "",
        },
    });
    const amount = form.watch("amount");
    const canSubmit =
        typeof amount === "number" && Number.isFinite(amount) && amount > 0 && !form.formState.isSubmitting;

    const mutation = useMutation({
        mutationFn: (values: RecordManualMoneyMovementJSON) =>
            mode === "deposit"
                ? recordMoneyAccountDeposit(organizationId, moneyAccount.id, values)
                : recordMoneyAccountWithdrawal(organizationId, moneyAccount.id, values),
        onSuccess: async (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                await queryClient.invalidateQueries({ queryKey: moneyAccountKeys.all });
                setOpen(false);
                form.reset({ amount: undefined, note: "" });
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(
                error.message ??
                    (mode === "deposit" ? "Failed to add money" : "Failed to withdraw money"),
            );
        },
    });

    const onSubmit: SubmitHandler<RecordManualMoneyMovementJSON> = (values) => {
        mutation.mutate({
            amount: values.amount,
            note: values.note,
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (nextOpen) {
                    form.reset({ amount: undefined, note: "" });
                }
            }}
            disablePointerDismissal
        >
            <DialogTrigger
                render={
                    <Button
                        type="button"
                        variant={mode === "withdrawal" ? "outline" : "default"}
                        size="sm"
                        className="rounded-full"
                    >
                        {mode === "deposit" ? (
                            <ArrowDownLeft className="size-4" />
                        ) : (
                            <ArrowUpRight className="size-4" />
                        )}
                        {copy.trigger}
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader
                    title={copy.title}
                    subtitle={`Current balance ${formatCurrency(moneyAccount.balance)}`}
                />
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.amount}>
                        <FieldLabel required>{copy.amountLabel}</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                inputMode="decimal"
                                placeholder="0.00"
                                {...form.register("amount", {
                                    setValueAs: (value) => {
                                        if (value === "" || value == null) return undefined;
                                        const numeric = Number(value);
                                        return Number.isFinite(numeric) ? numeric : value;
                                    },
                                })}
                                onChange={(event) => {
                                    event.target.value = sanitizeTwoDecimalInput(event.target.value);
                                    const numeric = Number(event.target.value);
                                    form.setValue(
                                        "amount",
                                        event.target.value === "" || !Number.isFinite(numeric)
                                            ? (undefined as unknown as number)
                                            : numeric,
                                        { shouldValidate: true, shouldDirty: true },
                                    );
                                }}
                            />
                            {mode === "withdrawal" ? (
                                <p className="text-xs text-muted-foreground">
                                    Cannot reduce the balance below {formatCurrency(0)}. Reconcile first if earlier
                                    activity was missed.
                                </p>
                            ) : null}
                            <FieldError errors={[form.formState.errors.amount]} />
                        </FieldContent>
                    </Field>
                    <Field data-invalid={!!form.formState.errors.note}>
                        <FieldLabel>
                            Note <span className="font-normal text-muted-foreground">(optional)</span>
                        </FieldLabel>
                        <FieldContent>
                            <Textarea
                                className="min-h-20 rounded-xl"
                                placeholder={copy.notePlaceholder}
                                {...form.register("note")}
                            />
                            <FieldError errors={[form.formState.errors.note]} />
                        </FieldContent>
                    </Field>
                    <DialogFooter className="mx-0 mb-0">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-full"
                            disabled={mutation.isPending}
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-full"
                            variant={mode === "withdrawal" ? "destructive" : "default"}
                            disabled={!canSubmit || mutation.isPending}
                        >
                            {mutation.isPending ? copy.pending : copy.confirm}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default RecordManualMoneyMovementDialog;
