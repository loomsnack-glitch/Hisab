import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import {
    getCustomerLedger,
    getCustomers,
    getPosCustomers,
    updateCustomer,
    updatePosCustomer,
} from "@repo/services";
import {
    UpdateCustomerSchema,
    type CustomerDTO,
    type UpdateCustomerJSON,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { CheckCircle2, Eye, Pencil, Plus, Search, User, XCircle } from "lucide-react";
import { toast } from "sonner";

import CustomerQuickCreateDialog from "@/components/billing/customer-quick-create-dialog";
import type { BillingWorkspaceMode } from "@/lib/billing-mode";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { billingKeys } from "@/lib/query-keys";

type CustomerDirectoryProps = {
    mode: BillingWorkspaceMode;
    organizationId: string;
    selectedCustomerId?: string;
    onUseForOrder?: (customer: CustomerDTO) => void;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
};

type CustomerStatusFilter = "all" | "active" | "due";

type CustomerEditDialogProps = {
    mode: BillingWorkspaceMode;
    organizationId: string;
    customer: CustomerDTO | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
};

const CustomerEditDialog = ({
    mode,
    organizationId,
    customer,
    open,
    onOpenChange,
    onSaved,
}: CustomerEditDialogProps) => {
    const form = useForm<UpdateCustomerJSON>({
        resolver: zodResolver(UpdateCustomerSchema),
        defaultValues: {
            name: "",
            phone: "",
            isActive: true,
        },
    });
    const isActive = useWatch({ control: form.control, name: "isActive" });

    useEffect(() => {
        if (!customer) return;
        form.reset({
            name: customer.name,
            phone: customer.phone ?? "",
            isActive: customer.isActive,
        });
    }, [customer, form]);

    const mutation = useMutation({
        mutationFn: (values: UpdateCustomerJSON) =>
            mode === "device"
                ? updatePosCustomer(customer?.id ?? "", values)
                : updateCustomer(organizationId, customer?.id ?? "", values),
        onSuccess: (response) => {
            if (response.status !== "success") {
                toast.error(response.message || "Could not update customer");
                return;
            }

            toast.success("Customer updated");
            onSaved();
            onOpenChange(false);
        },
        onError: () => toast.error("Could not update customer"),
    });

    const onSubmit: SubmitHandler<UpdateCustomerJSON> = (values) => {
        if (!customer) return;
        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-2xl p-4 sm:w-full sm:p-6">
                <DialogHeader>
                    <DialogTitle>Edit customer</DialogTitle>
                    <DialogDescription>Update contact details or change the customer status.</DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    <Field data-invalid={!!form.formState.errors.name}>
                        <FieldLabel required>Name</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" placeholder="Customer name" {...form.register("name")} />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.phone}>
                        <FieldLabel>Phone</FieldLabel>
                        <FieldContent>
                            <Input className="h-11 rounded-xl" placeholder="Optional phone number" {...form.register("phone")} />
                            <FieldError errors={[form.formState.errors.phone]} />
                        </FieldContent>
                    </Field>

                    <Field>
                        <FieldLabel>Status</FieldLabel>
                        <Select
                            value={isActive ? "active" : "inactive"}
                            onValueChange={(value) => form.setValue("isActive", value === "active", { shouldDirty: true })}
                        >
                            <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>

                    <DialogFooter className="gap-2 pt-2 sm:gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const CustomerDirectory = ({
    mode,
    organizationId,
    selectedCustomerId,
    onUseForOrder,
    searchValue,
    onSearchChange,
}: CustomerDirectoryProps) => {
    const queryClient = useQueryClient();
    const [localSearch, setLocalSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>("all");
    const [editingCustomer, setEditingCustomer] = useState<CustomerDTO | null>(null);
    const [detailsCustomer, setDetailsCustomer] = useState<CustomerDTO | null>(null);
    const search = searchValue ?? localSearch;
    const deferredSearch = useDeferredValue(search.trim());
    const setSearch = onSearchChange ?? setLocalSearch;

    const customersQuery = useQuery({
        queryKey: billingKeys.customers(organizationId, { mode, search: deferredSearch }),
        queryFn: () =>
            mode === "device"
                ? getPosCustomers({ search: deferredSearch || undefined, limit: 100 })
                : getCustomers(organizationId, { search: deferredSearch || undefined, limit: 100 }),
        enabled: Boolean(organizationId),
    });

    const visibleCustomers = useMemo(
        () => {
            const customers =
                customersQuery.data?.status === "success" ? customersQuery.data.data?.customers ?? [] : [];

            return customers.filter((customer) => {
                if (statusFilter === "active") return customer.isActive;
                if (statusFilter === "due") return customer.balance > 0;
                return true;
            });
        },
        [customersQuery.data, statusFilter],
    );

    const ledgerQuery = useQuery({
        queryKey: billingKeys.customerLedger(organizationId, detailsCustomer?.id ?? ""),
        queryFn: () => getCustomerLedger(organizationId, detailsCustomer?.id ?? ""),
        enabled: mode === "admin" && Boolean(detailsCustomer?.id),
    });

    const invalidateCustomers = () => {
        void queryClient.invalidateQueries({ queryKey: billingKeys.organization(organizationId) });
    };

    const isLoading = customersQuery.isPending;
    const hasError = customersQuery.isError || customersQuery.data?.status === "error";

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Customer directory</p>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight">Customers</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage customer details and attach customers to bills.
                    </p>
                </div>
                <CustomerQuickCreateDialog
                    organizationId={organizationId}
                    mode={mode}
                    onCreated={invalidateCustomers}
                    trigger={
                        <Button>
                            <Plus className="size-4" />
                            Add customer
                        </Button>
                    }
                />
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:flex-row sm:items-center">
                {!onSearchChange ? <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="h-10 rounded-xl pl-9 pr-9"
                        placeholder="Search by name or phone..."
                        aria-label="Search customers"
                    />
                    {search ? (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Clear customer search"
                        >
                            <XCircle className="size-4" />
                        </button>
                    ) : null}
                </div> : null}
                {onSearchChange ? <p className="flex-1 text-sm text-muted-foreground">Use the header search to find a customer.</p> : null}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                    {([
                        ["all", "All"],
                        ["active", "Active"],
                        ["due", "Has due"],
                    ] as const).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setStatusFilter(value)}
                            className={
                                statusFilter === value
                                    ? "shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                                    : "shrink-0 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                            }
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{visibleCustomers.length} shown</span>
            </div>

            {isLoading ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-border/70 bg-card">
                    <Spinner className="size-6 text-primary" />
                </div>
            ) : hasError ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 p-6 text-center">
                    <p className="font-medium">Customers could not be loaded.</p>
                    <Button size="sm" variant="outline" onClick={() => void customersQuery.refetch()}>
                        Try again
                    </Button>
                </div>
            ) : visibleCustomers.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card p-6 text-center">
                    <User className="size-8 text-muted-foreground/50" />
                    <p className="mt-3 font-medium">No customers found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {search || statusFilter !== "all" ? "Try a different search or filter." : "Add your first customer to get started."}
                    </p>
                </div>
            ) : (
                <>
                    <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">Customer</th>
                                    <th className="px-4 py-3">Due</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Added</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {visibleCustomers.map((customer) => (
                                    <CustomerTableRow
                                        key={customer.id}
                                        customer={customer}
                                        selected={customer.id === selectedCustomerId}
                                        showUseAction={Boolean(onUseForOrder)}
                                        onUse={onUseForOrder}
                                        onDetails={setDetailsCustomer}
                                        onEdit={setEditingCustomer}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid gap-2 md:hidden">
                        {visibleCustomers.map((customer) => (
                            <CustomerCard
                                key={customer.id}
                                customer={customer}
                                selected={customer.id === selectedCustomerId}
                                showUseAction={Boolean(onUseForOrder)}
                                onUse={onUseForOrder}
                                onDetails={setDetailsCustomer}
                                onEdit={setEditingCustomer}
                            />
                        ))}
                    </div>
                </>
            )}

            <CustomerEditDialog
                mode={mode}
                organizationId={organizationId}
                customer={editingCustomer}
                open={Boolean(editingCustomer)}
                onOpenChange={(open) => {
                    if (!open) setEditingCustomer(null);
                }}
                onSaved={invalidateCustomers}
            />

            <Dialog open={Boolean(detailsCustomer)} onOpenChange={(open) => !open && setDetailsCustomer(null)}>
                <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-2xl p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>{detailsCustomer?.name}</DialogTitle>
                        <DialogDescription>{detailsCustomer?.phone || "No phone on file"}</DialogDescription>
                    </DialogHeader>
                    {detailsCustomer ? (
                        <div className="space-y-4">
                            <div className="overflow-hidden rounded-xl border border-border/60">
                                <dl className="grid grid-cols-2 divide-x divide-border/60">
                                    <div className="min-w-0 p-3">
                                        <dt className="text-[11px] text-muted-foreground">Due</dt>
                                        <dd className="mt-1 text-sm font-semibold">
                                            {formatCurrency(detailsCustomer.balance)}
                                        </dd>
                                    </div>
                                    <div className="min-w-0 p-3">
                                        <dt className="text-[11px] text-muted-foreground">Status</dt>
                                        <dd className="mt-1">
                                            <StatusBadge active={detailsCustomer.isActive} />
                                        </dd>
                                    </div>
                                </dl>
                                <dl className="border-t border-border/60 px-3 py-2.5">
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                        <dt className="text-xs text-muted-foreground">Added</dt>
                                        <dd className="text-right text-sm font-medium">
                                            {formatDateTime(detailsCustomer.createdAt)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                            {mode === "admin" ? (
                                <div className="rounded-xl border border-border/60">
                                    <div className="border-b border-border/60 px-3 py-2">
                                        <p className="text-sm font-semibold">Ledger</p>
                                    </div>
                                    {ledgerQuery.isPending ? (
                                        <div className="flex justify-center p-6"><Spinner className="size-5" /></div>
                                    ) : ledgerQuery.data?.status !== "success" ? (
                                        <p className="p-4 text-sm text-muted-foreground">Ledger could not be loaded.</p>
                                    ) : ledgerQuery.data.data?.ledger.length ? (
                                        <div className="divide-y divide-border/60">
                                            {ledgerQuery.data.data.ledger.slice(0, 8).map((entry) => (
                                                <div key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                                    <div>
                                                        <p className="font-medium capitalize">{entry.entryType}</p>
                                                        <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                                                    </div>
                                                    <p className="font-semibold">{formatCurrency(entry.amount)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="p-4 text-sm text-muted-foreground">No ledger entries yet.</p>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
};

type CustomerRowProps = {
    customer: CustomerDTO;
    selected: boolean;
    showUseAction: boolean;
    onUse?: (customer: CustomerDTO) => void;
    onDetails: (customer: CustomerDTO) => void;
    onEdit: (customer: CustomerDTO) => void;
};

const CustomerActions = ({ customer, selected, showUseAction, onUse, onDetails, onEdit }: CustomerRowProps) => (
    <div className="flex items-center justify-end gap-1">
        {showUseAction ? (
            <Button size="sm" variant={selected ? "secondary" : "outline"} disabled={!customer.isActive} onClick={() => onUse?.(customer)}>
                {selected ? "Selected" : "Use for order"}
            </Button>
        ) : null}
        <Button size="icon-sm" variant="ghost" onClick={() => onDetails(customer)} aria-label={`View ${customer.name}`}>
            <Eye className="size-4" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={() => onEdit(customer)} aria-label={`Edit ${customer.name}`}>
            <Pencil className="size-4" />
        </Button>
    </div>
);

const CustomerTableRow = ({ customer, ...props }: CustomerRowProps) => (
    <tr className="hover:bg-muted/20">
        <td className="px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <CustomerAvatar name={customer.name} />
                <div className="min-w-0">
                    <p className="truncate font-semibold">{customer.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{customer.phone || "No phone on file"}</p>
                </div>
            </div>
        </td>
        <td className="px-4 py-3 font-semibold">{formatCurrency(customer.balance)}</td>
        <td className="px-4 py-3"><StatusBadge active={customer.isActive} /></td>
        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(customer.createdAt)}</td>
        <td className="px-4 py-3"><CustomerActions customer={customer} {...props} /></td>
    </tr>
);

const CustomerCard = ({ customer, ...props }: CustomerRowProps) => (
    <div className="rounded-2xl border border-border/70 bg-card p-3">
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <CustomerAvatar name={customer.name} />
                <div className="min-w-0">
                    <p className="truncate font-semibold">{customer.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{customer.phone || "No phone on file"}</p>
                </div>
            </div>
            <StatusBadge active={customer.isActive} />
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
            <div>
                <p className="text-[11px] text-muted-foreground">Due</p>
                <p className="font-semibold">{formatCurrency(customer.balance)}</p>
            </div>
            <CustomerActions customer={customer} {...props} />
        </div>
    </div>
);

const CustomerAvatar = ({ name }: { name: string }) => (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {name.trim().charAt(0).toUpperCase() || <User className="size-4" />}
    </div>
);

const StatusBadge = ({ active }: { active: boolean }) => (
    <span className={active ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400" : "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"}>
        {active ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
        {active ? "Active" : "Inactive"}
    </span>
);

export default CustomerDirectory;
