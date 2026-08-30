import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { createMoneyAccount, getOrganizationDetails, updateMoneyAccount } from "@repo/services";
import {
    CreateMoneyAccountSchema,
    MONEY_ACCOUNT_SCOPE_LABELS,
    MoneyAccountScopeSchema,
    MoneyAccountStatusSchema,
    ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS,
    OrganizationWideMoneyAccountTypeSchema,
    type CreateMoneyAccountJSON,
    type MoneyAccountDTO,
    type MoneyAccountScope,
    type MoneyAccountStatus,
    type OrganizationWideMoneyAccountType,
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
import { Pencil, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { moneyAccountKeys, organizationKeys } from "@/lib/query-keys";

type UpsertMoneyAccountDialogProps = {
    organizationId: string;
    moneyAccount?: MoneyAccountDTO;
    trigger?: React.ReactElement;
};

const defaultValues: CreateMoneyAccountJSON = {
    name: "",
    type: "bank",
    scope: "organization_wide",
    storeId: null,
    notes: "",
    status: "active",
};

const typeSelectOptions = OrganizationWideMoneyAccountTypeSchema.options.map((type) => ({
    label: ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS[type],
    value: type,
}));

const scopeSelectOptions = MoneyAccountScopeSchema.options.map((scope) => ({
    label: MONEY_ACCOUNT_SCOPE_LABELS[scope],
    value: scope,
}));

const statusSelectOptions = MoneyAccountStatusSchema.options.map((status) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
}));

const valuesFromAccount = (moneyAccount: MoneyAccountDTO): CreateMoneyAccountJSON => ({
    name: moneyAccount.name,
    type: moneyAccount.type,
    scope: moneyAccount.scope,
    storeId: moneyAccount.storeId,
    notes: moneyAccount.notes ?? "",
    status: moneyAccount.status,
});

const UpsertMoneyAccountDialog = ({
    organizationId,
    moneyAccount,
    trigger,
}: UpsertMoneyAccountDialogProps) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();
    const isEditMode = Boolean(moneyAccount);

    const form = useForm<CreateMoneyAccountJSON>({
        resolver: zodResolver(CreateMoneyAccountSchema),
        defaultValues: moneyAccount ? valuesFromAccount(moneyAccount) : defaultValues,
    });

    const selectedScope = (useWatch({ control: form.control, name: "scope" }) ?? "organization_wide") as MoneyAccountScope;

    const storesQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: open && Boolean(organizationId),
    });

    const stores =
        storesQuery.data?.status === "success"
            ? storesQuery.data.data?.organization.stores ?? []
            : [];

    const storeSelectOptions = useMemo(
        () => stores.map((store) => ({ label: store.name, value: store.id })),
        [stores],
    );

    useEffect(() => {
        if (!open) {
            form.reset(moneyAccount ? valuesFromAccount(moneyAccount) : defaultValues);
        }
    }, [form, open, moneyAccount]);

    const mutation = useMutation({
        mutationFn: (data: CreateMoneyAccountJSON) => {
            const payload = {
                name: data.name,
                type: data.type,
                scope: data.scope ?? "organization_wide",
                storeId: (data.scope ?? "organization_wide") === "store_scoped" ? data.storeId : null,
                notes: data.notes,
                status: data.status,
            };

            return moneyAccount
                ? updateMoneyAccount(organizationId, moneyAccount.id, payload)
                : createMoneyAccount(organizationId, payload);
        },
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: moneyAccountKeys.list(organizationId) });
                setOpen(false);
                form.reset(defaultValues);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? `Failed to ${isEditMode ? "update" : "create"} money account`);
        },
    });

    const onSubmit: SubmitHandler<CreateMoneyAccountJSON> = (values) => {
        const scope = (values.scope ?? "organization_wide") as MoneyAccountScope;
        mutation.mutate({
            name: values.name.trim(),
            type: values.type,
            scope,
            storeId: scope === "store_scoped" ? values.storeId : null,
            notes: values.notes ?? "",
            status: (values.status ?? "active") as MoneyAccountStatus,
        });
    };

    const title = isEditMode ? "Edit money account" : "Add money account";

    return (
        <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant={isEditMode ? "outline" : "default"} className="rounded-full">
                            {isEditMode ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                            {isEditMode ? "Edit" : "Add money account"}
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-md">
                <DialogHeader icon={<Wallet className="size-5" />} title={title} />

                <form className="space-y-5 pt-2" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Account name</FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 rounded-xl"
                                placeholder="e.g. HDFC Current"
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Controller
                        control={form.control}
                        name="type"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Account type</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={typeSelectOptions}
                                        value={
                                            typeSelectOptions.find((option) => option.value === field.value) ?? null
                                        }
                                        onChange={(option) =>
                                            field.onChange(
                                                (option?.value ?? "bank") as OrganizationWideMoneyAccountType,
                                            )
                                        }
                                        classNames={{
                                            control: () => "!min-h-11 rounded-xl",
                                        }}
                                    />
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="scope"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Availability</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={scopeSelectOptions}
                                        value={
                                            scopeSelectOptions.find((option) => option.value === field.value) ?? null
                                        }
                                        onChange={(option) => {
                                            const scope = (option?.value ?? "organization_wide") as MoneyAccountScope;
                                            field.onChange(scope);
                                            if (scope === "organization_wide") {
                                                form.setValue("storeId", null, { shouldValidate: true });
                                            }
                                        }}
                                        classNames={{
                                            control: () => "!min-h-11 rounded-xl",
                                        }}
                                    />
                                    <FieldError errors={[fieldState.error]} />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    {selectedScope === "store_scoped" ? (
                        <Controller
                            control={form.control}
                            name="storeId"
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel required>Store</FieldLabel>
                                    <FieldContent>
                                        <ReactSelect
                                            options={storeSelectOptions}
                                            placeholder="Select store"
                                            isLoading={storesQuery.isPending}
                                            value={
                                                storeSelectOptions.find((option) => option.value === field.value) ?? null
                                            }
                                            onChange={(option) => field.onChange(option?.value ?? null)}
                                            classNames={{
                                                control: () => "!min-h-11 rounded-xl",
                                            }}
                                        />
                                        {storesQuery.isSuccess && storeSelectOptions.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">
                                                Add a Store in this Organization before creating a Store-scoped account.
                                            </p>
                                        ) : null}
                                        <FieldError errors={[fieldState.error]} />
                                    </FieldContent>
                                </Field>
                            )}
                        />
                    ) : null}

                    <Field data-invalid={!!form.formState.errors.notes}>
                        <FieldLabel>
                            Notes <span className="font-normal text-muted-foreground">(optional)</span>
                        </FieldLabel>
                        <FieldContent>
                            <Textarea
                                className="min-h-24 rounded-xl"
                                placeholder="e.g. Main operating account"
                                {...form.register("notes")}
                            />
                            <FieldError errors={[form.formState.errors.notes]} />
                        </FieldContent>
                    </Field>

                    <Controller
                        control={form.control}
                        name="status"
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                                <FieldLabel required>Status</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={statusSelectOptions}
                                        value={
                                            statusSelectOptions.find(
                                                (option) => option.value === (field.value ?? "active"),
                                            ) ?? null
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
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending
                                ? isEditMode ? "Saving..." : "Creating..."
                                : isEditMode ? "Save changes" : "Add money account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UpsertMoneyAccountDialog;
