import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getExpenseCategories } from "@repo/services";
import type { ExpenseCategoryDTO, ExpenseCategoryKind } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { LayoutGrid, Pencil, PlusCircle, RefreshCw, Search, Table as TableIcon, Tags, X } from "lucide-react";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertExpenseCategoryDialog from "@/components/expense-categories/upsert-expense-category-dialog";
import { formatDateTime } from "@/lib/format";
import { expenseCategoryKeys } from "@/lib/query-keys";
import { PremiumTable, type ColumnDef } from "@repo/ui/components/premium-table";

const expenseCategoryKindLabel: Record<ExpenseCategoryKind, string> = {
    predefined: "Standard",
    custom: "Custom",
};

const ExpenseCategoryKindBadge = ({ kind }: { kind: ExpenseCategoryKind }) => (
    <Badge variant="outline" className="rounded-full">
        {expenseCategoryKindLabel[kind]}
    </Badge>
);

const ExpenseCategoriesPage = () => {
    const { organizationId = "" } = useParams();
    const [mobileViewMode, setMobileViewMode] = useState<"card" | "table">("card");
    const [mobileSearchQuery, setMobileSearchQuery] = useState("");

    const expenseCategoriesQuery = useQuery({
        queryKey: expenseCategoryKeys.list(organizationId),
        queryFn: () => getExpenseCategories(organizationId),
        enabled: Boolean(organizationId),
    });

    const expenseCategories =
        expenseCategoriesQuery.data?.status === "success"
            ? expenseCategoriesQuery.data.data?.expenseCategories ?? []
            : [];

    const filteredExpenseCategories = useMemo(() => {
        if (!mobileSearchQuery.trim()) return expenseCategories;
        const query = mobileSearchQuery.toLowerCase().trim();
        return expenseCategories.filter((category) => category.name.toLowerCase().includes(query));
    }, [mobileSearchQuery, expenseCategories]);

    const columns = useMemo<ColumnDef<ExpenseCategoryDTO>[]>(() => [
        {
            id: "name",
            header: "Category",
            accessor: (category) => (
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Tags className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-medium text-foreground">{category.name}</span>
                    </div>
                </div>
            ),
            sortable: true,
            getSortValue: (category) => category.name,
        },
        {
            id: "kind",
            header: "Source",
            accessor: (category) => <ExpenseCategoryKindBadge kind={category.kind} />,
            sortable: true,
            getSortValue: (category) => expenseCategoryKindLabel[category.kind],
            filterOptions: [
                { label: "Standard", value: "predefined" },
                { label: "Custom", value: "custom" },
            ],
            getFilterValue: (category) => category.kind,
        },
        {
            id: "status",
            header: "Availability",
            accessor: (category) => <ProductStatusBadge status={category.status} />,
            sortable: true,
            getSortValue: (category) => category.status,
            filterOptions: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
            ],
            getFilterValue: (category) => category.status,
        },
        {
            id: "updatedAt",
            header: "Updated",
            accessor: (category) => formatDateTime(category.updatedAt),
            sortable: true,
            getSortValue: (category) => String(category.updatedAt),
        },
    ], []);

    const renderActions = (category: ExpenseCategoryDTO) => (
        <UpsertExpenseCategoryDialog
            organizationId={organizationId}
            expenseCategory={category}
            trigger={
                <Button variant="outline" size="sm" className="rounded-full">
                    <Pencil className="size-3" />
                    Edit
                </Button>
            }
        />
    );

    if (expenseCategoriesQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (expenseCategoriesQuery.isError || expenseCategoriesQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load expense categories</EmptyTitle>
                            <EmptyDescription>
                                {(expenseCategoriesQuery.error as { message?: string })?.message
                                    ?? expenseCategoriesQuery.data?.message
                                    ?? "Expense Categories could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => expenseCategoriesQuery.refetch()}
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
        <div className="space-y-4" data-testid="expense-categories-page">
            {expenseCategories.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Tags />
                                </EmptyMedia>
                                <EmptyTitle>No expense categories yet</EmptyTitle>
                                <EmptyDescription>
                                    Create a custom Expense Category, or wait for standard categories to finish seeding.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertExpenseCategoryDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="hidden sm:block">
                        <PremiumTable
                            data={expenseCategories}
                            columns={columns}
                            actions={renderActions}
                            rowIdKey="id"
                            defaultPageSize={20}
                            fillAvailableViewport
                            searchPlaceholder="Search expense categories..."
                            searchKeys={[
                                (category) => category.name,
                            ]}
                            infoText={`${expenseCategories.length} categor${expenseCategories.length === 1 ? "y" : "ies"}`}
                            toolbarActions={
                                <UpsertExpenseCategoryDialog
                                    organizationId={organizationId}
                                    trigger={
                                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-4">
                                            <PlusCircle className="size-3.5" />
                                            Add category
                                        </Button>
                                    }
                                />
                            }
                        />
                    </div>

                    <div className="block sm:hidden space-y-3">
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 group/search">
                                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                                    <Input
                                        type="text"
                                        placeholder="Search expense categories..."
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

                                <UpsertExpenseCategoryDialog
                                    organizationId={organizationId}
                                    trigger={
                                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-3 shrink-0">
                                            <PlusCircle className="size-3.5" />
                                            Add
                                        </Button>
                                    }
                                />
                            </div>
                        </div>

                        {mobileViewMode === "card" ? (
                            filteredExpenseCategories.length === 0 ? (
                                <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                                    No expense categories match your search.
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5">
                                    {filteredExpenseCategories.map((category) => (
                                        <Card
                                            key={category.id}
                                            className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                        >
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                        <Tags className="size-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                            {category.name}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <ExpenseCategoryKindBadge kind={category.kind} />
                                                    <ProductStatusBadge status={category.status} />
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                                                <p className="text-[11px] text-muted-foreground">
                                                    Updated {formatDateTime(category.updatedAt)}
                                                </p>
                                                <UpsertExpenseCategoryDialog
                                                    organizationId={organizationId}
                                                    expenseCategory={category}
                                                    trigger={
                                                        <Button variant="outline" size="sm" className="rounded-full h-8 text-xs px-3">
                                                            <Pencil className="size-3" />
                                                            Edit
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )
                        ) : (
                            <PremiumTable
                                data={expenseCategories}
                                columns={columns}
                                actions={renderActions}
                                rowIdKey="id"
                                defaultPageSize={10}
                                searchPlaceholder="Search expense categories..."
                                searchKeys={[
                                    (category) => category.name,
                                ]}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ExpenseCategoriesPage;
