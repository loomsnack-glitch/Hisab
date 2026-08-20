import { useEffect, useState, type FormEvent } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getPlatformDashboard as getPlatformDashboardRequest } from "@repo/services";
import {
    PlatformDashboardQuerySchema,
    type PlatformDashboardQueryJSON,
    type PlatformDashboardQuerySVC,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";

const dashboardQueryKey = ["platform-owner", "dashboard"] as const;

type PlatformDashboardPageProps = {
    onBack: () => void;
    getPlatformDashboard?: typeof getPlatformDashboardRequest;
    initialQuery?: PlatformDashboardQueryJSON;
    initialCustomValues?: { startDate: string; endDate: string };
    onReportingPeriodChange?: (query: PlatformDashboardQueryJSON, customValues: { startDate: string; endDate: string }) => void;
    onUnauthorized?: () => Promise<void>;
};

const periodOptions = [
    { selection: "all-time", label: "All-time" },
    { selection: "7d", label: "7-day" },
    { selection: "30d", label: "30-day" },
    { selection: "90d", label: "90-day" },
    { selection: "custom", label: "Custom" },
] as const;

const formatCompletedSalesValue = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value);

const MetricCard = ({ label, value }: { label: string; value: string }) => (
    <Card>
        <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardTitle>{value}</CardTitle>
        </CardHeader>
    </Card>
);

const toAppliedQuery = (query: PlatformDashboardQueryJSON): PlatformDashboardQueryJSON => {
    if (query.period === "custom") {
        return { period: "custom", startDate: query.startDate, endDate: query.endDate };
    }
    return { period: query.period ?? "all-time" };
};

const PlatformDashboardPage = ({
    onBack,
    getPlatformDashboard = getPlatformDashboardRequest,
    initialQuery,
    initialCustomValues,
    onReportingPeriodChange,
    onUnauthorized,
}: PlatformDashboardPageProps) => {
    const [selection, setSelection] = useState<PlatformDashboardQuerySVC["period"]>(initialQuery?.period ?? "all-time");
    const [startDate, setStartDate] = useState(initialCustomValues?.startDate ?? initialQuery?.startDate ?? "");
    const [endDate, setEndDate] = useState(initialCustomValues?.endDate ?? initialQuery?.endDate ?? "");
    const [appliedQuery, setAppliedQuery] = useState<PlatformDashboardQueryJSON>(toAppliedQuery(initialQuery ?? { period: "all-time" }));
    const [periodError, setPeriodError] = useState<string | null>(null);

    const dashboardQuery = useQuery({
        queryKey: [...dashboardQueryKey, appliedQuery],
        queryFn: () => getPlatformDashboard(appliedQuery),
        retry: false,
        placeholderData: keepPreviousData,
        enabled: appliedQuery.period !== "custom" || Boolean(appliedQuery.startDate && appliedQuery.endDate),
    });
    const dashboard = dashboardQuery.data?.status === "success" ? dashboardQuery.data.data : undefined;
    const errorCode = (dashboardQuery.error as { code?: number } | null)?.code
        ?? (dashboardQuery.data?.status === "error" ? dashboardQuery.data.code : undefined);

    useEffect(() => {
        if (errorCode === 401) void onUnauthorized?.();
    }, [errorCode, onUnauthorized]);

    const applyPeriod = (next: PlatformDashboardQueryJSON) => {
        const parsed = PlatformDashboardQuerySchema.safeParse(next);
        if (!parsed.success) {
            setPeriodError(parsed.error.issues[0]?.message ?? "Check the Platform Reporting Period");
            return;
        }
        setPeriodError(null);
        const applied = toAppliedQuery(parsed.data);
        setAppliedQuery(applied);
        onReportingPeriodChange?.(applied, { startDate, endDate });
    };

    const selectQuickPeriod = (nextSelection: Exclude<PlatformDashboardQuerySVC["period"], "custom">) => {
        setSelection(nextSelection);
        applyPeriod({ period: nextSelection });
    };

    const submitCustomPeriod = (event: FormEvent) => {
        event.preventDefault();
        setSelection("custom");
        applyPeriod({ period: "custom", startDate, endDate });
    };

    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <Button type="button" variant="ghost" className="-ml-3" onClick={onBack}>
                    <ArrowLeft className="size-4" /> Back to console
                </Button>
                <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-slate-600">
                    Read-only platform scale and adoption. Completed Sales Value is sales value, not revenue or collected Payments.
                </p>
            </div>

            <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Platform Reporting Period</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Platform Reporting Period">
                    {periodOptions.map((option) => (
                        <Button
                            key={option.selection}
                            type="button"
                            variant={selection === option.selection ? "default" : "outline"}
                            aria-pressed={selection === option.selection}
                            onClick={() => {
                                if (option.selection === "custom") {
                                    setSelection("custom");
                                    setPeriodError(null);
                                    return;
                                }
                                selectQuickPeriod(option.selection);
                            }}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
                {selection === "custom" ? (
                    <form className="flex flex-wrap items-end gap-3" onSubmit={submitCustomPeriod}>
                        <label className="space-y-1 text-sm font-medium">
                            Start date
                            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                        </label>
                        <label className="space-y-1 text-sm font-medium">
                            End date
                            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                        </label>
                        <Button type="submit">Apply Platform Reporting Period</Button>
                    </form>
                ) : null}
                {periodError ? (
                    <Alert variant="destructive" role="alert">
                        <AlertTitle>Platform Reporting Period was not applied</AlertTitle>
                        <AlertDescription>{periodError}</AlertDescription>
                    </Alert>
                ) : null}
            </div>

            {dashboardQuery.isLoading ? (
                <p aria-busy="true">Loading platform dashboard…</p>
            ) : dashboardQuery.isError || dashboardQuery.data?.status === "error" ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Dashboard could not be loaded</AlertTitle>
                    <AlertDescription>
                        {(dashboardQuery.error as { message?: string } | null)?.message
                            ?? dashboardQuery.data?.message
                            ?? "The platform dashboard is unavailable."}
                    </AlertDescription>
                </Alert>
            ) : dashboard ? (
                <div className="space-y-8">
                    <section className="space-y-3" aria-label="All-time totals">
                        <div>
                            <h2 className="text-xl font-semibold">All-time totals</h2>
                            <p className="text-sm text-slate-600">Platform scale, independent of the selected Platform Reporting Period.</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <MetricCard label="Organizations" value={String(dashboard.allTime.organizationCount)} />
                            <MetricCard label="Stores" value={String(dashboard.allTime.storeCount)} />
                            <MetricCard label="Customer Count" value={String(dashboard.allTime.customerCount)} />
                            <MetricCard label="Completed Sales" value={String(dashboard.allTime.completedSaleCount)} />
                        </div>
                    </section>

                    <section className="space-y-3" aria-label="Active Organization and Active Store">
                        <div>
                            <h2 className="text-xl font-semibold">Current adoption</h2>
                            <p className="text-sm text-slate-600">
                                Active Store and Active Organization totals use the preceding seven calendar days in Asia/Kolkata.
                                They do not follow the selected Platform Reporting Period.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <MetricCard label="Active Organization" value={String(dashboard.activity.activeOrganizationCount)} />
                            <MetricCard label="Active Store" value={String(dashboard.activity.activeStoreCount)} />
                        </div>
                    </section>

                    <section className="space-y-3" aria-label="Selected Platform Reporting Period">
                        <div>
                            <h2 className="text-xl font-semibold">Selected Platform Reporting Period</h2>
                            <p className="text-sm text-slate-600">
                                {dashboard.reportingPeriod.selection === "all-time"
                                    ? "All-time completed Sales, Completed Sales Value, and Customer Count."
                                    : `Calendar dates ${dashboard.reportingPeriod.startDate} to ${dashboard.reportingPeriod.endDate} in Asia/Kolkata.`}
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <MetricCard label="Completed Sales" value={String(dashboard.reportingPeriodMetrics.completedSaleCount)} />
                            <MetricCard
                                label="Completed Sales Value"
                                value={formatCompletedSalesValue(dashboard.reportingPeriodMetrics.completedSalesValue)}
                            />
                            <MetricCard label="Customer Count" value={String(dashboard.reportingPeriodMetrics.customerCount)} />
                        </div>
                    </section>
                </div>
            ) : null}
        </section>
    );
};

export default PlatformDashboardPage;
export type { PlatformDashboardPageProps };
