import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMoneyAccountHistory, getOrganizationDetails } from "@repo/services";
import {
    MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS,
    MONEY_ACCOUNT_TYPE_LABELS,
    type MoneyAccountHistoryEntry,
    type MoneyAccountHistoryQuery,
} from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader } from "@repo/ui/components/card";
import { DataTableFacetedFilter } from "@repo/ui/components/data-table-faceted-filter";
import { DataTableSortFilter } from "@repo/ui/components/data-table-sort-filter";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    Calendar,
    Landmark,
    RefreshCw,
    RotateCcw,
    Scale,
    ShoppingBag,
    Truck,
    Wallet,
} from "lucide-react";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import HistoryDateToolbar from "@/components/common/history-date-toolbar";
import RecordManualMoneyMovementDialog from "@/components/money-accounts/record-manual-money-movement-dialog";
import AdjustMoneyAccountBalanceDialog from "@/components/money-accounts/adjust-money-account-balance-dialog";
import TransferMoneyAccountDialog from "@/components/money-accounts/transfer-money-account-dialog";
import { getDefaultHistoryQuery } from "@/lib/date-range-filter";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { moneyAccountKeys, organizationKeys } from "@/lib/query-keys";

type MoneyAccountHistorySort = "newest" | "oldest";

const moneyAccountHistorySortOptions: Array<{ value: MoneyAccountHistorySort; label: string }> = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
];

const compareHistoryEntries = (
    left: MoneyAccountHistoryEntry,
    right: MoneyAccountHistoryEntry,
    sort: MoneyAccountHistorySort,
) => {
    const leftTime = new Date(left.occurredAt).getTime();
    const rightTime = new Date(right.occurredAt).getTime();

    if (leftTime !== rightTime) {
        return sort === "newest" ? rightTime - leftTime : leftTime - rightTime;
    }

    const leftId = "id" in left ? left.id : "";
    const rightId = "id" in right ? right.id : "";

    return sort === "newest" ? rightId.localeCompare(leftId) : leftId.localeCompare(rightId);
};

const sortMoneyAccountHistoryEntries = (
    entries: MoneyAccountHistoryEntry[],
    sort: MoneyAccountHistorySort,
) => {
    const openingEntries = entries.filter((entry) => entry.kind === "opening_balance");
    const movementEntries = entries.filter((entry) => entry.kind !== "opening_balance");
    const sortedMovements = [...movementEntries].sort((left, right) => compareHistoryEntries(left, right, sort));

    if (openingEntries.length === 0) {
        return sortedMovements;
    }

    return sort === "newest"
        ? [...sortedMovements, ...openingEntries]
        : [...openingEntries, ...sortedMovements];
};

const paymentMethodLabel = (method: string) => {
    if (method === "upi") return "UPI";
    if (method === "card") return "Card";
    if (method === "cash") return "Cash";
    if (method === "bank_transfer") return "Bank Transfer";
    if (method === "other") return "Other";
    return method;
};

const resolveStoreName = (storeId: string, storeNameById: Record<string, string>) =>
    storeNameById[storeId] ?? "Store";

const buildBillHref = (organizationId: string, storeId: string, saleId: string) =>
    `/organizations/${organizationId}/billing?storeId=${storeId}&saleId=${saleId}`;

type MovementTone = "inflow" | "outflow" | "neutral" | "adjustment";

const MOVEMENT_TONE_STYLES: Record<
    MovementTone,
    { iconWrap: string; icon: string; amount: string }
> = {
    inflow: {
        iconWrap: "bg-emerald-500/10 ring-emerald-500/15",
        icon: "text-emerald-600 dark:text-emerald-400",
        amount: "text-emerald-600 dark:text-emerald-400",
    },
    outflow: {
        iconWrap: "bg-destructive/10 ring-destructive/15",
        icon: "text-destructive",
        amount: "text-destructive",
    },
    neutral: {
        iconWrap: "bg-muted ring-border/50",
        icon: "text-muted-foreground",
        amount: "text-foreground",
    },
    adjustment: {
        iconWrap: "bg-muted ring-border/50",
        icon: "text-muted-foreground",
        amount: "text-muted-foreground",
    },
};

const movementToneForAmount = (amount: number): MovementTone => {
    if (amount > 0) return "inflow";
    if (amount < 0) return "outflow";
    return "neutral";
};

const formatSignedAmount = (amount: number) => {
    if (amount > 0) {
        return `+${formatCurrency(amount)}`;
    }

    if (amount < 0) {
        return `−${formatCurrency(Math.abs(amount))}`;
    }

    return formatCurrency(0);
};

const MetaBadge = ({
    children,
    variant = "default",
}: {
    children: ReactNode;
    variant?: "default" | "store" | "payment";
}) => (
    <span
        className={cn(
            "inline-flex max-w-full items-center truncate rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
            variant === "store" &&
                "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400",
            variant === "payment" && "border-border/60 bg-background text-muted-foreground",
            variant === "default" && "border-border/60 bg-muted/40 text-foreground/80",
        )}
    >
        {children}
    </span>
);

const MovementActionLink = ({ to, label }: { to: string; label: string }) => (
    <Link
        className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        to={to}
    >
        {label}
        <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
    </Link>
);

const MovementRow = ({
    title,
    amount,
    occurredAt,
    icon: Icon,
    entityLabel,
    entityIcon: EntityIcon,
    paymentMethod,
    storeName,
    note,
    action,
    tone: toneOverride,
}: {
    title: string;
    amount: number;
    occurredAt: Date | string;
    icon: ComponentType<{ className?: string }>;
    entityLabel?: string | null;
    entityIcon?: ComponentType<{ className?: string }>;
    paymentMethod?: string | null;
    storeName?: string | null;
    note?: string | null;
    action?: ReactNode;
    tone?: MovementTone;
}) => {
    const tone = toneOverride ?? movementToneForAmount(amount);
    const styles = MOVEMENT_TONE_STYLES[tone];

    return (
        <div className="group mx-1.5 flex gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-border/50 hover:bg-muted/25 sm:mx-2">
            <div
                className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                    styles.iconWrap,
                )}
            >
                <Icon className={cn("size-4", styles.icon)} aria-hidden="true" />
            </div>

            <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug text-foreground">{title}</p>

                    {entityLabel ? (
                        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground/90">
                            {EntityIcon ? (
                                <EntityIcon
                                    className="size-3.5 shrink-0 text-muted-foreground"
                                    aria-hidden="true"
                                />
                            ) : null}
                            <span className="truncate">{entityLabel}</span>
                        </p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {paymentMethod ? (
                            <MetaBadge variant="payment">{paymentMethodLabel(paymentMethod)}</MetaBadge>
                        ) : null}
                        {storeName ? <MetaBadge variant="store">{storeName}</MetaBadge> : null}
                        <time
                            className="text-[11px] text-muted-foreground"
                            dateTime={new Date(occurredAt).toISOString()}
                        >
                            {formatDateTime(occurredAt)}
                        </time>
                    </div>
                    {note ? <p className="mt-1.5 text-xs text-muted-foreground">{note}</p> : null}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                    <p className={cn("text-sm font-semibold tabular-nums", styles.amount)}>
                        {formatSignedAmount(amount)}
                    </p>
                    {action}
                </div>
            </div>
        </div>
    );
};

const HistoryEntry = ({
    entry,
    organizationId,
    storeNameById,
}: {
    entry: MoneyAccountHistoryEntry;
    organizationId: string;
    storeNameById: Record<string, string>;
}) => {
    if (entry.kind === "opening_balance") {
        const styles = MOVEMENT_TONE_STYLES.neutral;

        return (
            <div className="mx-1.5 flex gap-3 rounded-xl border border-border/40 bg-muted/15 px-3 py-3 sm:mx-2">
                <div
                    className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
                        styles.iconWrap,
                    )}
                >
                    <Landmark className={cn("size-4", styles.icon)} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-foreground">Opening Balance</p>
                        <p className={cn("shrink-0 text-sm font-semibold tabular-nums", styles.amount)}>
                            {formatCurrency(entry.amount)}
                        </p>
                    </div>
                    <time
                        className="mt-1 block text-[11px] text-muted-foreground"
                        dateTime={new Date(entry.occurredAt).toISOString()}
                    >
                        {formatDateTime(entry.occurredAt)}
                    </time>
                </div>
            </div>
        );
    }

    if (entry.kind === "sale_replacement_reversal") {
        return (
            <MovementRow
                title={MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS.sale_replacement_reversal}
                amount={entry.amount}
                occurredAt={entry.occurredAt}
                icon={RotateCcw}
                entityLabel={entry.saleNumber ? `Bill #${entry.saleNumber}` : null}
                paymentMethod={entry.paymentMethod}
                storeName={resolveStoreName(entry.storeId, storeNameById)}
                action={
                    entry.saleId ? (
                        <MovementActionLink
                            label="View Bill"
                            to={buildBillHref(organizationId, entry.storeId, entry.saleId)}
                        />
                    ) : null
                }
            />
        );
    }

    if (
        entry.kind === "outgoing_purchase_payment_reversal" ||
        entry.kind === "outgoing_purchase_void_reversal"
    ) {
        return (
            <MovementRow
                title={MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS[entry.kind]}
                amount={entry.amount}
                occurredAt={entry.occurredAt}
                icon={ShoppingBag}
                entityLabel={entry.vendorName}
                entityIcon={Truck}
                paymentMethod={entry.paymentMethod}
                storeName={resolveStoreName(entry.storeId, storeNameById)}
                action={
                    <MovementActionLink
                        label="View Purchase"
                        to={`/organizations/${organizationId}/purchases/${entry.purchaseId}`}
                    />
                }
            />
        );
    }

    if (entry.kind === "outgoing_purchase_payment") {
        return (
            <MovementRow
                title={MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS.outgoing_purchase_payment}
                amount={entry.amount}
                occurredAt={entry.occurredAt}
                icon={ShoppingBag}
                entityLabel={entry.vendorName}
                entityIcon={Truck}
                paymentMethod={entry.paymentMethod}
                storeName={resolveStoreName(entry.storeId, storeNameById)}
                action={
                    <MovementActionLink
                        label="View Purchase"
                        to={`/organizations/${organizationId}/purchases/${entry.purchaseId}`}
                    />
                }
            />
        );
    }

    if (
        entry.kind === "outgoing_expense_payment_reversal" ||
        entry.kind === "outgoing_expense_void_reversal"
    ) {
        return (
            <MovementRow
                title={MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS[entry.kind]}
                amount={entry.amount}
                occurredAt={entry.occurredAt}
                icon={Wallet}
                entityLabel={entry.expenseCategoryName}
                paymentMethod={entry.paymentMethod}
                storeName={resolveStoreName(entry.storeId, storeNameById)}
                action={
                    <MovementActionLink
                        label="View Expense"
                        to={`/organizations/${organizationId}/expenses/${entry.expenseId}`}
                    />
                }
            />
        );
    }

    if (entry.kind === "outgoing_expense_payment") {
        return (
            <MovementRow
                title={MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS.outgoing_expense_payment}
                amount={entry.amount}
                occurredAt={entry.occurredAt}
                icon={Wallet}
                entityLabel={entry.expenseCategoryName}
                paymentMethod={entry.paymentMethod}
                storeName={resolveStoreName(entry.storeId, storeNameById)}
                action={
                    <MovementActionLink
                        label="View Expense"
                        to={`/organizations/${organizationId}/expenses/${entry.expenseId}`}
                    />
                }
            />
        );
    }

    if (entry.kind === "manual_deposit" || entry.kind === "manual_withdrawal") {
        return (
            <MovementRow
                title={MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS[entry.kind]}
                amount={entry.amount}
                occurredAt={entry.occurredAt}
                icon={entry.kind === "manual_deposit" ? ArrowDownLeft : ArrowUpRight}
                storeName={entry.storeId ? resolveStoreName(entry.storeId, storeNameById) : null}
                note={entry.note}
            />
        );
    }

    if (entry.kind === "balance_adjustment") {
        return (
            <MovementRow
                title={MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS.balance_adjustment}
                amount={entry.amount}
                occurredAt={entry.occurredAt}
                icon={Scale}
                entityLabel={`Counted ${formatCurrency(entry.actualBalance)}`}
                storeName={entry.storeId ? resolveStoreName(entry.storeId, storeNameById) : null}
                note={entry.reason}
                tone="adjustment"
            />
        );
    }

    if (entry.kind === "transfer_out" || entry.kind === "transfer_in") {
        const counterpartStoreName = entry.counterpartStoreId
            ? resolveStoreName(entry.counterpartStoreId, storeNameById)
            : null;
        const ownStoreName = entry.storeId ? resolveStoreName(entry.storeId, storeNameById) : null;
        return (
            <MovementRow
                title={MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS[entry.kind]}
                amount={entry.amount}
                occurredAt={entry.occurredAt}
                icon={entry.kind === "transfer_in" ? ArrowDownLeft : ArrowUpRight}
                entityLabel={entry.counterpartMoneyAccountName}
                storeName={counterpartStoreName ?? ownStoreName}
                note={entry.note}
            />
        );
    }

    return (
        <MovementRow
            title={MONEY_ACCOUNT_MOVEMENT_SOURCE_KIND_LABELS.pos_payment}
            amount={entry.amount}
            occurredAt={entry.occurredAt}
            icon={ArrowDownLeft}
            entityLabel={entry.saleNumber ? `Bill #${entry.saleNumber}` : null}
            paymentMethod={entry.paymentMethod}
            storeName={resolveStoreName(entry.storeId, storeNameById)}
            action={
                <MovementActionLink
                    label="View Bill"
                    to={buildBillHref(organizationId, entry.storeId, entry.saleId)}
                />
            }
        />
    );
};

const MovementSummaryBar = ({ entries }: { entries: MoneyAccountHistoryEntry[] }) => {
    const movementEntries = entries.filter((entry) => entry.kind !== "opening_balance");
    const actualFlowEntries = movementEntries.filter((entry) => entry.kind !== "balance_adjustment");
    const adjustmentEntries = movementEntries.filter((entry) => entry.kind === "balance_adjustment");
    const moneyIn = actualFlowEntries.reduce((sum, entry) => (entry.amount > 0 ? sum + entry.amount : sum), 0);
    const moneyOut = actualFlowEntries.reduce(
        (sum, entry) => (entry.amount < 0 ? sum + Math.abs(entry.amount) : sum),
        0,
    );
    const net = actualFlowEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const adjustmentTotal = adjustmentEntries.reduce((sum, entry) => sum + entry.amount, 0);

    return (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/50 sm:grid-cols-5">
            <div className="min-w-0 bg-card/80 px-3 py-2.5">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Count</p>
                <p className="whitespace-nowrap text-sm font-semibold sm:text-base">{movementEntries.length}</p>
            </div>
            <div className="min-w-0 bg-card/80 px-3 py-2.5">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">In</p>
                <p className="whitespace-nowrap text-sm font-semibold text-emerald-600 dark:text-emerald-400 sm:text-base">
                    +{formatCurrency(moneyIn)}
                </p>
            </div>
            <div className="min-w-0 bg-card/80 px-3 py-2.5">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Out</p>
                <p className="whitespace-nowrap text-sm font-semibold text-destructive sm:text-base">
                    −{formatCurrency(moneyOut)}
                </p>
            </div>
            <div className="min-w-0 bg-card/80 px-3 py-2.5">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Net</p>
                <p
                    className={cn(
                        "whitespace-nowrap text-sm font-bold sm:text-base",
                        net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                    )}
                >
                    {formatSignedAmount(net)}
                </p>
            </div>
            <div className="min-w-0 bg-card/80 px-3 py-2.5">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Adjustment
                </p>
                <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-muted-foreground sm:text-base">
                    {formatSignedAmount(adjustmentTotal)}
                </p>
            </div>
        </div>
    );
};

const MoneyAccountDetailPage = () => {
    const { organizationId = "", moneyAccountId = "" } = useParams();
    const [historyQuery, setHistoryQuery] = useState<MoneyAccountHistoryQuery>(() => getDefaultHistoryQuery());
    const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(() => new Set());
    const [sortBy, setSortBy] = useState<MoneyAccountHistorySort>("newest");
    const dateRangeNeedsInput =
        (historyQuery.occurredFrom !== undefined && historyQuery.occurredTo === undefined) ||
        (historyQuery.occurredTo !== undefined && historyQuery.occurredFrom === undefined);

    const historyQueryKey = useMemo(
        () => ({
            occurredFrom: historyQuery.occurredFrom,
            occurredTo: historyQuery.occurredTo,
        }),
        [historyQuery.occurredFrom, historyQuery.occurredTo],
    );

    const historyQueryResult = useQuery({
        queryKey: moneyAccountKeys.history(organizationId, moneyAccountId, historyQueryKey),
        queryFn: () => getMoneyAccountHistory(organizationId, moneyAccountId, historyQuery),
        enabled: Boolean(organizationId && moneyAccountId) && !dateRangeNeedsInput,
    });

    const organizationQuery = useQuery({
        queryKey: organizationKeys.detail(organizationId),
        queryFn: () => getOrganizationDetails(organizationId),
        enabled: Boolean(organizationId),
    });

    if (historyQueryResult.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (historyQueryResult.isError || historyQueryResult.data?.status === "error" || !historyQueryResult.data?.data) {
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
                                {(historyQueryResult.error as { message?: string })?.message ??
                                    historyQueryResult.data?.message ??
                                    "Money Account history could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => historyQueryResult.refetch()}
                            >
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    const { moneyAccount, balance, entries } = historyQueryResult.data.data;
    const stores =
        organizationQuery.data?.status === "success"
            ? organizationQuery.data.data?.organization.stores ?? []
            : [];
    const storeName = moneyAccount.storeId
        ? stores.find((store) => store.id === moneyAccount.storeId)?.name
        : null;
    const storeLabel =
        moneyAccount.scope === "store_scoped"
            ? (storeName || "Store")
            : "Every store";
    const storeNameById = Object.fromEntries(stores.map((store) => [store.id, store.name]));
    const storeFilterOptions = stores.map((store) => ({ label: store.name, value: store.id }));
    const filteredEntries =
        selectedStoreIds.size === 0
            ? entries
            : entries.filter(
                  (entry) =>
                      entry.kind !== "opening_balance" &&
                      entry.storeId != null &&
                      selectedStoreIds.has(entry.storeId),
              );
    const sortedEntries = sortMoneyAccountHistoryEntries(filteredEntries, sortBy);
    const movementEntries = filteredEntries.filter((entry) => entry.kind !== "opening_balance");
    const showingAllDates = !historyQuery.occurredFrom && !historyQuery.occurredTo;

    return (
        <div className="space-y-3" data-testid="money-account-history-page">
            <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                render={<Link to={`/organizations/${organizationId}/money-accounts`} />}
            >
                <ArrowLeft className="size-4" />
                Back to money accounts
            </Button>

            <Card className="border-border/60 bg-card/80 shadow-md">
                <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Wallet className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="font-display text-base font-semibold text-foreground truncate">
                                    {moneyAccount.name}
                                </h1>
                                {moneyAccount.status === "inactive" ? (
                                    <ProductStatusBadge status={moneyAccount.status} />
                                ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                                {MONEY_ACCOUNT_TYPE_LABELS[moneyAccount.type]}
                                {" · "}
                                {storeLabel}
                            </p>
                        </div>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Balance</p>
                        <p className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(balance)}</p>
                    </div>
                </div>
                {moneyAccount.status === "active" ? (
                    <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-2">
                        <RecordManualMoneyMovementDialog
                            organizationId={organizationId}
                            moneyAccount={{ ...moneyAccount, balance }}
                            mode="deposit"
                        />
                        <RecordManualMoneyMovementDialog
                            organizationId={organizationId}
                            moneyAccount={{ ...moneyAccount, balance }}
                            mode="withdrawal"
                        />
                        <AdjustMoneyAccountBalanceDialog
                            organizationId={organizationId}
                            moneyAccount={{ ...moneyAccount, balance }}
                        />
                        <TransferMoneyAccountDialog
                            organizationId={organizationId}
                            moneyAccount={{ ...moneyAccount, balance }}
                            storeNameById={storeNameById}
                        />
                    </div>
                ) : null}

                <CardHeader className="gap-3 space-y-0 px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <HistoryDateToolbar onQueryChange={setHistoryQuery} />
                        {storeFilterOptions.length > 1 ? (
                            <DataTableFacetedFilter
                                title="Store"
                                options={storeFilterOptions}
                                selectedValues={selectedStoreIds}
                                onSelectedValuesChange={setSelectedStoreIds}
                            />
                        ) : null}
                        <DataTableSortFilter
                            title="Sort"
                            value={sortBy}
                            onValueChange={(value) => setSortBy(value as MoneyAccountHistorySort)}
                            options={moneyAccountHistorySortOptions}
                        />
                    </div>
                    {!dateRangeNeedsInput && filteredEntries.length > 0 ? (
                        <MovementSummaryBar entries={filteredEntries} />
                    ) : null}
                </CardHeader>
                <CardContent className="p-0">
                    {dateRangeNeedsInput ? (
                        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/40 p-5 text-center">
                            <Calendar className="size-8 text-muted-foreground/50" />
                            <p className="mt-3 font-medium text-foreground">Choose a date range</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Select both a From date and To date to view matching movements.
                            </p>
                        </div>
                    ) : movementEntries.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            {showingAllDates && filteredEntries.some((entry) => entry.kind === "opening_balance") ? (
                                <div className="mb-4 space-y-1.5 px-3 text-left">
                                    {sortedEntries.map((entry) => (
                                        <HistoryEntry
                                            key={entry.kind === "opening_balance" ? "opening-balance" : entry.id}
                                            entry={entry}
                                            organizationId={organizationId}
                                            storeNameById={storeNameById}
                                        />
                                    ))}
                                </div>
                            ) : null}
                            <p className="text-sm text-muted-foreground">
                                {showingAllDates
                                    ? "No tracked Movements yet."
                                    : "No movements for this period."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1.5 px-3 pb-4">
                            {sortedEntries.map((entry) => (
                                <HistoryEntry
                                    key={entry.kind === "opening_balance" ? "opening-balance" : entry.id}
                                    entry={entry}
                                    organizationId={organizationId}
                                    storeNameById={storeNameById}
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
