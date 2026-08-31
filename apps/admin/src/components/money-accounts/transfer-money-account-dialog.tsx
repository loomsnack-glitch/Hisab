import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { getMoneyAccounts, recordMoneyAccountTransfer } from "@repo/services";
import {
    RecordMoneyAccountTransferSchema,
    type MoneyAccountDTO,
    type RecordMoneyAccountTransferJSON,
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
import { ArrowLeftRight } from "lucide-react";
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

const destinationLabel = (account: MoneyAccountDTO, storeNameById: Record<string, string>) => {
    if (account.scope === "store_scoped" && account.storeId) {
        return `${account.name} · ${storeNameById[account.storeId] ?? "Store"}`;
    }
    return `${account.name} · Every store`;
};

type TransferMoneyAccountFormProps = {
    moneyAccount: MoneyAccountDTO;
    destinationAccounts: MoneyAccountDTO[];
    storeNameById?: Record<string, string>;
    isPending?: boolean;
    defaultValues?: Partial<RecordMoneyAccountTransferJSON>;
    onCancel?: () => void;
    onSubmit: SubmitHandler<RecordMoneyAccountTransferJSON>;
};

export const TransferMoneyAccountForm = ({
    moneyAccount,
    destinationAccounts,
    storeNameById = {},
    isPending = false,
    defaultValues,
    onCancel,
    onSubmit,
}: TransferMoneyAccountFormProps) => {
    const form = useForm<RecordMoneyAccountTransferJSON>({
        resolver: zodResolver(RecordMoneyAccountTransferSchema),
        defaultValues: {
            destinationMoneyAccountId: undefined,
            amount: undefined,
            note: "",
            ...defaultValues,
        },
    });
    const destinationMoneyAccountId = form.watch("destinationMoneyAccountId");
    const amount = form.watch("amount");
    const eligibleDestinations = destinationAccounts.filter(
        (account) => account.status === "active" && account.id !== moneyAccount.id,
    );
    const destination = eligibleDestinations.find((account) => account.id === destinationMoneyAccountId);
    const canSubmit =
        Boolean(destination) &&
        destination?.id !== moneyAccount.id &&
        typeof amount === "number" &&
        Number.isFinite(amount) &&
        amount > 0 &&
        !form.formState.isSubmitting &&
        !isPending;

    return (
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <p className="text-sm text-muted-foreground">
                From {moneyAccount.name} · {formatCurrency(moneyAccount.balance)}
            </p>
            <Controller
                control={form.control}
                name="destinationMoneyAccountId"
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel required>Destination</FieldLabel>
                        <FieldContent>
                            {eligibleDestinations.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No other active Money Accounts are available to transfer to.
                                </p>
                            ) : (
                                <select
                                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                                    value={field.value ?? ""}
                                    onChange={(event) => {
                                        field.onChange(event.target.value || undefined);
                                    }}
                                >
                                    <option value="">Select a Money Account</option>
                                    {eligibleDestinations.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {destinationLabel(account, storeNameById)}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <FieldError errors={[fieldState.error]} />
                        </FieldContent>
                    </Field>
                )}
            />
            <Field data-invalid={!!form.formState.errors.amount}>
                <FieldLabel required>Amount</FieldLabel>
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
                    <p className="text-xs text-muted-foreground">
                        Cannot reduce the source balance below {formatCurrency(0)}. Reconcile first if earlier
                        activity was missed.
                    </p>
                    <FieldError errors={[form.formState.errors.amount]} />
                </FieldContent>
            </Field>
            <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Review</p>
                {typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? (
                    <div className="mt-1.5 space-y-1 text-sm">
                        <p className="flex items-center justify-between gap-3">
                            <span className="truncate">{moneyAccount.name}</span>
                            <span className="font-semibold tabular-nums text-destructive">
                                −{formatCurrency(amount)}
                            </span>
                        </p>
                        <p className="flex items-center justify-between gap-3">
                            <span className="truncate">{destination?.name ?? "Destination"}</span>
                            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                +{formatCurrency(amount)}
                            </span>
                        </p>
                    </div>
                ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                        Enter an amount to review both sides of the transfer.
                    </p>
                )}
            </div>
            <Field data-invalid={!!form.formState.errors.note}>
                <FieldLabel>
                    Note <span className="font-normal text-muted-foreground">(optional)</span>
                </FieldLabel>
                <FieldContent>
                    <Textarea
                        className="min-h-20 rounded-xl"
                        placeholder="e.g. Cash deposited to bank"
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
                    disabled={isPending}
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button type="submit" className="rounded-full" disabled={!canSubmit}>
                    {isPending ? "Transferring..." : "Transfer money"}
                </Button>
            </DialogFooter>
        </form>
    );
};

type TransferMoneyAccountDialogProps = {
    organizationId: string;
    moneyAccount: MoneyAccountDTO;
    storeNameById?: Record<string, string>;
    defaultOpen?: boolean;
};

const TransferMoneyAccountDialog = ({
    organizationId,
    moneyAccount,
    storeNameById = {},
    defaultOpen = false,
}: TransferMoneyAccountDialogProps) => {
    const [open, setOpen] = useState(defaultOpen);
    const queryClient = useQueryClient();
    const moneyAccountsQuery = useQuery({
        queryKey: moneyAccountKeys.list(organizationId),
        queryFn: () => getMoneyAccounts(organizationId),
        enabled: Boolean(organizationId) && open,
    });
    const destinationAccounts =
        moneyAccountsQuery.data?.status === "success"
            ? (moneyAccountsQuery.data.data?.moneyAccounts ?? []).filter(
                  (account) => account.status === "active" && account.id !== moneyAccount.id,
              )
            : [];

    const mutation = useMutation({
        mutationFn: (values: RecordMoneyAccountTransferJSON) =>
            recordMoneyAccountTransfer(organizationId, moneyAccount.id, values),
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
            toast.error(error.message ?? "Failed to transfer money");
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    <Button type="button" variant="outline" size="sm" className="rounded-full">
                        <ArrowLeftRight className="size-4" />
                        Transfer money
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader title="Transfer money" />
                <TransferMoneyAccountForm
                    key={open ? "open" : "closed"}
                    moneyAccount={moneyAccount}
                    destinationAccounts={destinationAccounts}
                    storeNameById={storeNameById}
                    isPending={mutation.isPending}
                    onCancel={() => setOpen(false)}
                    onSubmit={(values) => {
                        mutation.mutate({
                            destinationMoneyAccountId: values.destinationMoneyAccountId,
                            amount: values.amount,
                            note: values.note,
                        });
                    }}
                />
            </DialogContent>
        </Dialog>
    );
};

export default TransferMoneyAccountDialog;
