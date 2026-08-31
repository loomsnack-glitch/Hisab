import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMoneyAccountHistory, getOrganizationDetails } from "@repo/services";
import {
    MONEY_ACCOUNT_SCOPE_LABELS,
    MONEY_ACCOUNT_TYPE_LABELS,
    type MoneyAccountHistoryEntry,
} from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { ArrowLeft, RefreshCw, Wallet } from "lucide-react";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { moneyAccountKeys, organizationKeys } from "@/lib/query-keys";

const paymentMethodLabel = (method: string) => {
    if (method === "upi") return "UPI";
    if (method === "card") return "Card";
    if (method === "cash") return "Cash";
    if (method === "bank_transfer") return "Bank Transfer";
    if (method === "other") return "Other";
    return method;
};

const HistoryEntry = ({ entry }: { entry: MoneyAccountHistoryEntry }) => {
    if (entry.kind === "opening_balance") {
        return (
            <div className="flex items-start justify-between gap-3 bg-muted/20 px-4 py-3">
                <div className="min-w-0">
                    <p className="font-medium text-foreground">Opening Balance</p>
                    <p className="text-xs text-muted-foreground">
                        Starting amount before tracked Payments · {formatDateTime(entry.occurredAt)}
                    </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(entry.amount)}</p>
            </div>
        );
    }

    return (
        <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
                <p className="font-medium text-foreground">POS Payment</p>
                <p className="text-xs text-muted-foreground">
                    {paymentMethodLabel(entry.paymentMethod)}
                    {entry.saleNumber ? ` · Sale ${entry.saleNumber}` : ""}
                    {" · "}
                    {formatDateTime(entry.occurredAt)}
                </p>
                <p className="text-xs text-muted-foreground">Linked Payment. This entry cannot be edited.</p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(entry.amount)}</p>
        </div>
    );
};

const MoneyAccountDetailPage = () => {
    const { organizationId = "", moneyAccountId = "" } = useParams();

    const historyQuery = useQuery({
        queryKey: moneyAccountKeys.history(organizationId, moneyAccountId),
        queryFn: () => getMoneyAccountHistory(organizationId, moneyAccountId),
        enabled: Boolean(organizationId && moneyAccountId),
    });

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    if (historyQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (historyQuery.isError || historyQuery.data?.status === "error" || !historyQuery.data?.data) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load account history</EmptyTitle>
                            <EmptyDescription>
                                {(historyQuery.error as { message?: string })?.message ??
                                    historyQuery.data?.message ??
                                    "Money Account history could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => historyQuery.refetch()}
                            >
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    const { moneyAccount, openingBalance, balance, entries } = historyQuery.data.data;
    const stores =
        organizationQuery.data?.status === "success"
            ? organizationQuery.data.data?.organization.stores ?? []
            : [];
    const storeName = moneyAccount.storeId
        ? stores.find((store) => store.id === moneyAccount.storeId)?.name
        : null;
    const movementEntries = entries.filter((entry) => entry.kind === "pos_payment");

    return (
        <div className="space-y-4" data-testid="money-account-history-page">
            <Button
                variant="ghost"
                className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                render={<Link to={`/organizations/${organizationId}/money-accounts`} />}
            >
                <ArrowLeft className="size-4" />
                Back to money accounts
            </Button>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Wallet className="size-4" />
                        </div>
                        <div className="min-w-0 space-y-2">
                            <CardTitle className="font-display text-2xl">{moneyAccount.name}</CardTitle>
                            <CardDescription>
                                {MONEY_ACCOUNT_TYPE_LABELS[moneyAccount.type]}
                                {" · "}
                                {MONEY_ACCOUNT_SCOPE_LABELS[moneyAccount.scope]}
                                {storeName ? ` · ${storeName}` : ""}
                            </CardDescription>
                            <div className="flex flex-wrap items-center gap-2">
                                <ProductStatusBadge status={moneyAccount.status} />
                                {moneyAccount.hasMovements ? (
                                    <Badge variant="outline" className="rounded-full">
                                        Identity locked after Movement
                                    </Badge>
                                ) : null}
                            </div>
                            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                        Opening Balance
                                    </p>
                                    <p className="mt-1 text-lg font-semibold tabular-nums">
                                        {formatCurrency(openingBalance)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Starting amount</p>
                                </div>
                                <div className="rounded-xl border border-border/60 bg-background px-3 py-2.5">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                        Calculated balance
                                    </p>
                                    <p className="mt-1 text-lg font-semibold tabular-nums">
                                        {formatCurrency(balance)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Opening Balance plus tracked Payments
                                    </p>
                                </div>
                            </div>
                            {moneyAccount.status === "inactive" ? (
                                <p className="text-sm text-muted-foreground">
                                    This Money Account is inactive. Historic Movements remain visible. If it is used for
                                    Cash, UPI, or Card at a tracking-enabled Store, those payments stay blocked until an
                                    administrator repairs the configuration.
                                </p>
                            ) : null}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="font-display text-xl">Immutable history</CardTitle>
                    <CardDescription>
                        Opening Balance followed by linked POS Payments. These entries cannot be edited, and changing a
                        route later does not move earlier collections.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {movementEntries.length === 0 ? (
                        <div className="divide-y divide-border/60">
                            {entries.map((entry) => (
                                <HistoryEntry
                                    key={entry.kind === "opening_balance" ? "opening-balance" : entry.id}
                                    entry={entry}
                                />
                            ))}
                            <p className="px-4 py-4 text-sm text-muted-foreground">
                                No tracked POS Payments yet.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/60">
                            {entries.map((entry) => (
                                <HistoryEntry
                                    key={entry.kind === "opening_balance" ? "opening-balance" : entry.id}
                                    entry={entry}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MoneyAccountDetailPage;
