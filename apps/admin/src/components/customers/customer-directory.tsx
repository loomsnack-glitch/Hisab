import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import {
    getCustomerLedger,
    getCustomers,
    getPosCustomers,
    queuePosWhatsAppDueReminder,
    queueWhatsAppDueReminder,
    updateCustomer,
    updatePosCustomer,
} from "@repo/services";
import {
    UpdateCustomerSchema,
    type CustomerActivityStatus,
    type CustomerDTO,
    type CustomerDueOption,
    type CustomerListQuery,
    type UpdateCustomerJSON,
    normalizePhoneNumber,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { DataTableFacetedFilter } from "@repo/ui/components/data-table-faceted-filter";
import { DataTableSortFilter } from "@repo/ui/components/data-table-sort-filter";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { FilterOptionsList } from "@repo/ui/components/filter-options-list";
import { Input } from "@repo/ui/components/input";
import { PhoneInput } from "@repo/ui/components/phone-input";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@repo/ui/components/sheet";
import { Spinner } from "@repo/ui/components/spinner";
import { createTablePaginationState, DataTablePagination } from "@repo/ui/components/table-pagination";
import { cn } from "@repo/ui/lib/utils";
import {
    ArrowUpDown,
    CheckCircle2,
    CircleCheck,
    Eye,
    Filter,
    IndianRupee,
    Pencil,
    Plus,
    PlusCircle,
    Search,
    User,
    X,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";

import CustomerQuickCreateDialog from "@/components/billing/customer-quick-create-dialog";
import type { BillingWorkspaceMode } from "@/lib/billing-mode";
import { formatCurrency, formatDateOnly, formatDateTime } from "@/lib/format";
import { billingKeys } from "@/lib/query-keys";

type CustomerDirectoryProps = {
    mode: BillingWorkspaceMode;
    organizationId: string;
    storeId?: string;
    selectedCustomerId?: string;
    onUseForOrder?: (customer: CustomerDTO) => void;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
};

type CustomerSortOption = NonNullable<CustomerListQuery["sort"]>;

const customerActivityStatusFilterOptions: Array<{ value: CustomerActivityStatus; label: string }> = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
];

const customerDueFilterOptions: Array<{ value: CustomerDueOption; label: string }> = [
    { value: "has_due", label: "Has due" },
    { value: "no_due", label: "No due" },
];

const customerStatusSelectOptions = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
] as const;

const customerSortOptions: Array<{ value: CustomerSortOption; label: string }> = [
    { value: "newest", label: "Recently added" },
    { value: "oldest", label: "Oldest first" },
    { value: "name_asc", label: "Name A–Z" },
    { value: "name_desc", label: "Name Z–A" },
    { value: "highest_due", label: "Highest due" },
    { value: "lowest_due", label: "Lowest due" },
];

const customerPaginationColumns: ColumnDef<CustomerDTO>[] = [{ accessorKey: "id", header: "ID" }];

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
            marketingOptedOut: false,
        },
    });
    useEffect(() => {
        if (!customer) return;
        form.reset({
            name: customer.name,
            phone: normalizePhoneNumber(customer.phone) ?? "",
            isActive: customer.isActive,
            marketingOptedOut: customer.marketingOptedOut,
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
        <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
            <DialogContent className="sm:max-w-md">
                <DialogHeader icon={<User className="size-5" />} title="Edit customer" />

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

                    <Controller
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                            <Field>
                                <FieldLabel required>Status</FieldLabel>
                                <FieldContent>
                                    <ReactSelect
                                        options={customerStatusSelectOptions}
                                        value={
                                            customerStatusSelectOptions.find(
                                                (option) => option.value === (field.value ? "active" : "inactive"),
                                            ) ?? null
                                        }
                                        onChange={(option) => field.onChange(option?.value === "active")}
                                        classNames={{
                                            control: () => "!min-h-11 rounded-xl",
                                        }}
                                    />
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <label className="flex items-start gap-3 rounded-xl border border-border/60 p-3 text-sm">
                        <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...form.register("marketingOptedOut")} />
                        <span>
                            <span className="font-medium">Do not send promotions</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">Bill and due reminders are not affected.</span>
                        </span>
                    </label>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => onOpenChange(false)}
                            disabled={mutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                            disabled={mutation.isPending}
                        >
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
    storeId,
    selectedCustomerId,
    onUseForOrder,
    searchValue,
    onSearchChange,
}: CustomerDirectoryProps) => {
    const queryClient = useQueryClient();
    const [localSearch, setLocalSearch] = useState("");
    const [statusFilters, setStatusFilters] = useState<CustomerActivityStatus[]>([]);
    const [dueFilters, setDueFilters] = useState<CustomerDueOption[]>([]);
    const [sortBy, setSortBy] = useState<CustomerSortOption>("newest");
    const [editingCustomer, setEditingCustomer] = useState<CustomerDTO | null>(null);
    const [detailsCustomer, setDetailsCustomer] = useState<CustomerDTO | null>(null);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [draftStatusFilters, setDraftStatusFilters] = useState<CustomerActivityStatus[]>([]);
    const [draftDueFilters, setDraftDueFilters] = useState<CustomerDueOption[]>([]);
    const [draftSortBy, setDraftSortBy] = useState<CustomerSortOption>("newest");
    const [pagination, setPagination] = useState(createTablePaginationState);
    const customerLoadMoreRef = useRef<HTMLDivElement | null>(null);
    const currentPage = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;
    const search = searchValue ?? localSearch;
    const deferredSearch = useDeferredValue(search.trim());
    const setSearch = onSearchChange ?? setLocalSearch;
    const usePagedCustomers = mode === "admin";

    const statusFilterSelection = useMemo(() => new Set(statusFilters), [statusFilters]);
    const dueFilterSelection = useMemo(() => new Set(dueFilters), [dueFilters]);

    const customerFilterParams = useMemo(
        () => ({
            search: deferredSearch || undefined,
            statuses: statusFilters.length > 0 ? statusFilters : undefined,
            dues: dueFilters.length > 0 ? dueFilters : undefined,
            sort: sortBy,
        }),
        [deferredSearch, dueFilters, sortBy, statusFilters],
    );

    const pagedCustomerQueryParams = useMemo<CustomerListQuery>(
        () => ({
            ...customerFilterParams,
            page: currentPage,
            limit: pageSize,
        }),
        [customerFilterParams, currentPage, pageSize],
    );

    const infiniteCustomerQueryParams = useMemo<CustomerListQuery>(
        () => ({
            ...customerFilterParams,
            limit: 40,
        }),
        [customerFilterParams],
    );

    const customersPagedQuery = useQuery({
        queryKey: billingKeys.customers(organizationId, { mode, ...pagedCustomerQueryParams }),
        queryFn: async () => {
            const response = await getCustomers(organizationId, pagedCustomerQueryParams);
            if (response.status === "error") {
                throw new Error(response.message || "Customers failed to load");
            }
            return response;
        },
        enabled: Boolean(organizationId) && usePagedCustomers,
    });

    const customersInfiniteQuery = useInfiniteQuery({
        queryKey: billingKeys.customers(organizationId, { mode, ...infiniteCustomerQueryParams }),
        initialPageParam: null as string | null,
        queryFn: async ({ pageParam }) => {
            const params = { ...infiniteCustomerQueryParams, cursor: pageParam ?? undefined };
            const response =
                mode === "device" ? await getPosCustomers(params) : await getCustomers(organizationId, params);
            if (response.status === "error") {
                throw new Error(response.message || "Customers failed to load");
            }
            return response;
        },
        getNextPageParam: (lastPage) =>
            lastPage.status === "success" && lastPage.data?.pageInfo.hasMore
                ? lastPage.data.pageInfo.nextCursor ?? undefined
                : undefined,
        enabled: Boolean(organizationId) && !usePagedCustomers,
    });

    const pagedCustomerData =
        customersPagedQuery.data?.status === "success" ? customersPagedQuery.data.data : null;
    const customerPages = customersInfiniteQuery.data?.pages ?? [];
    const firstCustomerPage = customerPages.find((page) => page.status === "success");
    const visibleCustomers = useMemo(
        () =>
            usePagedCustomers
                ? pagedCustomerData?.customers ?? []
                : customerPages.flatMap((page) =>
                      page.status === "success" ? page.data?.customers ?? [] : [],
                  ),
        [customerPages, pagedCustomerData?.customers, usePagedCustomers],
    );
    const totalCustomerCount = usePagedCustomers
        ? pagedCustomerData?.pageInfo.totalCount ?? 0
        : firstCustomerPage?.status === "success"
          ? firstCustomerPage.data?.pageInfo.totalCount ?? visibleCustomers.length
          : visibleCustomers.length;
    const pageCount = usePagedCustomers
        ? pagedCustomerData?.pageInfo.totalPages ?? Math.max(1, Math.ceil(totalCustomerCount / pageSize))
        : 1;

    const customersTable = useReactTable({
        data: usePagedCustomers ? visibleCustomers : [],
        columns: customerPaginationColumns,
        pageCount,
        state: { pagination },
        onPaginationChange: setPagination,
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
        autoResetPageIndex: false,
    });

    const ledgerQuery = useQuery({
        queryKey: billingKeys.customerLedger(organizationId, detailsCustomer?.id ?? ""),
        queryFn: () => getCustomerLedger(organizationId, detailsCustomer?.id ?? ""),
        enabled: mode === "admin" && Boolean(detailsCustomer?.id),
    });

    const dueReminderMutation = useMutation({
        mutationFn: () => {
            if (!storeId || !detailsCustomer?.id) return Promise.reject(new Error("Select a Store before sending a reminder"));
            return mode === "device"
                ? queuePosWhatsAppDueReminder(detailsCustomer.id)
                : queueWhatsAppDueReminder(organizationId, storeId, detailsCustomer.id);
        },
        onSuccess: response => {
            if (response.status === "success") toast.success("Due reminder queued for WhatsApp");
            else toast.error(response.message || "Due reminder could not be queued");
        },
        onError: (error: { message?: string }) => toast.error(error?.message || "Due reminder could not be queued"),
    });

    const invalidateCustomers = () => {
        void queryClient.invalidateQueries({ queryKey: billingKeys.organization(organizationId) });
    };

    const isLoading = usePagedCustomers
        ? customersPagedQuery.isPending
        : customersInfiniteQuery.isPending;
    const hasError = usePagedCustomers
        ? customersPagedQuery.isError
        : customerPages.length === 0 && customersInfiniteQuery.isError;
    const refetchCustomers = usePagedCustomers
        ? customersPagedQuery.refetch
        : customersInfiniteQuery.refetch;
    const toolbarFilterCount = statusFilters.length + dueFilters.length + (sortBy !== "newest" ? 1 : 0);
    const hasToolbarFilters = toolbarFilterCount > 0;
    const hasActiveFilters = Boolean(search.trim()) || hasToolbarFilters;
    const draftFilterCount =
        draftStatusFilters.length + draftDueFilters.length + (draftSortBy !== "newest" ? 1 : 0);

    const toggleDraftStatusFilter = (value: string) => {
        setDraftStatusFilters((previous) =>
            previous.includes(value as CustomerActivityStatus)
                ? previous.filter((item) => item !== value)
                : [...previous, value as CustomerActivityStatus],
        );
    };

    const toggleDraftDueFilter = (value: string) => {
        setDraftDueFilters((previous) =>
            previous.includes(value as CustomerDueOption)
                ? previous.filter((item) => item !== value)
                : [...previous, value as CustomerDueOption],
        );
    };

    const resetFilters = () => {
        setSearch("");
        setStatusFilters([]);
        setDueFilters([]);
        setSortBy("newest");
    };
    const clearToolbarFilters = () => {
        setStatusFilters([]);
        setDueFilters([]);
        setSortBy("newest");
    };
    const handleMobileFiltersOpenChange = (open: boolean) => {
        if (open) {
            setDraftStatusFilters(statusFilters);
            setDraftDueFilters(dueFilters);
            setDraftSortBy(sortBy);
        }
        setMobileFiltersOpen(open);
    };
    const applyMobileFilters = () => {
        setStatusFilters(draftStatusFilters);
        setDueFilters(draftDueFilters);
        setSortBy(draftSortBy);
        setMobileFiltersOpen(false);
    };

    useEffect(() => {
        if (!usePagedCustomers) return;
        setPagination((previous) => ({ ...previous, pageIndex: 0 }));
    }, [customerFilterParams, usePagedCustomers]);

    useEffect(() => {
        if (!usePagedCustomers || !pagedCustomerData?.pageInfo.totalPages) return;
        if (pagination.pageIndex + 1 > pagedCustomerData.pageInfo.totalPages) {
            setPagination((previous) => ({
                ...previous,
                pageIndex: pagedCustomerData.pageInfo.totalPages - 1,
            }));
        }
    }, [pagination.pageIndex, pagedCustomerData?.pageInfo.totalPages, usePagedCustomers]);

    useEffect(() => {
        if (usePagedCustomers) return;

        const target = customerLoadMoreRef.current;
        if (!target || !customersInfiniteQuery.hasNextPage) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && !customersInfiniteQuery.isFetchingNextPage) {
                    void customersInfiniteQuery.fetchNextPage();
                }
            },
            { rootMargin: "240px" },
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [
        customersInfiniteQuery.fetchNextPage,
        customersInfiniteQuery.hasNextPage,
        customersInfiniteQuery.isFetchingNextPage,
        usePagedCustomers,
    ]);

    return (
        <div
            className={cn(
                usePagedCustomers
                    ? "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
                    : "space-y-3",
            )}
        >
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleMobileFiltersOpenChange(true)}
                        aria-label="Filter customers"
                        className={cn(
                            "relative h-10 w-10 shrink-0 rounded-full border-border/60 bg-card/60 p-0 shadow-2xs sm:hidden",
                            hasToolbarFilters
                                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                                : "text-muted-foreground",
                        )}
                    >
                        <Filter className="size-4" />
                        {toolbarFilterCount > 0 ? (
                            <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold leading-none text-primary-foreground ring-2 ring-card">
                                {toolbarFilterCount}
                            </span>
                        ) : null}
                    </Button>

                    <div className="relative min-w-[180px] flex-1 max-w-sm group/search">
                        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                        <Input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="h-10 w-full rounded-full border border-border/60 bg-card/60 pl-10 pr-9 text-sm shadow-2xs transition-all duration-200 focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/40"
                            placeholder="Search customers..."
                            aria-label="Search customers"
                        />
                        {search ? (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground cursor-pointer"
                                aria-label="Clear search"
                            >
                                <X className="size-3.5" />
                            </button>
                        ) : null}
                    </div>

                    <CustomerQuickCreateDialog
                        organizationId={organizationId}
                        mode={mode}
                        onCreated={invalidateCustomers}
                        trigger={
                            <Button
                                type="button"
                                aria-label="Add customer"
                                className="h-10 w-10 shrink-0 rounded-full bg-primary p-0 text-primary-foreground shadow-xs shadow-primary/20 hover:bg-primary/90 sm:hidden"
                            >
                                <Plus className="size-4" />
                            </Button>
                        }
                    />

                    <div className="hidden sm:flex items-center gap-2">
                        <DataTableFacetedFilter
                            title="Status"
                            icon={CircleCheck}
                            options={customerActivityStatusFilterOptions}
                            selectedValues={statusFilterSelection}
                            onSelectedValuesChange={(values) =>
                                setStatusFilters(Array.from(values) as CustomerActivityStatus[])
                            }
                        />
                        <DataTableFacetedFilter
                            title="Due"
                            icon={IndianRupee}
                            options={customerDueFilterOptions}
                            selectedValues={dueFilterSelection}
                            onSelectedValuesChange={(values) =>
                                setDueFilters(Array.from(values) as CustomerDueOption[])
                            }
                        />
                        <DataTableSortFilter
                            title="Sort"
                            icon={ArrowUpDown}
                            value={sortBy}
                            onValueChange={(value) => setSortBy(value as CustomerSortOption)}
                            options={customerSortOptions}
                        />
                        {hasToolbarFilters ? (
                            <Button
                                variant="ghost"
                                onClick={clearToolbarFilters}
                                className="h-9 shrink-0 cursor-pointer gap-1.5 rounded-full px-3 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive animate-in fade-in slide-in-from-left-2 duration-200"
                            >
                                <X className="size-3.5" />
                                <span>Clear Filters</span>
                            </Button>
                        ) : null}
                    </div>
                </div>

                <div className="hidden sm:flex flex-wrap items-center gap-2">
                    <CustomerQuickCreateDialog
                        organizationId={organizationId}
                        mode={mode}
                        onCreated={invalidateCustomers}
                        trigger={
                            <Button className="h-10 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground shadow-xs shadow-primary/20 hover:bg-primary/90 sm:px-5 sm:text-sm">
                                <PlusCircle className="size-4" />
                                Add customer
                            </Button>
                        }
                    />
                </div>
            </div>

            {!usePagedCustomers && !isLoading && !hasError && totalCustomerCount > 0 ? (
                <div className="flex items-center justify-between px-1 pt-0 pb-0.5">
                    <span className="text-xs text-muted-foreground/70" aria-live="polite">
                        Showing {totalCustomerCount.toLocaleString()} customer{totalCustomerCount === 1 ? "" : "s"}
                    </span>
                </div>
            ) : null}

            {isLoading ? (
                <div
                    className={cn(
                        "flex items-center justify-center rounded-2xl border border-border/70 bg-card",
                        usePagedCustomers ? "min-h-0 flex-1" : "min-h-[260px]",
                    )}
                >
                    <Spinner className="size-6 text-primary" />
                </div>
            ) : hasError ? (
                <div
                    className={cn(
                        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 p-6 text-center",
                        usePagedCustomers ? "min-h-0 flex-1" : "min-h-[260px]",
                    )}
                >
                    <p className="font-medium">Customers could not be loaded.</p>
                    <Button size="sm" variant="outline" onClick={() => void refetchCustomers()}>
                        Try again
                    </Button>
                </div>
            ) : visibleCustomers.length === 0 ? (
                <div
                    className={cn(
                        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card p-6 text-center",
                        usePagedCustomers ? "min-h-0 flex-1" : "min-h-[260px]",
                    )}
                >
                    <User className="size-8 text-muted-foreground/50" />
                    <p className="mt-3 font-medium">No customers found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {hasActiveFilters ? "Try a different search or filter." : "Add your first customer to get started."}
                    </p>
                    {hasActiveFilters ? (
                        <Button type="button" variant="outline" size="sm" className="mt-4 rounded-full" onClick={resetFilters}>
                            Clear all filters
                        </Button>
                    ) : null}
                </div>
            ) : usePagedCustomers ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card md:flex">
                        <div className="min-h-0 flex-1 overflow-auto">
                            <table className="min-w-[760px] w-full text-left text-sm">
                                <thead className="sticky top-0 z-10 border-b border-border/50 bg-card/90 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-md">
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

                        <DataTablePagination
                            table={customersTable}
                            count={totalCustomerCount}
                            countLabel="customers"
                            className="shrink-0 border-t border-border/40 bg-card/90 px-4 pt-3.5 backdrop-blur-md"
                        />
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
                        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-auto">
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

                        <DataTablePagination
                            table={customersTable}
                            count={totalCustomerCount}
                            countLabel="customers"
                            className="shrink-0 px-0 pb-0 pt-2"
                        />
                    </div>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-[760px] w-full text-left text-sm">
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

                    <div className="grid grid-cols-1 gap-2.5 md:hidden">
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
                </div>
            )}

            {!usePagedCustomers && customersInfiniteQuery.isFetchNextPageError ? (
                <div className="flex justify-center py-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => void customersInfiniteQuery.fetchNextPage()}
                    >
                        Retry loading customers
                    </Button>
                </div>
            ) : !usePagedCustomers && customersInfiniteQuery.hasNextPage ? (
                <div
                    ref={customerLoadMoreRef}
                    className="flex min-h-14 items-center justify-center py-3"
                    aria-live="polite"
                >
                    {customersInfiniteQuery.isFetchingNextPage ? <Spinner className="size-5 text-primary" /> : null}
                </div>
            ) : !usePagedCustomers && totalCustomerCount > 0 && customerPages.length > 1 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">All customers loaded</p>
            ) : null}

            <Sheet open={mobileFiltersOpen} onOpenChange={handleMobileFiltersOpenChange}>
                <SheetContent
                    side="bottom"
                    className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-2xl px-0 pt-4 sm:hidden"
                >
                    <SheetHeader className="shrink-0 space-y-0 px-6 pb-4 pt-0 pr-14 text-left">
                        <div className="flex items-center justify-between gap-3">
                            <SheetTitle className="text-lg">Filter customers</SheetTitle>
                            {draftFilterCount > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDraftStatusFilters([]);
                                        setDraftDueFilters([]);
                                        setDraftSortBy("newest");
                                    }}
                                    className="shrink-0 text-sm font-semibold text-primary hover:underline"
                                >
                                    Clear all
                                </button>
                            ) : (
                                <span className="invisible shrink-0 text-sm font-semibold">Clear all</span>
                            )}
                        </div>
                    </SheetHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border/50 px-6 py-4">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5 px-1 py-1">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <CircleCheck className="size-4" />
                                    </span>
                                    <p className="text-sm font-semibold text-foreground">Status</p>
                                </div>
                                <FilterOptionsList
                                    hideHeader
                                    mode="multiple"
                                    options={customerActivityStatusFilterOptions}
                                    selectedValues={draftStatusFilters}
                                    onToggle={toggleDraftStatusFilter}
                                    onClear={() => setDraftStatusFilters([])}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5 px-1 py-1">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <IndianRupee className="size-4" />
                                    </span>
                                    <p className="text-sm font-semibold text-foreground">Due</p>
                                </div>
                                <FilterOptionsList
                                    hideHeader
                                    mode="multiple"
                                    options={customerDueFilterOptions}
                                    selectedValues={draftDueFilters}
                                    onToggle={toggleDraftDueFilter}
                                    onClear={() => setDraftDueFilters([])}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5 px-1 py-1">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <ArrowUpDown className="size-4" />
                                    </span>
                                    <p className="text-sm font-semibold text-foreground">Sort</p>
                                </div>
                                <FilterOptionsList
                                    hideHeader
                                    mode="single"
                                    options={customerSortOptions}
                                    selectedValues={[draftSortBy]}
                                    onToggle={(value) => setDraftSortBy(value as CustomerSortOption)}
                                />
                            </div>
                        </div>
                    </div>

                    <SheetFooter className="shrink-0 border-t border-border/50 px-6 py-4">
                        <Button type="button" onClick={applyMobileFilters} className="w-full rounded-xl">
                            Apply filters
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

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
                                {storeId && detailsCustomer.balance > 0 ? (
                                    <div className="flex justify-end border-t border-border/60 p-3">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={dueReminderMutation.isPending}
                                            onClick={() => dueReminderMutation.mutate()}
                                        >
                                            {dueReminderMutation.isPending ? "Queueing..." : "Send due reminder"}
                                        </Button>
                                    </div>
                                ) : null}
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
    <div className="flex flex-wrap items-center justify-end gap-1">
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

const CustomerCard = ({
    customer,
    selected,
    showUseAction,
    onUse,
    onDetails,
    onEdit,
}: CustomerRowProps) => {
    const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
    const addedTime = customer.createdAt
        ? new Date(customer.createdAt).toLocaleTimeString(undefined, { timeStyle: "short" })
        : "—";

    const openView = () => {
        setMobileActionsOpen(false);
        onDetails(customer);
    };

    const openEdit = () => {
        setMobileActionsOpen(false);
        onEdit(customer);
    };

    const openUseForOrder = () => {
        setMobileActionsOpen(false);
        onUse?.(customer);
    };

    return (
        <div className="group relative">
            <div className="rounded-2xl border border-border/70 bg-card p-3 transition-colors active:bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <CustomerAvatar name={customer.name} />
                        <div className="min-w-0">
                            <p className="truncate font-semibold">{customer.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                                {customer.phone || "No phone on file"}
                            </p>
                        </div>
                    </div>
                    <StatusBadge active={customer.isActive} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5">
                        <p className="text-[11px] font-medium text-muted-foreground">Due</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums">
                            {formatCurrency(customer.balance)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5">
                        <p className="text-[11px] font-medium text-muted-foreground">Added</p>
                        <p className="mt-0.5 text-sm font-semibold">{formatDateOnly(customer.createdAt)}</p>
                        <p className="text-[11px] text-muted-foreground">{addedTime}</p>
                    </div>
                </div>
            </div>

            <button
                type="button"
                aria-label={`${customer.name} actions`}
                className="absolute inset-0 z-10 rounded-2xl"
                onClick={() => setMobileActionsOpen(true)}
            />

            <Sheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
                <SheetContent
                    side="bottom"
                    showCloseButton={false}
                    className="mx-auto w-full max-w-md gap-0 overflow-visible border-0 bg-transparent px-4 pt-2 shadow-none data-[side=bottom]:bottom-[var(--pos-mobile-nav-height,0px)] data-[side=bottom]:border-0 data-[side=bottom]:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
                >
                    <SheetTitle className="sr-only">{customer.name} actions</SheetTitle>
                    <div className="space-y-2 pb-2">
                        {showUseAction ? (
                            <button
                                type="button"
                                onClick={openUseForOrder}
                                disabled={!customer.isActive}
                                className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-card/95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <CircleCheck className="size-5" />
                                </span>
                                {selected ? "Selected for order" : "Use for order"}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={openView}
                            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-card/95"
                        >
                            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Eye className="size-5" />
                            </span>
                            View customer
                        </button>
                        <button
                            type="button"
                            onClick={openEdit}
                            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-left text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-card/95"
                        >
                            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                                <Pencil className="size-5" />
                            </span>
                            Edit customer
                        </button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

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
