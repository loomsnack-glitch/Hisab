import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getMoneyAccounts, getOrganizationDetails } from "@repo/services";
import {
    MONEY_ACCOUNT_SCOPE_LABELS,
    MONEY_ACCOUNT_TYPE_LABELS,
    type MoneyAccountDTO,
    type MoneyAccountScope,
    type MoneyAccountType,
} from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { LayoutGrid, Pencil, PlusCircle, RefreshCw, Search, Table as TableIcon, Wallet, X } from "lucide-react";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertMoneyAccountDialog from "@/components/money-accounts/upsert-money-account-dialog";
import { formatDateTime } from "@/lib/format";
import { moneyAccountKeys, organizationKeys } from "@/lib/query-keys";
import { PremiumTable, type ColumnDef } from "@repo/ui/components/premium-table";

const MoneyAccountTypeBadge = ({ type }: { type: MoneyAccountType }) => (
    <Badge variant="outline" className="rounded-full">
        {MONEY_ACCOUNT_TYPE_LABELS[type]}
    </Badge>
);

const MoneyAccountScopeBadge = ({ scope }: { scope: MoneyAccountScope }) => (
    <Badge variant="outline" className="rounded-full">
        {MONEY_ACCOUNT_SCOPE_LABELS[scope]}
    </Badge>
);

const MoneyAccountsPage = () => {
    const { organizationId = "" } = useParams();
    const [mobileViewMode, setMobileViewMode] = useState<"card" | "table">("card");
    const [mobileSearchQuery, setMobileSearchQuery] = useState("");

    const moneyAccountsQuery = useQuery({
        queryKey: moneyAccountKeys.list(organizationId),
        queryFn: () => getMoneyAccounts(organizationId),
        enabled: Boolean(organizationId),
    });

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    const moneyAccounts =
        moneyAccountsQuery.data?.status === "success"
            ? moneyAccountsQuery.data.data?.moneyAccounts ?? []
            : [];

    const stores =
        organizationQuery.data?.status === "success"
            ? organizationQuery.data.data?.organization.stores ?? []
            : [];

    const storeNameById = useMemo(
        () => new Map(stores.map((store) => [store.id, store.name])),
        [stores],
    );

    const storeNameFor = (account: MoneyAccountDTO) =>
        account.storeId ? storeNameById.get(account.storeId) ?? "" : "";

    const filteredMoneyAccounts = useMemo(() => {
        if (!mobileSearchQuery.trim()) return moneyAccounts;
        const query = mobileSearchQuery.toLowerCase().trim();
        return moneyAccounts.filter((account) =>
            account.name.toLowerCase().includes(query)
            || MONEY_ACCOUNT_TYPE_LABELS[account.type].toLowerCase().includes(query)
            || MONEY_ACCOUNT_SCOPE_LABELS[account.scope].toLowerCase().includes(query)
            || storeNameFor(account).toLowerCase().includes(query)
            || (account.notes ?? "").toLowerCase().includes(query),
        );
    }, [mobileSearchQuery, moneyAccounts, storeNameById]);

    const columns = useMemo<ColumnDef<MoneyAccountDTO>[]>(() => [
        {
            id: "name",
            header: "Account",
            accessor: (account) => (
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Wallet className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-medium text-foreground">{account.name}</span>
                        {account.notes ? (
                            <p className="text-xs text-muted-foreground truncate">{account.notes}</p>
                        ) : null}
                    </div>
                </div>
            ),
            sortable: true,
            getSortValue: (account) => account.name,
        },
        {
            id: "type",
            header: "Type",
            accessor: (account) => <MoneyAccountTypeBadge type={account.type} />,
            sortable: true,
            getSortValue: (account) => MONEY_ACCOUNT_TYPE_LABELS[account.type],
            filterOptions: Object.entries(MONEY_ACCOUNT_TYPE_LABELS).map(([value, label]) => ({
                label,
                value,
            })),
            getFilterValue: (account) => account.type,
        },
        {
            id: "scope",
            header: "Scope",
            accessor: (account) => <MoneyAccountScopeBadge scope={account.scope} />,
            sortable: true,
            getSortValue: (account) => MONEY_ACCOUNT_SCOPE_LABELS[account.scope],
            filterOptions: Object.entries(MONEY_ACCOUNT_SCOPE_LABELS).map(([value, label]) => ({
                label,
                value,
            })),
            getFilterValue: (account) => account.scope,
        },
        {
            id: "store",
            header: "Store",
            accessor: (account) => (
                <span className="text-sm text-muted-foreground">
                    {account.scope === "store_scoped" ? (storeNameFor(account) || "Store") : "Every store"}
                </span>
            ),
            sortable: true,
            getSortValue: (account) => storeNameFor(account),
            filterOptions: stores.map((store) => ({
                label: store.name,
                value: store.id,
            })),
            getFilterValue: (account) => account.storeId ?? "",
        },
        {
            id: "status",
            header: "Status",
            accessor: (account) => <ProductStatusBadge status={account.status} />,
            sortable: true,
            getSortValue: (account) => account.status,
            filterOptions: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
            ],
            getFilterValue: (account) => account.status,
        },
        {
            id: "updatedAt",
            header: "Updated",
            accessor: (account) => formatDateTime(account.updatedAt),
            sortable: true,
            getSortValue: (account) => String(account.updatedAt),
        },
    ], [storeNameById, stores]);

    const renderActions = (account: MoneyAccountDTO) => (
        <UpsertMoneyAccountDialog
            organizationId={organizationId}
            moneyAccount={account}
            trigger={
                <Button variant="outline" size="sm" className="rounded-full">
                    <Pencil className="size-3" />
                    Edit
                </Button>
            }
        />
    );

    const searchKeys = [
        (account: MoneyAccountDTO) => account.name,
        (account: MoneyAccountDTO) => MONEY_ACCOUNT_TYPE_LABELS[account.type],
        (account: MoneyAccountDTO) => MONEY_ACCOUNT_SCOPE_LABELS[account.scope],
        (account: MoneyAccountDTO) => storeNameFor(account),
        (account: MoneyAccountDTO) => account.notes ?? "",
    ];

    if (moneyAccountsQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (moneyAccountsQuery.isError || moneyAccountsQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load money accounts</EmptyTitle>
                            <EmptyDescription>
                                {(moneyAccountsQuery.error as { message?: string })?.message
                                    ?? moneyAccountsQuery.data?.message
                                    ?? "Money Accounts could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => moneyAccountsQuery.refetch()}
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
        <div className="space-y-4" data-testid="money-accounts-page">
            {moneyAccounts.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Wallet />
                                </EmptyMedia>
                                <EmptyTitle>No money accounts yet</EmptyTitle>
                                <EmptyDescription>
                                    Add a Cash, Bank, UPI, Card Settlement, Petty Cash, or Other Money Account. Cash belongs to one Store; other accounts can be for every Store or one Store in this Organization.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertMoneyAccountDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="hidden sm:block">
                        <PremiumTable
                            data={moneyAccounts}
                            columns={columns}
                            actions={renderActions}
                            rowIdKey="id"
                            defaultPageSize={20}
                            fillAvailableViewport
                            searchPlaceholder="Search money accounts..."
                            searchKeys={searchKeys}
                            infoText={`${moneyAccounts.length} account${moneyAccounts.length === 1 ? "" : "s"}`}
                            toolbarActions={
                                <UpsertMoneyAccountDialog
                                    organizationId={organizationId}
                                    trigger={
                                        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-4">
                                            <PlusCircle className="size-3.5" />
                                            Add money account
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
                                        placeholder="Search money accounts..."
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

                                <UpsertMoneyAccountDialog
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
                            filteredMoneyAccounts.length === 0 ? (
                                <Card className="border-border/60 bg-card/80 p-6 text-center text-xs text-muted-foreground rounded-2xl">
                                    No money accounts match your search.
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5">
                                    {filteredMoneyAccounts.map((account) => (
                                        <Card
                                            key={account.id}
                                            className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-xs transition-all hover:border-primary/25 hover:bg-card"
                                        >
                                            <div className="flex items-center justify-between gap-2.5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                        <Wallet className="size-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-display text-sm font-semibold text-foreground truncate">
                                                            {account.name}
                                                        </h4>
                                                        <p className="text-[11px] text-muted-foreground/70 truncate">
                                                            {MONEY_ACCOUNT_TYPE_LABELS[account.type]}
                                                            {" · "}
                                                            {MONEY_ACCOUNT_SCOPE_LABELS[account.scope]}
                                                            {account.scope === "store_scoped" && storeNameFor(account)
                                                                ? ` · ${storeNameFor(account)}`
                                                                : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ProductStatusBadge status={account.status} />
                                            </div>

                                            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
                                                <p className="text-[11px] text-muted-foreground">
                                                    Updated {formatDateTime(account.updatedAt)}
                                                </p>
                                                <UpsertMoneyAccountDialog
                                                    organizationId={organizationId}
                                                    moneyAccount={account}
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
                                data={moneyAccounts}
                                columns={columns}
                                actions={renderActions}
                                rowIdKey="id"
                                defaultPageSize={10}
                                searchPlaceholder="Search money accounts..."
                                searchKeys={searchKeys}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default MoneyAccountsPage;
