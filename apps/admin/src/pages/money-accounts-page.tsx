import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getMoneyAccounts, getOrganizationDetails } from "@repo/services";
import {
    MONEY_ACCOUNT_SCOPE_LABELS,
    MONEY_ACCOUNT_TYPE_LABELS,
    type MoneyAccountDTO,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Pencil, Plus, PlusCircle, RefreshCw, Search, Wallet, X } from "lucide-react";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertMoneyAccountDialog from "@/components/money-accounts/upsert-money-account-dialog";
import { formatCurrency } from "@/lib/format";
import { moneyAccountKeys, organizationKeys } from "@/lib/query-keys";

type MoneyAccountCardProps = {
    account: MoneyAccountDTO;
    organizationId: string;
    storeLabel: string;
};

const MoneyAccountCard = ({ account, organizationId, storeLabel }: MoneyAccountCardProps) => (
    <Card className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-xs transition-all hover:border-primary/25 hover:bg-card">
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Wallet className="size-4" />
                </div>
                <div className="min-w-0">
                    <h4 className="font-display text-sm font-semibold text-foreground truncate">
                        {account.name}
                    </h4>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {MONEY_ACCOUNT_TYPE_LABELS[account.type]}
                        {" · "}
                        {storeLabel}
                    </p>
                </div>
            </div>
            {account.status === "inactive" ? <ProductStatusBadge status={account.status} /> : null}
        </div>

        <div className="mt-4 rounded-xl border border-border/50 bg-background/50 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Balance</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                {formatCurrency(account.balance)}
            </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                render={<Link to={`/organizations/${organizationId}/money-accounts/${account.id}`} />}
            >
                Transactions
            </Button>
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
        </div>
    </Card>
);

const MoneyAccountsPage = () => {
    const { organizationId = "" } = useParams();
    const [searchQuery, setSearchQuery] = useState("");

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

    const storeNameFor = useCallback(
        (account: MoneyAccountDTO) =>
            account.storeId ? storeNameById.get(account.storeId) ?? "" : "",
        [storeNameById],
    );

    const storeLabelFor = useCallback(
        (account: MoneyAccountDTO) =>
            account.scope === "store_scoped"
                ? (storeNameFor(account) || "Store")
                : "Every store",
        [storeNameFor],
    );

    const filteredMoneyAccounts = useMemo(() => {
        if (!searchQuery.trim()) return moneyAccounts;
        const query = searchQuery.toLowerCase().trim();
        return moneyAccounts.filter((account) =>
            account.name.toLowerCase().includes(query)
            || MONEY_ACCOUNT_TYPE_LABELS[account.type].toLowerCase().includes(query)
            || MONEY_ACCOUNT_SCOPE_LABELS[account.scope].toLowerCase().includes(query)
            || storeNameFor(account).toLowerCase().includes(query)
            || (account.notes ?? "").toLowerCase().includes(query),
        );
    }, [searchQuery, moneyAccounts, storeNameFor]);

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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[180px] max-w-sm group/search">
                                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                                <Input
                                    type="text"
                                    placeholder="Search money accounts..."
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    className="pl-10 pr-9 h-10 rounded-full border border-border/60 bg-card/60 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/70 transition-all duration-200 text-sm w-full shadow-2xs"
                                />
                                {searchQuery ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
                                        aria-label="Clear search"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                ) : null}
                            </div>

                            <UpsertMoneyAccountDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button
                                        type="button"
                                        aria-label="Add money account"
                                        className="h-10 w-10 shrink-0 rounded-full bg-primary p-0 text-primary-foreground shadow-xs shadow-primary/20 hover:bg-primary/90 sm:hidden"
                                    >
                                        <Plus className="size-4" />
                                    </Button>
                                }
                            />
                        </div>

                        <div className="hidden sm:flex flex-wrap items-center gap-2">
                            <UpsertMoneyAccountDialog
                                organizationId={organizationId}
                                trigger={
                                    <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 sm:px-5 text-xs sm:text-sm font-medium shadow-xs shadow-primary/20">
                                        <PlusCircle className="size-4" />
                                        Add money account
                                    </Button>
                                }
                            />
                        </div>
                    </div>

                    {filteredMoneyAccounts.length > 0 && (
                        <div className="flex items-center justify-between px-1 pt-0 pb-0.5">
                            <span className="text-xs text-muted-foreground/70">
                                Showing {filteredMoneyAccounts.length} account{filteredMoneyAccounts.length === 1 ? "" : "s"}
                            </span>
                        </div>
                    )}

                    {filteredMoneyAccounts.length === 0 ? (
                        <Card className="border-border/60 bg-card/80 p-6 text-center text-sm text-muted-foreground rounded-2xl">
                            No money accounts match your search.
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {filteredMoneyAccounts.map((account) => (
                                <MoneyAccountCard
                                    key={account.id}
                                    account={account}
                                    organizationId={organizationId}
                                    storeLabel={storeLabelFor(account)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MoneyAccountsPage;
