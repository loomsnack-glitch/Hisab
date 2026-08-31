import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type SubmitHandler } from "react-hook-form";
import { recordMoneyAccountBalanceAdjustment } from "@repo/services";
import {
    RecordBalanceAdjustmentSchema,
    type MoneyAccountDTO,
    type RecordBalanceAdjustmentJSON,
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
import { Scale } from "lucide-react";
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

const toMoneyAmount = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const formatSignedAdjustment = (amount: number) => {
    if (amount > 0) {
        return `+${formatCurrency(amount)}`;
    }
    if (amount < 0) {
        return `−${formatCurrency(Math.abs(amount))}`;
    }
    return formatCurrency(0);
};

type AdjustMoneyAccountBalanceFormProps = {
    moneyAccount: MoneyAccountDTO;
    isPending?: boolean;
    defaultValues?: Partial<RecordBalanceAdjustmentJSON>;
    onCancel?: () => void;
    onSubmit: SubmitHandler<RecordBalanceAdjustmentJSON>;
};

export const AdjustMoneyAccountBalanceForm = ({
    moneyAccount,
    isPending = false,
    defaultValues,
    onCancel,
    onSubmit,
}: AdjustMoneyAccountBalanceFormProps) => {
    const form = useForm<RecordBalanceAdjustmentJSON>({
        resolver: zodResolver(RecordBalanceAdjustmentSchema),
        defaultValues: {
            actualBalance: undefined,
            reason: "",
            ...defaultValues,
        },
    });
    const actualBalance = form.watch("actualBalance");
    const reason = form.watch("reason");
    const difference =
        typeof actualBalance === "number" && Number.isFinite(actualBalance)
            ? toMoneyAmount(actualBalance - moneyAccount.balance)
            : null;
    const canSubmit =
        typeof actualBalance === "number" &&
        Number.isFinite(actualBalance) &&
        actualBalance >= 0 &&
        (reason ?? "").trim().length > 0 &&
        difference !== null &&
        difference !== 0 &&
        !form.formState.isSubmitting &&
        !isPending;

    return (
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <p className="text-sm text-muted-foreground">
                Tracked balance {formatCurrency(moneyAccount.balance)}
            </p>
            <Field data-invalid={!!form.formState.errors.actualBalance}>
                <FieldLabel required>Actual balance</FieldLabel>
                <FieldContent>
                    <Input
                        className="h-11 rounded-xl"
                        inputMode="decimal"
                        placeholder="0.00"
                        {...form.register("actualBalance", {
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
                                "actualBalance",
                                event.target.value === "" || !Number.isFinite(numeric)
                                    ? (undefined as unknown as number)
                                    : numeric,
                                { shouldValidate: true, shouldDirty: true },
                            );
                        }}
                    />
                    <FieldError errors={[form.formState.errors.actualBalance]} />
                </FieldContent>
            </Field>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Difference
                </p>
                {difference === null ? (
                    <p className="text-sm text-muted-foreground">
                        Enter the counted amount to see the derived adjustment.
                    </p>
                ) : difference === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No adjustment is needed. The counted amount matches the tracked balance.
                    </p>
                ) : (
                    <p className="text-sm font-semibold tabular-nums text-muted-foreground">
                        {formatSignedAdjustment(difference)}
                    </p>
                )}
            </div>
            <Field data-invalid={!!form.formState.errors.reason}>
                <FieldLabel required>Reason</FieldLabel>
                <FieldContent>
                    <Textarea
                        className="min-h-20 rounded-xl"
                        placeholder="e.g. Missed cash purchase from last week"
                        {...form.register("reason")}
                    />
                    <FieldError errors={[form.formState.errors.reason]} />
                </FieldContent>
            </Field>
            <DialogFooter className="mx-0 mb-0">
                <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    disabled={isPending}
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button type="submit" className="rounded-full" disabled={!canSubmit}>
                    {isPending ? "Adjusting..." : "Adjust balance"}
                </Button>
            </DialogFooter>
        </form>
    );
};

type AdjustMoneyAccountBalanceDialogProps = {
    organizationId: string;
    moneyAccount: MoneyAccountDTO;
};

const AdjustMoneyAccountBalanceDialog = ({
    organizationId,
    moneyAccount,
}: AdjustMoneyAccountBalanceDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (values: RecordBalanceAdjustmentJSON) =>
            recordMoneyAccountBalanceAdjustment(organizationId, moneyAccount.id, values),
        onSuccess: async (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                await queryClient.invalidateQueries({ queryKey: moneyAccountKeys.all });
                setOpen(false);
                return;
            }
            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to adjust balance");
        },
    });

    return (
        <Dialog
            open={open}
            onOpenChange={setOpen}
            disablePointerDismissal
        >
            <DialogTrigger
                render={
                    <Button type="button" variant="outline" size="sm" className="rounded-full">
                        <Scale className="size-4" />
                        Adjust balance
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader title="Adjust balance" />
                <AdjustMoneyAccountBalanceForm
                    key={open ? "open" : "closed"}
                    moneyAccount={moneyAccount}
                    isPending={mutation.isPending}
                    onCancel={() => setOpen(false)}
                    onSubmit={(values) => {
                        mutation.mutate({
                            actualBalance: values.actualBalance,
                            reason: values.reason,
                        });
                    }}
                />
            </DialogContent>
        </Dialog>
    );
};

export default AdjustMoneyAccountBalanceDialog;
