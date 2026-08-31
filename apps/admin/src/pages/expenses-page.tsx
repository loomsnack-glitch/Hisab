import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getExpenses, getOrganizationDetails } from "@repo/services";
import {
    EXPENSE_LIFECYCLE_LABELS,
    EXPENSE_PAYABLE_STATUS_LABELS,
    type ExpenseDTO,
    type ExpenseLifecycle,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { Banknote, LayoutGrid, Pencil, PlusCircle, RefreshCw, Search, Table as TableIcon, X } from "lucide-react";

import {
    ExpenseLifecycleBadge,
    ExpensePayableStatusBadge,
} from "@/components/expenses/expense-status-badges";
import UpsertExpenseDialog from "@/components/expenses/upsert-expense-dialog";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { expenseKeys, organizationKeys } from "@/lib/query-keys";
import { PremiumTable, type ColumnDef } from "@repo/ui/components/premium-table";

const ExpensesPage = () => {
    const { organizationId = "" } = useParams();
    const [mobileViewMode, setMobileViewMode] = useState<"card" | "table">("card");
    const [mobileSearchQuery, setMobileSearchQuery] = useState("");

    const expensesQuery = useQuery({
        queryKey: expenseKeys.list(organizationId),
        queryFn: () => getExpenses(organizationId),
        enabled: Boolean(organizationId),
    });

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    const expenses =
        expensesQuery.data?.status === "success" ? expensesQuery.data.data?.expenses ?? [] : [];
    const stores =
        organizationQuery.data?.status === "success"
            ? organizationQuery.data.data?.organization.stores ?? []
            : [];
    const storeNameById = useMemo(
        () => new Map(stores.map((store) => [store.id, store.name])),
        [stores],
    );

    const filteredExpenses = useMemo(() => {
        if (!mobileSearchQuery.trim()) return expenses;
        const query = mobileSearchQuery.toLowerCase().trim();
        return expenses.filter((expense) =>
            expense.expenseCategoryName.toLowerCase().includes(query)
            || (storeNameById.get(expense.storeId) ?? expense.storeName).toLowerCase().includes(query)
            || EXPENSE_LIFECYCLE_LABELS[expense.lifecycle].toLowerCase().includes(query)
            || (expense.invoiceReference ?? "").toLowerCase().includes(query)
            || (expense.notes ?? "").toLowerCase().includes(query),
        );
    }, [mobileSearchQuery, expenses, storeNameById]);

    const columns = useMemo<ColumnDef<ExpenseDTO>[]>(() => [
        {
            id: "category",
            header: "Category",
            accessor: (expense) => (
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Banknote className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-medium text-foreground">{expense.expenseCategoryName}</span>
                        {expense.invoiceReference ? (
                            <p className="text-xs text-muted-foreground truncate">{expense.invoiceReference}</p>
                        ) : null}
                    </div>
                </div>
            ),
            sortable: true,
            getSortValue: (expense) => expense.expenseCategoryName,
        },
        {
            id: "store",
            header: "Store",
            accessor: (expense) => storeNameById.get(expense.storeId) ?? expense.storeName,
            sortable: true,
            getSortValue: (expense) => storeNameById.get(expense.storeId) ?? expense.storeName,
            filterOptions: stores.map((store) => ({ label: store.name, value: store.id })),
            getFilterValue: (expense) => expense.storeId,
        },
        {
            id: "lifecycle",
            header: "Status",
            accessor: (expense) => (
                <div className="flex flex-wrap items-center gap-1.5">
                    <ExpenseLifecycleBadge lifecycle={expense.lifecycle} />
                    <ExpensePayableStatusBadge status={expense.payableStatus} />
                </div>
            ),
            sortable: true,
            getSortValue: (expense) => expense.lifecycle,
            filterOptions: (["draft", "recorded", "voided"] as ExpenseLifecycle[]).map((lifecycle) => ({
                label: EXPENSE_LIFECYCLE_LABELS[lifecycle],
                value: lifecycle,
            })),
            getFilterValue: (expense) => expense.lifecycle,
        },
        {
            id: "effectiveDate",
            header: "Effective",
            accessor: (expense) => formatDateOnly(expense.effectiveDate),
            sortable: true,
            getSortValue: (expense) => expense.effectiveDate,
        },
        {
            id: "total",
            header: "Total",
            accessor: (expense) => formatCurrency(expense.total),
            sortable: true,
            getSortValue: (expense) => expense.total,
        },
        {
            id: "paidTotal",
            header: "Paid",
            accessor: (expense) => formatCurrency(expense.paidTotal),
            sortable: true,
            getSortValue: (expense) => expense.paidTotal,
        },
        {
            id: "dueAmount",
            header: "Due",
            accessor: (expense) =>
                expense.dueAmount === null ? "—" : formatCurrency(expense.dueAmount),
            sortable: true,
            getSortValue: (expense) => expense.dueAmount ?? -1,
        },
    ], [storeNameById, stores]);

    const renderActions = (expense: ExpenseDTO) => (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                render={<Link to={`/organizations/${organizationId}/expenses/${expense.id}`} />}
            >
                View
            </Button>
            {expense.lifecycle === "draft" ? (
                <UpsertExpenseDialog
                    organizationId={organizationId}
                    expense={expense}
                    trigger={
                        <Button variant="outline" size="sm" className="rounded-full">
                            <Pencil className="size-3" />
                            Edit
                        </Button>
                    }
                />
            ) : null}
        </div>
    );

    if (expensesQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (expensesQuery.isError || expensesQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load expenses</EmptyTitle>
                            <EmptyDescription>
                                {(expensesQuery.error as { message?: string })?.message
                                    ?? expensesQuery.data?.message
                                    ?? "Expenses could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => expensesQuery.refetch()}
                            >
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4" data-testid="expenses-page">
            {expenses.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Banknote />
                                </EmptyMedia>
                                <EmptyTitle>No expenses yet</EmptyTitle>
                                <EmptyDescription>
                                    Create a Draft Expense under one active Expense Category, then record it when the amount is ready.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertExpenseDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="hidden sm:block">
                        <PremiumTable
                            data={expenses}
                            columns={columns}
                            actions={renderActions}
                            rowIdKey="id"
                            defaultPageSize={20}
                            fillAvailableViewport
                            searchPlaceholder="Search expenses..."
                            searchKeys={[
                                (expense) => expense.expenseCategoryName,
                                (expense) => storeNameById.get(expense.storeId) ?? expense.storeName,
                                (expense) => expense.invoiceReference ?? "",
                                (expense) => expense.notes ?? "",
                            ]}
                            infoText={`${expenses.length} expense${expenses.length === 1 ? "" : "s"}`}
                            toolbarActions={
                                <UpsertExpenseDialog
                                    organizationId={organizationId}
                                    trigger={
                                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-4">
                                            <PlusCircle className="size-3.5" />
                                            Add expense
                                        </Button>
                                    }
                                />
                            }
                        />
                    </div>

                    <div className="block sm:hidden space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 group/search">
                                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                                <Input
                                    type="text"
                                    placeholder="Search expenses..."
                                    value={mobileSearchQuery}
                                    onChange={(event) => setMobileSearchQuery(event.target.value)}
                                    className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all duration-200 text-sm w-full shadow-2xs"
                                />
                                {mobileSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setMobileSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                                        aria-label="Clear search"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center p-1 rounded-full border border-border/60 bg-card/80 shrink-0">
                                <Button
                                    variant={mobileViewMode === "card" ? "default" : "ghost"}
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 rounded-full transition-all",
                                        mobileViewMode === "card" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground",
                                    )}
                                    onClick={() => setMobileViewMode("card")}
                                    aria-label="Card view"
                                >
                                    <LayoutGrid className="size-3.5" />
                                </Button>
                                <Button
                                    variant={mobileViewMode === "table" ? "default" : "ghost"}
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 rounded-full transition-all",
                                        mobileViewMode === "table" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground",
                                    )}
                                    onClick={() => setMobileViewMode("table")}
                                    aria-label="Table view"
                                >
                                    <TableIcon className="size-3.5" />
                                </Button>
                            </div>
                            <UpsertExpenseDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-3 shrink-0">
                                        <PlusCircle className="size-3.5" />
                                        Add
                                    </Button>
                                }
                            />
                        </div>

                        {mobileViewMode === "card" ? (
                            filteredExpenses.length === 0 ? (
                                <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                                    No expenses match your search.
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5">
                                    {filteredExpenses.map((expense) => (
                                        <Card
                                            key={expense.id}
                                            className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                        >
                                            <div className="flex items-start justify-between gap-2.5">
                                                <div className="min-w-0">
                                                    <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                        {expense.expenseCategoryName}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {storeNameById.get(expense.storeId) ?? expense.storeName}
                                                        {" · "}
                                                        {formatDateOnly(expense.effectiveDate)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <ExpenseLifecycleBadge lifecycle={expense.lifecycle} />
                                                    <ExpensePayableStatusBadge status={expense.payableStatus} />
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                                                <div>
                                                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(expense.total)}</p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Paid {formatCurrency(expense.paidTotal)}
                                                        {" · Due "}
                                                        {expense.dueAmount === null ? "—" : formatCurrency(expense.dueAmount)}
                                                        {expense.payableStatus
                                                            ? ` · ${EXPENSE_PAYABLE_STATUS_LABELS[expense.payableStatus]}`
                                                            : ""}
                                                    </p>
                                                </div>
                                                {renderActions(expense)}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )
                        ) : (
                            <PremiumTable
                                data={expenses}
                                columns={columns}
                                actions={renderActions}
                                rowIdKey="id"
                                defaultPageSize={10}
                                searchPlaceholder="Search expenses..."
                                searchKeys={[
                                    (expense) => expense.expenseCategoryName,
                                    (expense) => storeNameById.get(expense.storeId) ?? expense.storeName,
                                ]}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ExpensesPage;
